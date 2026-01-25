import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center w-fit">
          <img
            src="/logo.png"
            alt="GraphFlow"
            className="h-10 w-auto"
          />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} GraphFlow
      </footer>
    </div>
  )
}
