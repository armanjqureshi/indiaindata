import { Link } from 'react-router-dom'
import { fmt } from '../../data/live.js'
import { BOARD_LABEL, STATUS_CLASS, STATUS_LABEL, priceLabel, dateRange, gainClass } from './ipoUtil.js'

// Column sets for the different IPO lists. Each column: [header, render, className]
const COLS = {
  company: ['Company', (i) => (
    <div className="min-w-[11rem]">
      <Link to={`/ipos/${i.slug}`} className="font-semibold text-ink hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/50">
        <span className={`rounded-[2px] px-1 ${i.board === 'sme' ? 'bg-society-light text-society' : 'bg-business-light text-business'}`}>{BOARD_LABEL[i.board]}</span>
        <span className="num">{i.symbol}</span>
      </div>
    </div>
  )],
  status: ['Status', (i) => <span className={`whitespace-nowrap rounded-[2px] px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[i.status]}`}>{STATUS_LABEL[i.status]}</span>],
  dates: ['Bidding', (i) => <span className="num whitespace-nowrap">{dateRange(i)}</span>],
  price: ['Price', (i) => <span className="num whitespace-nowrap">{priceLabel(i)}</span>, 'text-right'],
  lot: ['Lot', (i) => (i.lotSize ? <span className="num whitespace-nowrap">{fmt.inr(i.lotSize, 0)} sh<span className="block text-[11px] text-ink/50">{fmt.rupees(i.lotValue)}</span></span> : '—'), 'text-right'],
  size: ['Issue size', (i) => <span className="num whitespace-nowrap">{i.sizeCr ? fmt.crore(i.sizeCr) : '—'}</span>, 'text-right'],
  sub: ['Subscribed', (i) => (i.subscription !== null && i.subscription !== undefined ? <span className="num font-semibold">{fmt.times(i.subscription)}</span> : <span className="text-ink/40">—</span>), 'text-right'],
  listing: ['Listing', (i) => <span className="num whitespace-nowrap">{i.timetable?.listing ? `${fmt.shortDate(i.timetable.listing)}${i.timetable.expected?.listing ? '*' : ''}` : '—'}</span>],
  listed: ['Listed', (i) => <span className="num whitespace-nowrap">{fmt.date(i.listingDate)}</span>],
  listOpen: ['Listing price', (i) => <span className="num">{i.listing ? fmt.rupees(i.listing.open, 2) : '—'}</span>, 'text-right'],
  listGain: ['Listing gain', (i) => <span className={`num font-semibold ${gainClass(i.listingGainPct)}`}>{fmt.pct(i.listingGainPct)}</span>, 'text-right'],
  last: ['Last close', (i) => <span className="num">{i.lastClose ? fmt.rupees(i.lastClose, 2) : '—'}</span>, 'text-right'],
  gain: ['Since issue', (i) => <span className={`num font-semibold ${gainClass(i.gainPct)}`}>{fmt.pct(i.gainPct)}</span>, 'text-right'],
}

export const COLUMN_SETS = {
  live: ['company', 'status', 'dates', 'price', 'lot', 'size', 'sub'],
  closed: ['company', 'dates', 'price', 'size', 'sub', 'listing'],
  listed: ['company', 'listed', 'price', 'sub', 'listOpen', 'listGain', 'last', 'gain'],
  all: ['company', 'status', 'dates', 'price', 'sub', 'listGain', 'gain'],
}

export default function IpoTable({ rows, columns = 'all', caption, empty = 'No IPOs to show.' }) {
  const cols = COLUMN_SETS[columns].map((k) => COLS[k])
  if (!rows.length) return <p className="border-y border-ink/10 py-8 text-center text-sm text-ink/60">{empty}</p>
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            {cols.map(([h, , cls]) => (
              <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${cls || ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug + r.board} className="border-b border-ink/10 align-top last:border-0 hover:bg-ink/[0.03]">
              {cols.map(([h, render, cls]) => (
                <td key={h} className={`px-3 py-2.5 ${cls || ''}`}>{render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
