/**
 * Magazyn zdjęć zgodny z S3 (MEGA S4).
 *
 * Cała komunikacja z bucketem przechodzi przez ten moduł. Przeglądarka nigdy
 * nie dostaje kluczy dostępu — pliki wysyła i pobiera przez presigned URL-e
 * generowane tutaj, po stronie serwera.
 *
 * Konfiguracja wyłącznie ze zmiennych środowiskowych (na VPS: /opt/club-graphics/.env).
 */

const {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class StorageError extends Error {
  constructor(message, { status = 500, code = 'STORAGE_ERROR' } = {}) {
    super(message);
    this.name = 'StorageError';
    this.status = status;
    this.code = code;
  }
}

const DOWNLOAD_URL_TTL = toPositiveInt(process.env.S3_DOWNLOAD_URL_TTL, 3600);
const LIST_HARD_LIMIT = 5000;

// Formaty, które umie wyświetlić przeglądarka i renderer grafik.
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif'
};

let client = null;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getConfig() {
  return {
    endpoint: env('S3_ENDPOINT'),
    region: env('S3_REGION') || 'us-east-1',
    bucket: env('S3_BUCKET'),
    accessKey: env('S3_ACCESS_KEY'),
    secretKey: env('S3_SECRET_KEY'),
    // MEGA S4 obsługuje oba adresowania; path-style jest bezpieczniejsze,
    // bo nie wymaga wildcardowego certyfikatu na nazwę bucketa.
    forcePathStyle: env('S3_FORCE_PATH_STYLE') !== 'false',
    publicBaseUrl: env('S3_PUBLIC_BASE_URL')
  };
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.endpoint && config.bucket && config.accessKey && config.secretKey);
}

function maskKey(value) {
  const text = String(value || '');
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

/**
 * Stan integracji do panelu ustawień — bez sekretów, tylko to,
 * co pozwala właścicielowi sprawdzić, czy .env jest wypełniony poprawnie.
 */
function getStorageStatus() {
  const config = getConfig();
  return {
    configured: isConfigured(),
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    forcePathStyle: config.forcePathStyle,
    accessKey: config.accessKey ? maskKey(config.accessKey) : null,
    missing: ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']
      .filter((name) => !env(name)),
    downloadUrlTtl: DOWNLOAD_URL_TTL
  };
}

function getClient() {
  if (!isConfigured()) {
    throw new StorageError(
      'Magazyn zdjęć nie jest skonfigurowany. Uzupełnij S3_* w pliku .env na serwerze.',
      { status: 503, code: 'STORAGE_NOT_CONFIGURED' }
    );
  }
  if (client) return client;

  const config = getConfig();
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    // SDK domyślnie dokłada sumę kontrolną CRC32 do każdego żądania. W podpisanym
    // adresie PUT byłaby to suma pustego ciała — magazyn odrzuciłby plik wysłany
    // przez przeglądarkę. Liczymy sumy tylko tam, gdzie protokół tego wymaga.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  });
  return client;
}

/** Po zmianie .env i restarcie procesu klient i tak powstaje od nowa; to dla testów. */
function resetClient() {
  client = null;
}

function getBucket() {
  return getConfig().bucket;
}

/**
 * Klucze obiektów trzymamy bez wiodącego ukośnika, bez ".." i bez pustych
 * segmentów — żeby prefix folderu nie dało się obejść i wyjść poza swój katalog.
 */
function normalizeKey(value, { label = 'Ścieżka' } = {}) {
  const text = String(value || '').replace(/\\/g, '/').trim();
  const segments = text.split('/').filter((part) => part !== '' && part !== '.');
  if (segments.some((part) => part === '..')) {
    throw new StorageError(`${label} nie może zawierać "..".`, { status: 400, code: 'STORAGE_INVALID_KEY' });
  }
  const key = segments.join('/');
  if (key.length > 700) {
    throw new StorageError(`${label} jest za długa (maksymalnie 700 znaków).`, { status: 400, code: 'STORAGE_INVALID_KEY' });
  }
  return key;
}

/** Prefix folderu zawsze kończy się ukośnikiem — poza prefixem pustym (root bucketa). */
function normalizePrefix(value) {
  const key = normalizeKey(value, { label: 'Prefix' });
  return key ? `${key}/` : '';
}

function fileName(key) {
  return String(key || '').split('/').pop() || '';
}

function extensionOf(key) {
  const name = fileName(key).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
}

function isImageKey(key) {
  return IMAGE_EXTENSIONS.includes(extensionOf(key));
}

function contentTypeFor(key, fallback = 'application/octet-stream') {
  return CONTENT_TYPES[extensionOf(key)] || fallback;
}

/** Nazwa pliku od użytkownika → bezpieczny segment klucza (bez spacji i znaków spoza ASCII). */
function safeFileName(name) {
  const raw = fileName(name).toLowerCase();
  const dot = raw.lastIndexOf('.');
  const base = (dot === -1 ? raw : raw.slice(0, dot))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'plik';
  const ext = dot === -1 ? '' : raw.slice(dot).replace(/[^a-z0-9.]/g, '').slice(0, 10);
  return `${base}${ext}`;
}

function wrap(error, fallbackMessage) {
  if (error instanceof StorageError) return error;

  const status = error?.$metadata?.httpStatusCode;
  const code = error?.name || error?.Code;

  if (status === 403 || code === 'AccessDenied' || code === 'InvalidAccessKeyId' || code === 'SignatureDoesNotMatch') {
    return new StorageError('Magazyn odrzucił klucze dostępu (403). Sprawdź S3_ACCESS_KEY i S3_SECRET_KEY.', {
      status: 502, code: 'STORAGE_FORBIDDEN'
    });
  }
  if (status === 404 || code === 'NoSuchBucket' || code === 'NotFound') {
    return new StorageError('Nie znaleziono bucketa lub obiektu w magazynie.', { status: 404, code: 'STORAGE_NOT_FOUND' });
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' || code === 'TimeoutError') {
    return new StorageError('Brak połączenia z magazynem — sprawdź S3_ENDPOINT.', { status: 502, code: 'STORAGE_UNREACHABLE' });
  }
  return new StorageError(`${fallbackMessage} (${code || 'nieznany błąd'})`, { status: 502 });
}

/** Sprawdza, czy klucze i endpoint faktycznie dają dostęp do bucketa. */
async function testConnection() {
  const startedAt = Date.now();
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: getBucket() }));
    return { ok: true, bucket: getBucket(), tookMs: Date.now() - startedAt };
  } catch (error) {
    throw wrap(error, 'Nie udało się połączyć z magazynem');
  }
}

/**
 * Listuje obiekty pod prefixem. Zwraca płaską listę plików (bez "podfolderów"),
 * ograniczoną limitem, żeby jeden duży katalog nie zablokował procesu.
 */
async function listObjects(prefix, { limit = 1000, imagesOnly = false } = {}) {
  const bucket = getBucket();
  const normalized = normalizePrefix(prefix);
  const cap = Math.min(toPositiveInt(limit, 1000), LIST_HARD_LIMIT);
  const objects = [];
  let continuationToken;
  let truncated = false;

  try {
    do {
      const page = await getClient().send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalized,
        ContinuationToken: continuationToken,
        MaxKeys: Math.min(1000, cap - objects.length)
      }));

      for (const item of page.Contents || []) {
        // Katalogi w S3 to obiekty zerowej długości kończące się ukośnikiem.
        if (!item.Key || item.Key.endsWith('/')) continue;
        if (imagesOnly && !isImageKey(item.Key)) continue;
        objects.push({
          key: item.Key,
          fileName: fileName(item.Key),
          size: Number(item.Size) || 0,
          etag: item.ETag ? item.ETag.replace(/"/g, '') : null,
          lastModified: item.LastModified ? new Date(item.LastModified) : null
        });
      }

      continuationToken = page.NextContinuationToken;
      truncated = Boolean(page.IsTruncated);
    } while (continuationToken && objects.length < cap);

    return { prefix: normalized, objects, truncated: truncated && objects.length >= cap };
  } catch (error) {
    throw wrap(error, 'Nie udało się odczytać zawartości magazynu');
  }
}

async function headObject(key) {
  try {
    const result = await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) }));
    return {
      key: normalizeKey(key),
      size: Number(result.ContentLength) || 0,
      etag: result.ETag ? result.ETag.replace(/"/g, '') : null,
      contentType: result.ContentType || null,
      lastModified: result.LastModified ? new Date(result.LastModified) : null
    };
  } catch (error) {
    throw wrap(error, 'Nie udało się odczytać metadanych pliku');
  }
}

/**
 * Strumień z zawartością obiektu. Używany przez trasę podającą zdjęcie
 * z naszej domeny — nie buforujemy pliku w pamięci, tylko przepuszczamy dalej.
 */
async function getObjectStream(key) {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) }));
    return {
      body: result.Body,
      contentType: result.ContentType || null,
      contentLength: Number(result.ContentLength) || null
    };
  } catch (error) {
    throw wrap(error, 'Nie udało się pobrać pliku z magazynu');
  }
}

async function deleteObject(key) {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) }));
  } catch (error) {
    throw wrap(error, 'Nie udało się usunąć pliku z magazynu');
  }
}

/**
 * Wysyłka pliku do bucketa.
 *
 * MEGA S4 nie obsługuje konfiguracji CORS (brak PutBucketCors w API i brak tej
 * opcji w panelu), więc przeglądarka nie może wysłać pliku wprost do magazynu —
 * zablokowałaby takie żądanie sama. Plik idzie więc przez nasz serwer, ale
 * strumieniem: nie ląduje w pamięci procesu, a klucze dostępu i tak nigdy nie
 * opuszczają serwera, co było celem §13.
 */
async function putObject(key, body, { contentType = null, contentLength = null } = {}) {
  const normalized = normalizeKey(key);
  try {
    await getClient().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: normalized,
      Body: body,
      ContentType: contentType || contentTypeFor(normalized),
      // Bez jawnej długości SDK musiałby buforować strumień, żeby ją policzyć.
      ContentLength: contentLength ?? undefined
    }));
    return normalized;
  } catch (error) {
    throw wrap(error, 'Nie udało się wysłać pliku do magazynu');
  }
}

/** Presigned GET — podgląd zdjęcia w panelu bez publicznego udostępniania bucketa. */
async function presignDownload(key, { expiresIn = DOWNLOAD_URL_TTL, download = false } = {}) {
  const normalized = normalizeKey(key);
  try {
    return await getSignedUrl(getClient(), new GetObjectCommand({
      Bucket: getBucket(),
      Key: normalized,
      ResponseContentDisposition: download ? `attachment; filename="${fileName(normalized)}"` : undefined
    }), { expiresIn });
  } catch (error) {
    throw wrap(error, 'Nie udało się przygotować adresu do pobrania');
  }
}

/** Katalogi w buckecie — jedno miejsce, żeby nie rozjechały się między trasami. */
const PREFIXES = {
  photos: '',            // zdjęcia meczowe mają własną ścieżkę z sezonu i meczu
  templates: 'szablony/',
  exports: 'eksporty/',
  branding: 'branding/'
};

module.exports = {
  PREFIXES,
  StorageError,
  isConfigured,
  getStorageStatus,
  getBucket,
  testConnection,
  listObjects,
  headObject,
  getObjectStream,
  deleteObject,
  putObject,
  presignDownload,
  normalizeKey,
  normalizePrefix,
  safeFileName,
  contentTypeFor,
  isImageKey,
  resetClient
};
