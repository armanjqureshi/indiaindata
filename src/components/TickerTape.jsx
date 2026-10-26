import { useMarket, useIntraday, withIntraday, fmt } from '../data/live.js'

// Closing levels written by the scheduled market job (live/market.json).
const ITEMS = [
  ['nifty-50', 'Nifty 50', 'index'],
  ['sensex', 'Sensex', 'index'],
  ['nifty-bank', 'Nifty Bank', 'index'],
  ['india-vix', 'India VIX', 'index'],
  ['usd-inr', 'USD/INR', 'fx'],
  ['gold-ibja', 'Gold 10 g', 'gold'],
  ['fii-net', 'FII net', 'flow'],
  ['dii-net', 'DII net', 'flow'],
]

function show(kind, it) {
  if (kind === 'fx') return [fmt.inr(it.value, 2), it.change === null ? '' : `${it.change > 0 ? '+' : ''}${fmt.inr(it.change, 2)}`]
  if (kind === 'gold') return [`₹${fmt.inr(it.value, 0)}`, it.changePct === null ? '' : `${it.changePct > 0 ? '+' : ''}${fmt.inr(it.changePct, 2)}%`]
  if (kind === 'flow') return [`${it.value < 0 ? '-' : '+'}₹${fmt.inr(Math.abs(it.value), 0)} cr`, '']
  return [fmt.inr(it.value, 2), it.changePct === null ? '' : `${it.changePct > 0 ? '+' : ''}${fmt.inr(it.changePct, 2)}%`]
}

export default function TickerTape() {
  const market = useMarket()
  const { items, live } = withIntraday(market, useIntraday())
  const rows = ITEMS.map(([k, label, kind]) => [k, label, kind, items?.[k]]).filter((r) => r[3])
  if (!rows.length) return null
  const cells = (hidden) =>
    rows.map(([k, label, kind, it]) => {
      const [v, c] = show(kind, it)
      const up = kind === 'flow' ? it.value >= 0 : it.change > 0
      const down = kind === 'flow' ? it.value < 0 : it.change < 0
      return (
        <li key={k} aria-hidden={hidden || undefined} className="num flex shrink-0 items-baseline gap-2 whitespace-nowrap pr-8" title={`${it.source}, ${it.intraday ? `${it.asOf.slice(11, 16)} IST` : fmt.date(it.asOf)}`}>
          <span className="font-sans text-ink/60">{label}</span>
          <span className={`font-medium ${kind === 'flow' ? (up ? 'text-up' : 'text-down') : 'text-ink'}`}>{v}</span>
          {c && (
            <span className={`rounded-full px-1.5 ${up ? 'bg-up/15 text-up' : down ? 'bg-down/15 text-down' : 'text-ink/60'}`}>
              {up ? '\u25b2' : down ? '\u25bc' : ''} {c}
            </span>
          )}
        </li>
      )
    })
  return (
    <div className="flex items-center border-b border-ink/10 bg-panel text-xs" role="region" aria-label="Market snapshot">
      {(live || market.session) && (
        <span className="relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-panel py-1.5 pl-4 pr-4 text-ink/50 shadow-[8px_0_8px_-4px_rgb(var(--panel))] sm:pl-6"
          title={live ? 'Index levels from NSE and Moneycontrol website feeds, updated about every 5 minutes. Other figures are end-of-day.' : undefined}>
          {live?.open && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" aria-hidden="true" />}
          {live ? `${live.open ? 'Live' : 'As of'} ${live.time} IST` : `Close ${fmt.shortDate(market.session)}`}
        </span>
      )}
      <div className="ticker-viewport min-w-0 flex-1 overflow-hidden">
        <ul className="ticker-track flex w-max py-1.5">
          {cells(false)}
          {cells(true)}
        </ul>
      </div>
    </div>
  )
}
