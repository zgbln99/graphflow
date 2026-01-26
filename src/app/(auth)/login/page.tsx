'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { loginAction } from './actions'
import { FadeIn, GradientBackground, RippleButton } from '@/components/ui/animations'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await loginAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        // Use window.location for reliable redirect after login
        window.location.href = '/panel'
      }
    } catch (e) {
      setError('Wystąpił błąd podczas logowania')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FadeIn duration={600} direction="up">
      <div className="card p-8 card-fancy overflow-hidden">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <div className="relative">
          <FadeIn delay={100} direction="none">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25 animate-float">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zaloguj się</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Wprowadź dane logowania, aby kontynuować</p>
            </div>
          </FadeIn>

          <form action={handleSubmit} className="space-y-6">
            {error && (
              <FadeIn duration={300} direction="none">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm animate-shake">
                  {error}
                </div>
              </FadeIn>
            )}

            <FadeIn delay={200} direction="up">
              <div>
                <label htmlFor="email" className="label">
                  Adres email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input transition-all duration-200 focus:shadow-lg focus:shadow-primary-500/10"
                  placeholder="twoj@email.pl"
                />
              </div>
            </FadeIn>

            <FadeIn delay={300} direction="up">
              <div>
                <label htmlFor="password" className="label">
                  Hasło
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="input pr-10 transition-all duration-200 focus:shadow-lg focus:shadow-primary-500/10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={400} direction="up">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="remember"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-transform group-hover:scale-110"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Zapamiętaj mnie</span>
                </label>
                <Link href="/forgot-password" className="text-sm link link-fancy">
                  Zapomniałeś hasła?
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={500} direction="up">
              <RippleButton
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full btn-glow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Logowanie...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Zaloguj się
                  </>
                )}
              </RippleButton>
            </FadeIn>
          </form>
        </div>
      </div>
    </FadeIn>
  )
}
