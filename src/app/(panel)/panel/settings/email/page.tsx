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
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ustawienia
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfiguracja email</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Ustawienia SMTP (wysyłka) i IMAP (odbieranie)
        </p>
      </div>

      {/* SMTP */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">SMTP (wysyłka maili)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Konfiguracja wysyłki powiadomień</p>
          </div>
          <div className="ml-auto">
            {smtpConfig.isConfigured ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                Nie skonfigurowano
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Host</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{smtpConfig.host}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Port</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{smtpConfig.port}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Użytkownik</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{smtpConfig.user}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Nadawca</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{smtpConfig.fromName} &lt;{smtpConfig.fromEmail}&gt;</p>
          </div>
        </div>
        {smtpConfig.isConfigured && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <EmailTestForm type="smtp" />
          </div>
        )}
      </div>

      {/* IMAP */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Inbox className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">IMAP (odbieranie maili)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Konfiguracja workera email</p>
          </div>
          <div className="ml-auto">
            {imapConfig.isConfigured ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                Nie skonfigurowano
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Host</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{imapConfig.host}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Port</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{imapConfig.port}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Użytkownik</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{imapConfig.user}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Skrzynka</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{imapConfig.mailbox}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Interwał sprawdzania</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{imapConfig.pollInterval}s</p>
          </div>
        </div>
      </div>

      {/* Reply-To */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Reply-To (odpowiedzi)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Konfiguracja mapowania odpowiedzi do ticketów</p>
          </div>
          <div className="ml-auto">
            {replyConfig.secretConfigured ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Skonfigurowano
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Brak klucza HMAC
              </span>
            )}
          </div>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Domena Reply-To</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{replyConfig.domain}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Format adresu</label>
            <p className="font-mono text-sm text-xs text-gray-900 dark:text-white">reply+TCK-XXXXXX.&lt;token&gt;@{replyConfig.domain}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Jak działa integracja email?</h3>
        <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>System wysyła powiadomienie z unikalnym adresem Reply-To</li>
          <li>Klient odpowiada na email (Reply)</li>
          <li>Worker IMAP sprawdza skrzynkę co {imapConfig.pollInterval}s</li>
          <li>Odpowiedź jest automatycznie przypisywana do ticketu</li>
          <li>Tworzony jest komentarz z treścią wiadomości</li>
        </ol>
        <p className="text-sm text-blue-700 dark:text-blue-400 mt-3">
          Konfiguracja znajduje się w pliku <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">.env</code> na serwerze.
        </p>
      </div>
    </div>
  )
}
