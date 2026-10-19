import { useMarket, fmt } from '../data/live.js'

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
  const rows = ITEMS.map(([k, label, kind]) => [k, label, kind, market.items?.[k]]).filter((r) => r[3])
  if (!rows.length) return null
  return (
    <div className="border-b border-ink/10 bg-panel" role="region" aria-label="Market snapshot">
      <ul className="mx-auto flex max-w-site gap-6 overflow-x-auto px-4 py-1.5 text-xs sm:px-6 [scrollbar-width:none]">
        {market.session && <li className="shrink-0 whitespace-nowrap text-ink/50">Close {fmt.shortDate(market.session)}</li>}
        {rows.map(([k, label, kind, it]) => {
          const [v, c] = show(kind, it)
          const up = kind === 'flow' ? it.value >= 0 : it.change > 0
          const down = kind === 'flow' ? it.value < 0 : it.change < 0
          return (
            <li key={k} className="num flex shrink-0 items-baseline gap-2 whitespace-nowrap" title={`${it.source}, ${fmt.date(it.asOf)}`}>
              <span className="font-sans text-ink/60">{label}</span>
              <span className={`font-medium ${kind === 'flow' ? (up ? 'text-up' : 'text-down') : 'text-ink'}`}>{v}</span>
              {c && (
                <span className={up ? 'text-up' : down ? 'text-down' : 'text-ink/60'}>
                  {up ? '▲' : down ? '▼' : ''} {c}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
