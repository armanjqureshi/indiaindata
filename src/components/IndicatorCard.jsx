import { Link } from 'react-router-dom'
import { sectionColorMap, getIndicatorCategory } from '../data/content.js'

// A tiny inline sparkline drawn straight from the indicator's own chart data
// — same "the data is the artwork" idea as CardCover, just compact enough
// to sit inside a stat card instead of behind it.
function MiniSparkline({ data, dataKey, hex }) {
  if (!data || data.length < 2) return null
  const values = data.map((d) => Number(d[dataKey]) || 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 120
  const H = 36
  const pad = 3
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (W - pad * 2)
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={hex} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function IndicatorCard({ indicator }) {
  const category = getIndicatorCategory(indicator.category)
  const colors = sectionColorMap[category?.color] || sectionColorMap.economy
  const dirColor = indicator.direction === 'up' ? 'text-up' : indicator.direction === 'down' ? 'text-down' : ''

  return (
    <Link
      to={`/indicators/${indicator.slug}`}
      className={`group flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:${colors.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold leading-snug text-ink group-hover:text-brand-dark">
          {indicator.name}
        </h3>
        <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${colors.bg}`} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold leading-none">{indicator.currentValue}</p>
          <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${dirColor}`}>
            {indicator.direction === 'up' && <span aria-hidden="true">▲</span>}
            {indicator.direction === 'down' && <span aria-hidden="true">▼</span>}
            {indicator.change}
          </p>
        </div>
        <div className="w-24 shrink-0">
          <MiniSparkline data={indicator.chart.data} dataKey={indicator.chart.dataKeys[0]} hex={colors.hex} />
        </div>
      </div>

      <p className="text-xs text-ink/50">
        As of {new Date(indicator.asOf + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        <span className="mx-1.5" aria-hidden="true">•</span>
        {indicator.frequency}
      </p>
    </Link>
  )
}
