import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'graphflow-session'

// Publiczne ścieżki (bez autoryzacji)
const publicPaths = ['/', '/login', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sprawdź czy ścieżka jest publiczna
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith('/api/public')
  )

  // Statyczne pliki i API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // pliki statyczne
  ) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get(COOKIE_NAME)?.value

  // Jeśli ścieżka publiczna i użytkownik zalogowany - przekieruj do panelu
  if (isPublicPath && sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  // Jeśli ścieżka chroniona i brak sesji - przekieruj do logowania
  if (!isPublicPath && !sessionToken && pathname.startsWith('/panel')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
