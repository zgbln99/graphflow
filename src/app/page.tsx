import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          {/* Logo - używamy białej wersji na ciemnym tle */}
          <div className="mb-12">
            <img
              src="/logo-white.png"
              alt="GraphFlow"
              className="h-16 md:h-20 w-auto mx-auto"
            />
          </div>

          {/* Login button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            Zaloguj się
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} GraphFlow</p>
      </footer>
    </div>
  )
}
