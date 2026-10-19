import { marketTickers, tickerAsOf } from '../data/content.js'

// Static strip of headline market numbers. Edit values in Settings > Site in the CMS.
export default function TickerTape() {
  if (!marketTickers.length) return null
  return (
    <div className="border-b border-ink/10 bg-panel" role="region" aria-label="Market snapshot">
      <ul className="mx-auto flex max-w-site gap-6 overflow-x-auto px-4 py-1.5 text-xs sm:px-6 [scrollbar-width:none]">
        {tickerAsOf && <li className="shrink-0 whitespace-nowrap text-ink/40">{tickerAsOf}</li>}
        {marketTickers.map((t) => (
          <li key={t.label} className="num flex shrink-0 items-baseline gap-2 whitespace-nowrap">
            <span className="font-sans text-ink/60">{t.label}</span>
            <span className="font-medium text-ink">{t.value}</span>
            <span className={t.direction === 'up' ? 'text-up' : t.direction === 'down' ? 'text-down' : 'text-ink/60'}>
              {t.direction === 'up' ? '▲' : t.direction === 'down' ? '▼' : ''} {t.change}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
