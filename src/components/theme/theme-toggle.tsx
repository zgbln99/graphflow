'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-500'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="Jasny motyw"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-500'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="Ciemny motyw"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="Systemowy"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={resolvedTheme === 'dark' ? 'Przełącz na jasny' : 'Przełącz na ciemny'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-500" />
      )}
    </button>
  )
}
