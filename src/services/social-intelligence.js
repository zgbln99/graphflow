const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const CACHE_TTL_MS = Number(process.env.SOCIAL_CACHE_TTL_MS || 5 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.SOCIAL_REQUEST_TIMEOUT_MS || 15 * 1000);
const MONITOR_INTERVAL_MS = Math.max(Number(process.env.SOCIAL_MONITOR_INTERVAL_MS || 15 * 60 * 1000), 60 * 1000);
const AUTO_ANALYZE = process.env.SOCIAL_AUTO_ANALYZE === 'true';

const cache = {
  overview: null,
  overviewFetchedAt: 0,
  analysis: null,
  analysisFetchedAt: 0,
  monitorStarted: false
};

class IntegrationError extends Error {
  constructor(message, code, status = 502) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.status = status;
  }
}

function getIntegrationStatus() {
  return {
    facebook: {
      configured: Boolean(process.env.META_PAGE_ID && process.env.META_PAGE_ACCESS_TOKEN),
      graphVersion: META_GRAPH_VERSION,
      pageId: process.env.META_PAGE_ID ? maskIdentifier(process.env.META_PAGE_ID) : null,
      lastRefreshAt: cache.overview?.fetchedAt || null,
      monitoringEnabled: cache.monitorStarted,
      intervalMinutes: Math.round(MONITOR_INTERVAL_MS / 60000)
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: OPENAI_MODEL,
      lastAnalysisAt: cache.analysis?.generatedAt || null
    }
  };
}

function maskIdentifier(value) {
  const text = String(value || '');
  if (text.length <= 6) return text;
  return `${text.slice(0, 3)}…${text.slice(-3)}`;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error?.message || payload?.error?.error_user_msg || `Błąd usługi zewnętrznej (${response.status}).`;
      throw new IntegrationError(message, 'EXTERNAL_API_ERROR', response.status);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IntegrationError('Usługa zewnętrzna nie odpowiedziała w wymaganym czasie.', 'EXTERNAL_API_TIMEOUT', 504);
    }
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError('Nie udało się połączyć z usługą zewnętrzną.', 'EXTERNAL_API_UNAVAILABLE', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function facebookUrl(pathname, params = {}) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

function graphHeaders() {
  return {
    Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}`,
    Accept: 'application/json'
  };
}

function summaryCount(field) {
  return Number(field?.summary?.total_count || 0);
}

function normalizePost(post, followers) {
  const reactions = summaryCount(post.reactions);
  const comments = summaryCount(post.comments);
  const shares = Number(post.shares?.count || 0);
  const interactions = reactions + comments + shares;

  return {
    id: String(post.id || ''),
    message: String(post.message || '').trim() || 'Publikacja bez tekstu',
    createdAt: post.created_time || null,
    permalinkUrl: post.permalink_url || null,
    imageUrl: post.full_picture || null,
    reactions,
    comments,
    shares,
    interactions,
    engagementRate: followers > 0 ? Number(((interactions / followers) * 100).toFixed(2)) : null
  };
}

function buildOverview(page, rawPosts) {
  const followers = Number(page.followers_count || page.fan_count || 0);
  const posts = (rawPosts || []).map((post) => normalizePost(post, followers));
  const totals = posts.reduce((result, post) => {
    result.reactions += post.reactions;
    result.comments += post.comments;
    result.shares += post.shares;
    result.interactions += post.interactions;
    return result;
  }, { reactions: 0, comments: 0, shares: 0, interactions: 0 });
  const bestPost = posts.reduce((best, post) => !best || post.interactions > best.interactions ? post : best, null);
  const lastPostAt = posts[0]?.createdAt || null;

  return {
    fetchedAt: new Date().toISOString(),
    page: {
      id: String(page.id || process.env.META_PAGE_ID || ''),
      name: page.name || 'Facebook',
      followers
    },
    posts,
    totals,
    averages: {
      interactions: posts.length ? Number((totals.interactions / posts.length).toFixed(1)) : 0,
      engagementRate: followers > 0 && posts.length
        ? Number(((totals.interactions / posts.length / followers) * 100).toFixed(2))
        : null
    },
    bestPostId: bestPost?.id || null,
    lastPostAt
  };
}

async function fetchFacebookOverview({ force = false, limit = 12 } = {}) {
  if (!process.env.META_PAGE_ID || !process.env.META_PAGE_ACCESS_TOKEN) {
    throw new IntegrationError('Połączenie z Facebookiem nie zostało jeszcze skonfigurowane.', 'FACEBOOK_NOT_CONFIGURED', 503);
  }

  if (!force && cache.overview && Date.now() - cache.overviewFetchedAt < CACHE_TTL_MS) {
    return cache.overview;
  }

  const pageId = encodeURIComponent(process.env.META_PAGE_ID);
  const pageRequest = requestJson(facebookUrl(pageId, {
    fields: 'id,name,followers_count,fan_count'
  }), { headers: graphHeaders() });
  const postsRequest = requestJson(facebookUrl(`${pageId}/published_posts`, {
    fields: 'id,message,created_time,permalink_url,full_picture,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares',
    limit: Math.max(1, Math.min(Number(limit) || 12, 24))
  }), { headers: graphHeaders() });

  const [page, postResponse] = await Promise.all([pageRequest, postsRequest]);
  cache.overview = buildOverview(page, postResponse.data);
  cache.overviewFetchedAt = Date.now();
  return cache.overview;
}

function analysisSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      health: { type: 'string', enum: ['strong', 'stable', 'needs_attention'] },
      observations: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string' }
      },
      recommendedAction: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          rationale: { type: 'string' },
          format: { type: 'string' },
          publishAt: { type: 'string' },
          priority: { type: 'string', enum: ['now', 'today', 'this_week'] }
        },
        required: ['title', 'rationale', 'format', 'publishAt', 'priority']
      },
      suggestions: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            concept: { type: 'string' },
            channel: { type: 'string' },
            format: { type: 'string' },
            timing: { type: 'string' },
            why: { type: 'string' }
          },
          required: ['title', 'concept', 'channel', 'format', 'timing', 'why']
        }
      },
      timing: {
        type: 'object',
        additionalProperties: false,
        properties: {
          bestWindow: { type: 'string' },
          avoidWindow: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['bestWindow', 'avoidWindow', 'confidence']
      }
    },
    required: ['summary', 'health', 'observations', 'recommendedAction', 'suggestions', 'timing']
  };
}

function compactOverviewForAnalysis(overview) {
  return {
    generatedAt: new Date().toISOString(),
    timezone: process.env.TZ || 'Europe/Warsaw',
    page: overview.page,
    totals: overview.totals,
    averages: overview.averages,
    lastPostAt: overview.lastPostAt,
    posts: overview.posts.map((post) => ({
      id: post.id,
      message: post.message.slice(0, 800),
      createdAt: post.createdAt,
      reactions: post.reactions,
      comments: post.comments,
      shares: post.shares,
      interactions: post.interactions,
      engagementRate: post.engagementRate
    }))
  };
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

async function analyzeFacebookOverview({ forceOverview = false } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new IntegrationError('Analiza OpenAI nie została jeszcze skonfigurowana.', 'OPENAI_NOT_CONFIGURED', 503);
  }

  const overview = await fetchFacebookOverview({ force: forceOverview });
  if (!overview.posts.length) {
    throw new IntegrationError('Brak publikacji do analizy.', 'NO_POSTS_TO_ANALYZE', 422);
  }

  const payload = await requestJson('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      reasoning: { effort: 'low' },
      instructions: [
        'Jesteś analitykiem komunikacji profesjonalnego klubu koszykarskiego.',
        'Analizuj wyłącznie przekazane dane z oficjalnego profilu Facebook.',
        'Odpowiadaj po polsku, konkretnie i operacyjnie.',
        'Nie wymyślaj wyników, zawodników, wydarzeń ani statystyk.',
        'Jeśli danych jest mało, zaznacz niższą pewność i opieraj rekomendacje na rytmie publikacji oraz reakcjach odbiorców.',
        'Godziny podawaj w strefie Europe/Warsaw.'
      ].join(' '),
      input: JSON.stringify(compactOverviewForAnalysis(overview)),
      text: {
        format: {
          type: 'json_schema',
          name: 'club_social_analysis',
          strict: true,
          schema: analysisSchema()
        }
      }
    })
  });

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new IntegrationError('OpenAI nie zwróciło kompletnej analizy.', 'OPENAI_EMPTY_RESPONSE', 502);
  }

  let result;
  try {
    result = JSON.parse(outputText);
  } catch {
    throw new IntegrationError('Nie udało się odczytać analizy OpenAI.', 'OPENAI_INVALID_RESPONSE', 502);
  }

  cache.analysis = {
    ...result,
    generatedAt: new Date().toISOString(),
    model: payload.model || OPENAI_MODEL,
    basedOnPosts: overview.posts.length
  };
  cache.analysisFetchedAt = Date.now();
  return { overview, analysis: cache.analysis };
}

function getCachedState() {
  return {
    overview: cache.overview,
    analysis: cache.analysis
  };
}

function startSocialMonitor(logger = console) {
  if (cache.monitorStarted || !process.env.META_PAGE_ID || !process.env.META_PAGE_ACCESS_TOKEN) {
    return false;
  }

  cache.monitorStarted = true;
  const refresh = async () => {
    const previousPostId = cache.overview?.posts?.[0]?.id || null;
    try {
      const overview = await fetchFacebookOverview({ force: true });
      const latestPostId = overview.posts?.[0]?.id || null;
      const shouldAnalyze = AUTO_ANALYZE
        && Boolean(process.env.OPENAI_API_KEY)
        && (!cache.analysis || (latestPostId && latestPostId !== previousPostId));
      if (shouldAnalyze) await analyzeFacebookOverview();
    } catch (error) {
      logger.warn?.(`Social monitor: ${error.code || 'ERROR'} — ${error.message}`);
    }
  };

  const initialRun = setTimeout(refresh, 8 * 1000);
  initialRun.unref?.();
  const interval = setInterval(refresh, MONITOR_INTERVAL_MS);
  interval.unref?.();
  return true;
}

module.exports = {
  IntegrationError,
  getIntegrationStatus,
  fetchFacebookOverview,
  analyzeFacebookOverview,
  getCachedState,
  buildOverview,
  startSocialMonitor
};
