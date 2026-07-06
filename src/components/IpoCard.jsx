import { Link } from 'react-router-dom'
import { sectionColorMap, getIpoStatus } from '../data/content.js'

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

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function IpoCard({ ipo }) {
  const status = getIpoStatus(ipo.status)
  const colors = sectionColorMap[status?.color] || sectionColorMap.news
  const dirColor = ipo.direction === 'up' ? 'text-up' : ipo.direction === 'down' ? 'text-down' : ''

  return (
    <Link
      to={`/ipos/${ipo.slug}`}
      className={`group flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:${colors.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${colors.bgLight} ${colors.text} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide`}
          >
            {status?.name}
          </span>
          <h3 className="mt-2 font-display text-base font-semibold leading-snug text-ink group-hover:text-brand-dark">
            {ipo.companyName}
          </h3>
          <p className="text-xs text-ink/50">{ipo.sector}</p>
        </div>
      </div>

      {ipo.status === 'listed' ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-semibold leading-none">{ipo.currentPrice}</p>
            <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${dirColor}`}>
              {ipo.direction === 'up' && <span aria-hidden="true">▲</span>}
              {ipo.direction === 'down' && <span aria-hidden="true">▼</span>}
              {ipo.currentGain} since issue
            </p>
          </div>
          {ipo.chart && (
            <div className="w-24 shrink-0">
              <MiniSparkline data={ipo.chart.data} dataKey={ipo.chart.dataKeys[0]} hex={colors.hex} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-display text-lg font-semibold leading-none">{ipo.priceBand || ipo.issuePrice}</p>
          {ipo.status === 'upcoming' && (
            <p className="text-xs text-ink/60">Opens {formatDate(ipo.openDate)}</p>
          )}
          {ipo.status === 'open' && (
            <p className="text-xs text-ink/60">{ipo.subscriptionTimes} · Closes {formatDate(ipo.closeDate)}</p>
          )}
          {ipo.status === 'closed' && (
            <p className="text-xs text-ink/60">{ipo.subscriptionTimes} · Listing {formatDate(ipo.listingDate)}</p>
          )}
        </div>
      )}

      <p className="text-xs text-ink/50">{ipo.issueSize}</p>
    </Link>
  )
}
