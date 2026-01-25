'use client'

interface BarChartProps {
  data: { label: string; value: number; color: string }[]
  maxValue?: number
}

export function BarChart({ data, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
}

export function DonutChart({ data, size = 160 }: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 dark:text-gray-400 text-sm">Brak danych</span>
      </div>
    )
  }

  const radius = size / 2 - 20
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = item.value / total
            const strokeDasharray = `${percentage * circumference} ${circumference}`
            const strokeDashoffset = -offset
            offset += percentage * circumference

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="24"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Razem</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TrendLineProps {
  data: number[]
  height?: number
  color?: string
}

export function TrendLine({ data, height = 60, color = '#6366f1' }: TrendLineProps) {
  if (data.length === 0) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 200
  const padding = 4

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Gradient area
  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ]
  const areaD = `M ${areaPoints.join(' L ')} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#trendGradient)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface ActivityHeatmapProps {
  data: { date: string; count: number }[]
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  // Group by week and day
  const weeks: { date: string; count: number }[][] = []
  let currentWeek: { date: string; count: number }[] = []

  data.forEach((d, i) => {
    currentWeek.push(d)
    if ((i + 1) % 7 === 0) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  if (currentWeek.length) {
    weeks.push(currentWeek)
  }

  function getColor(count: number): string {
    if (count === 0) return 'rgb(229, 231, 235)' // gray-200
    const intensity = count / maxCount
    if (intensity < 0.25) return 'rgb(187, 247, 208)' // green-200
    if (intensity < 0.5) return 'rgb(134, 239, 172)' // green-300
    if (intensity < 0.75) return 'rgb(74, 222, 128)' // green-400
    return 'rgb(34, 197, 94)' // green-500
  }

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <div className="w-6" />
        {weeks.map((_, i) => (
          <div key={i} className="w-3 h-3" />
        ))}
      </div>
      {days.map((day, dayIndex) => (
        <div key={day} className="flex gap-1 items-center">
          <div className="w-6 text-xs text-gray-500 dark:text-gray-400">{day}</div>
          {weeks.map((week, weekIndex) => {
            const cellData = week[dayIndex]
            if (!cellData) return <div key={weekIndex} className="w-3 h-3" />

            return (
              <div
                key={weekIndex}
                className="w-3 h-3 rounded-sm transition-colors"
                style={{ backgroundColor: getColor(cellData.count) }}
                title={`${cellData.date}: ${cellData.count} aktywności`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface StatsCardWithTrendProps {
  label: string
  value: number
  previousValue: number
  icon: React.ReactNode
  color: string
}

export function StatsCardWithTrend({
  label,
  value,
  previousValue,
  icon,
  color,
}: StatsCardWithTrendProps) {
  const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0
  const isPositive = change >= 0

  return (
    <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg`} style={{ backgroundColor: color + '20', color }}>
          {icon}
        </div>
        {previousValue > 0 && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '↑' : '↓'}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}
