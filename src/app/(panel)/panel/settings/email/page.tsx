import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { ArrowLeft, Mail, Send, Inbox, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { EmailTestForm } from '@/components/settings/email-test-form'

export default async function EmailSettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  // Pobierz konfigurację z .env
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'Nie skonfigurowano',
    port: process.env.SMTP_PORT || '-',
    user: process.env.SMTP_USER || 'Nie skonfigurowano',
    fromName: process.env.SMTP_FROM_NAME || 'GraphFlow',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@graphflow.eu',
    isConfigured: !!process.env.SMTP_HOST && !!process.env.SMTP_USER,
  }

  const imapConfig = {
    host: process.env.IMAP_HOST || 'Nie skonfigurowano',
    port: process.env.IMAP_PORT || '-',
    user: process.env.IMAP_USER || 'Nie skonfigurowano',
    mailbox: process.env.IMAP_MAILBOX || 'INBOX',
    pollInterval: parseInt(process.env.EMAIL_POLL_INTERVAL || '60000') / 1000,
    isConfigured: !!process.env.IMAP_HOST && !!process.env.IMAP_USER,
  }

  const replyConfig = {
    domain: process.env.EMAIL_REPLY_DOMAIN || 'graphflow.eu',
    secretConfigured: !!process.env.EMAIL_REPLY_SECRET,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/panel/settings"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ustawienia
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Konfiguracja email</h1>
        <p className="text-gray-600 mt-1">
          Ustawienia SMTP (wysyłka) i IMAP (odbieranie)
        </p>
      </div>

      {/* SMTP */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">SMTP (wysyłka maili)</h2>
            <p className="text-sm text-gray-500">Konfiguracja wysyłki powiadomień</p>
          </div>
          <div className="ml-auto">
            {smtpConfig.isConfigured ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="w-4 h-4" />
                Nie skonfigurowano
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Host</label>
            <p className="font-mono text-sm">{smtpConfig.host}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Port</label>
            <p className="font-mono text-sm">{smtpConfig.port}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Użytkownik</label>
            <p className="font-mono text-sm">{smtpConfig.user}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Nadawca</label>
            <p className="font-mono text-sm">{smtpConfig.fromName} &lt;{smtpConfig.fromEmail}&gt;</p>
          </div>
        </div>
        {smtpConfig.isConfigured && (
          <div className="p-4 border-t border-gray-200">
            <EmailTestForm type="smtp" />
          </div>
        )}
      </div>

      {/* IMAP */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Inbox className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">IMAP (odbieranie maili)</h2>
            <p className="text-sm text-gray-500">Konfiguracja workera email</p>
          </div>
          <div className="ml-auto">
            {imapConfig.isConfigured ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="w-4 h-4" />
                Nie skonfigurowano
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Host</label>
            <p className="font-mono text-sm">{imapConfig.host}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Port</label>
            <p className="font-mono text-sm">{imapConfig.port}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Użytkownik</label>
            <p className="font-mono text-sm">{imapConfig.user}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Skrzynka</label>
            <p className="font-mono text-sm">{imapConfig.mailbox}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Interwał sprawdzania</label>
            <p className="font-mono text-sm">{imapConfig.pollInterval}s</p>
          </div>
        </div>
      </div>

      {/* Reply-To */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Reply-To (odpowiedzi)</h2>
            <p className="text-sm text-gray-500">Konfiguracja mapowania odpowiedzi do ticketów</p>
          </div>
          <div className="ml-auto">
            {replyConfig.secretConfigured ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Brak klucza HMAC
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Domena Reply-To</label>
            <p className="font-mono text-sm">{replyConfig.domain}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Format adresu</label>
            <p className="font-mono text-sm text-xs">reply+TCK-XXXXXX.&lt;token&gt;@{replyConfig.domain}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Jak działa integracja email?</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>System wysyła powiadomienie z unikalnym adresem Reply-To</li>
          <li>Klient odpowiada na email (Reply)</li>
          <li>Worker IMAP sprawdza skrzynkę co {imapConfig.pollInterval}s</li>
          <li>Odpowiedź jest automatycznie przypisywana do ticketu</li>
          <li>Tworzony jest komentarz z treścią wiadomości</li>
        </ol>
        <p className="text-sm text-blue-700 mt-3">
          Konfiguracja znajduje się w pliku <code className="bg-blue-100 px-1 rounded">.env</code> na serwerze.
        </p>
      </div>
    </div>
  )
}
