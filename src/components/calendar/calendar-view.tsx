'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Ticket, FolderKanban, GitBranch } from 'lucide-react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'ticket' | 'project' | 'stage'
  color: string
  url: string
  subtitle?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
}

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

function getTypeIcon(type: 'ticket' | 'project' | 'stage') {
  switch (type) {
    case 'ticket':
      return <Ticket className="w-3 h-3" />
    case 'project':
      return <FolderKanban className="w-3 h-3" />
    case 'stage':
      return <GitBranch className="w-3 h-3" />
  }
}

function getTypeName(type: 'ticket' | 'project' | 'stage') {
  switch (type) {
    case 'ticket':
      return 'Ticket'
    case 'project':
      return 'Projekt'
    case 'stage':
      return 'Etap'
  }
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'list'>('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Oblicz dni w kalendarzu
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = (firstDay.getDay() + 6) % 7 // Poniedziałek = 0
    const daysInMonth = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Poprzedni miesiąc
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Bieżący miesiąc
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Następny miesiąc
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }

    return days
  }, [year, month])

  // Eventy dla danego dnia
  function getEventsForDate(date: Date) {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Eventy dla wybranego dnia lub nadchodzące
  const selectedEvents = useMemo(() => {
    if (selectedDate) {
      return getEventsForDate(selectedDate)
    }
    // Sortuj po dacie
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [selectedDate, events])

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Kalendarz */}
      <div className="lg:col-span-2 card dark:bg-gray-800 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
              {MONTHS_PL[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Dzisiaj
            </button>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === 'month'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Miesiąc
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {view === 'month' ? (
          <>
            {/* Dni tygodnia */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_PL.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Siatka dni */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }, index) => {
                const dayEvents = getEventsForDate(date)
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[80px] p-1 rounded-lg border transition-all text-left
                      ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
                      ${isSelected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 dark:border-gray-700'}
                      ${!isCurrentMonth && 'opacity-50'}
                      hover:border-primary-300 dark:hover:border-primary-700
                    `}
                  >
                    <div
                      className={`
                        w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                        ${isToday(date) ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300'}
                        ${isPast(date) && !isToday(date) && 'text-gray-400 dark:text-gray-500'}
                      `}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs truncate px-1 py-0.5 rounded"
                          style={{ backgroundColor: event.color + '20', color: event.color }}
                        >
                          {event.title.split(':')[0]}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                          +{dayEvents.length - 3} więcej
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          /* Widok listy */
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Brak nadchodzących terminów
              </div>
            ) : (
              [...events]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((event) => (
                  <Link
                    key={event.id}
                    href={event.url}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: event.color + '20', color: event.color }}
                    >
                      {getTypeIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </div>
                      {event.subtitle && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {event.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(event.date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getTypeName(event.type)}
                      </div>
                    </div>
                  </Link>
                ))
            )}
          </div>
        )}
      </div>

      {/* Panel szczegółów */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {selectedDate
              ? selectedDate.toLocaleDateString('pl-PL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : 'Nadchodzące terminy'}
          </h3>
        </div>

        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-4"
          >
            Pokaż wszystkie
          </button>
        )}

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {selectedEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Brak terminów</p>
            </div>
          ) : (
            selectedEvents.map((event) => (
              <Link
                key={event.id}
                href={event.url}
                className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                  >
                    {getTypeIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {event.title}
                    </div>
                    {event.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {event.subtitle}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                      >
                        {getTypeName(event.type)}
                      </span>
                      {!selectedDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(event.date).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Legenda */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
            Legenda
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Ticket (normalny)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">Ticket (wysoki)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Ticket (pilny)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Projekt</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">Etap (aktualny)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Etap (zaplanowany)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
