import Link from 'next/link'
import { ArrowRight, CheckCircle, Palette, Clock, Users, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img
            src="/logo-white.png"
            alt="GraphFlow"
            className="h-10 w-auto"
          />
          <Link
            href="/login"
            className="text-white hover:text-primary-300 font-medium transition-colors"
          >
            Zaloguj sie
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Zarzadzaj projektami
              <span className="text-primary-400"> graficznymi</span>
              <br />jak profesjonalista
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              GraphFlow to kompleksowe narzedzie do zarzadzania projektami graficznymi.
              Organizuj prace, komunikuj sie z klientami i dostarczaj projekty na czas.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-primary-600/25"
            >
              Rozpocznij teraz
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            <FeatureCard
              icon={<Palette className="w-8 h-8" />}
              title="Projekty graficzne"
              description="Tworz i zarzadzaj projektami graficznymi. Przechowuj pliki, wersje i historie zmian w jednym miejscu."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Portal klienta"
              description="Daj klientom dostep do panelu, gdzie moga sledzic postepy, dodawac komentarze i pobierac pliki."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Timeline projektu"
              description="Wizualizuj etapy projektu i informuj klientow o postepach w czasie rzeczywistym."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Powiadomienia na zywo"
              description="Otrzymuj natychmiastowe powiadomienia o nowych komentarzach, zmianach statusu i aktualizacjach."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Bezpieczenstwo"
              description="Twoje dane sa bezpieczne. Kontroluj dostep i uprawnienia dla kazdego uzytkownika."
            />
            <FeatureCard
              icon={<CheckCircle className="w-8 h-8" />}
              title="System ticketow"
              description="Zarzadzaj zgloszeniami i prosbami klientow. Wszystko w jednym miejscu."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} GraphFlow. Wszelkie prawa zastrzezone.</p>
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
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-primary-500/50 transition-colors">
      <div className="text-primary-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}
