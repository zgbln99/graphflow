'use client'

import { useState, useTransition } from 'react'
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { testEmailAction } from './email-actions'

interface EmailTestFormProps {
  type: 'smtp' | 'imap'
}

export function EmailTestForm({ type }: EmailTestFormProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [email, setEmail] = useState('')

  async function handleTest() {
    if (!email) return

    setResult(null)

    startTransition(async () => {
      const res = await testEmailAction(email)
      setResult(res)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900 text-sm">Test wysyłki</h3>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Podaj email do testu..."
          className="input flex-1"
        />
        <button
          onClick={handleTest}
          disabled={isPending || !email}
          className="btn-primary"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="ml-2">Wyślij test</span>
        </button>
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {result.message}
        </div>
      )}
    </div>
  )
}
