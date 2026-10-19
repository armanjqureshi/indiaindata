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

export default function IndicatorCard({ indicator, watched = false, onToggleWatch }) {
  const category = getIndicatorCategory(indicator.category)
  const colors = sectionColorMap[category?.color] || sectionColorMap.economy
  const dirColor = indicator.direction === 'up' ? 'text-up' : indicator.direction === 'down' ? 'text-down' : ''

  return (
    <div className="relative">
    <Link
      to={`/indicators/${indicator.slug}`}
      className={`group flex h-full flex-col gap-3 rounded-sm border border-ink/10 bg-panel p-5 transition-all duration-200 hover:${colors.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 pr-7 font-display text-base font-semibold leading-snug text-ink group-hover:text-brand-dark">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 ${colors.bg}`} />
          {indicator.name}
        </h3>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={`num font-semibold leading-tight ${indicator.currentValue.length > 9 ? 'text-lg' : 'text-2xl'}`}>{indicator.currentValue}</p>
          <p className={`num mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${dirColor}`}>
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
        {indicator.live ? 'Auto-updated' : indicator.verified === false ? 'Sample data' : 'Verified'}
        <span className="mx-1.5" aria-hidden="true">•</span>
        As of {new Date(indicator.asOf + 'T00:00:00').toLocaleDateString('en-IN', indicator.live ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'short', year: 'numeric' })}
        <span className="mx-1.5" aria-hidden="true">•</span>
        {indicator.frequency}
      </p>
    </Link>
    {onToggleWatch && (
      <button
        type="button"
        onClick={() => onToggleWatch(indicator.slug)}
        aria-pressed={watched}
        aria-label={watched ? `Remove ${indicator.name} from watchlist` : `Add ${indicator.name} to watchlist`}
        className={`absolute right-3 top-3 p-1 transition-colors ${watched ? 'text-brand' : 'text-ink/30 hover:text-ink'}`}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z" />
        </svg>
      </button>
    )}
    </div>
  )
}
