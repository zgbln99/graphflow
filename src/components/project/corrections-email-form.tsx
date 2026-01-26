'use client'

import { useState } from 'react'
import { Send, Plus, Trash2, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface CorrectionsEmailFormProps {
  projectId: string
  projectTitle: string
  filesCount: number
}

export function CorrectionsEmailForm({ projectId, projectTitle, filesCount }: CorrectionsEmailFormProps) {
  const [corrections, setCorrections] = useState<string[]>([''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const addCorrection = () => {
    setCorrections([...corrections, ''])
  }

  const removeCorrection = (index: number) => {
    if (corrections.length > 1) {
      setCorrections(corrections.filter((_, i) => i !== index))
    }
  }

  const updateCorrection = (index: number, value: string) => {
    const newCorrections = [...corrections]
    newCorrections[index] = value
    setCorrections(newCorrections)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validCorrections = corrections.filter(c => c.trim())
    if (validCorrections.length === 0) {
      setResult({ success: false, message: 'Dodaj co najmniej jedną poprawkę' })
      return
    }

    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/send-corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: validCorrections }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || 'Email z poprawkami został wysłany' })
        setCorrections([''])
      } else {
        setResult({ success: false, message: data.error || 'Wystąpił błąd podczas wysyłania' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Błąd połączenia z serwerem' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validCount = corrections.filter(c => c.trim()).length

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Email zostanie wysłany</strong> do kontaktów projektu z listą poprawek
          {filesCount > 0 && (
            <span className="flex items-center gap-1 mt-1">
              <FileText className="w-4 h-4" />
              oraz linkami do {filesCount} {filesCount === 1 ? 'pliku' : 'plików'}
            </span>
          )}
        </p>
      </div>

      {/* Corrections list */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Lista poprawek
        </label>
        {corrections.map((correction, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </span>
            <input
              type="text"
              value={correction}
              onChange={(e) => updateCorrection(index, e.target.value)}
              placeholder={`Poprawka ${index + 1}...`}
              className="flex-1 input dark:bg-gray-800 dark:border-gray-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && correction.trim()) {
                  e.preventDefault()
                  addCorrection()
                }
              }}
            />
            {corrections.length > 1 && (
              <button
                type="button"
                onClick={() => removeCorrection(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={addCorrection}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Dodaj kolejną poprawkę
      </button>

      {/* Result message */}
      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          result.success
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {result.success ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || validCount === 0}
        className="w-full btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Wysyłanie...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Wyślij email z poprawkami
            {validCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                {validCount}
              </span>
            )}
          </>
        )}
      </button>
    </form>
  )
}
