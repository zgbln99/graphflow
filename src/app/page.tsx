import Link from 'next/link'
import { ArrowRight, CheckCircle, Mail, FolderKanban, Clock, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="GraphFlow"
              className="h-10 w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span className="text-xl font-bold text-white">GraphFlow</span>
          </div>
          <Link
            href="/login"
            className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            Zaloguj się
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Zarządzaj projektami graficznymi{' '}
            <span className="text-primary-400">profesjonalnie</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            GraphFlow to kompletny system do zarządzania projektami graficznymi.
            Śledź postępy, komunikuj się z klientami i utrzymuj porządek w plikach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="btn-primary btn-lg gap-2"
            >
              Przejdź do panelu
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<FolderKanban className="w-6 h-6" />}
            title="Projekty i statusy"
            description="Organizuj projekty, śledź statusy i zarządzaj priorytetami w jednym miejscu."
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="Timeline etapów"
            description="Definiuj etapy projektu, ustalaj daty i informuj klientów o postępach."
          />
          <FeatureCard
            icon={<Mail className="w-6 h-6" />}
            title="Integracja e-mail"
            description="Klienci odpowiadają na maile, a wiadomości automatycznie trafiają do systemu."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Multi-user"
            description="Każdy klient może mieć wielu użytkowników z dostępem do swoich projektów."
          />
        </div>

        {/* For clients section */}
        <div className="mt-24 max-w-2xl mx-auto text-center">
          <div className="card p-8 bg-white/5 border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Dla klientów</h2>
            <p className="text-gray-300 mb-6">
              Dostęp do systemu GraphFlow jest możliwy tylko po otrzymaniu zaproszenia.
              Jeśli jesteś klientem i potrzebujesz dostępu, skontaktuj się z nami.
            </p>
            <div className="flex items-center justify-center gap-2 text-primary-400">
              <Mail className="w-5 h-5" />
              <a href="mailto:marek@graphflow.eu" className="hover:text-primary-300">
                marek@graphflow.eu
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <img
              src="/icon.png"
              alt="GraphFlow"
              className="w-6 h-6"
            />
            <span>GraphFlow</span>
          </div>
          <p>© {new Date().getFullYear()} GraphFlow. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}
