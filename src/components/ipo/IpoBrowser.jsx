import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import IpoTable from './IpoTable.jsx'
import { ipoStatus, fetchLive, fmt } from '../../data/live.js'
import { median, gainClass } from './ipoUtil.js'

const TABS = [
  ['listed', 'Recently listed'],
  ['all', 'All IPOs: search and filter'],
]
const PAGE = 50

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-panel p-4">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  )
}

// Recently listed issues and the full searchable archive of NSE IPOs.
export default function IpoBrowser({ data, today }) {
  const [tab, setTab] = useState('listed')
  const [archive, setArchive] = useState([])
  const [board, setBoard] = useState('all')
  const [year, setYear] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const ipos = useMemo(() => {
    const seen = new Set()
    return [...data.ipos, ...archive]
      .filter((i) => (seen.has(i.slug) ? false : seen.add(i.slug)))
      .map((i) => ({ ...i, status: ipoStatus(i, today) }))
  }, [data, archive, today])

  // the archive (older listings) is only needed for the "All IPOs" tab
  useEffect(() => {
    if (tab === 'all' && !archive.length) fetchLive('live/ipos-archive.json').then((d) => d && setArchive(d.ipos || []))
  }, [tab])

  const listedRecent = ipos.filter((i) => i.status === 'listed').sort((a, b) => b.listingDate.localeCompare(a.listingDate)).slice(0, 30)
  const years = [...new Set(ipos.map((i) => i.open?.slice(0, 4)).filter(Boolean))].sort().reverse()

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = ipos.filter(
      (i) =>
        (board === 'all' || i.board === board) &&
        (year === 'all' || i.open?.startsWith(year)) &&
        (!term || i.name.toLowerCase().includes(term) || i.symbol.toLowerCase().includes(term))
    )
    const key = { newest: (i) => i.open, size: (i) => i.sizeCr ?? -1, sub: (i) => i.subscription ?? -1, gain: (i) => i.listingGainPct ?? -1e9 }[sort]
    out = [...out].sort((a, b) => (sort === 'newest' ? (key(b) || '').localeCompare(key(a) || '') : key(b) - key(a)))
    return out
  }, [ipos, board, year, q, sort])
  useEffect(() => setPage(1), [board, year, q, sort])

  const stats = useMemo(() => {
    const listedWithGain = filtered.filter((i) => Number.isFinite(i.listingGainPct))
    const pos = listedWithGain.filter((i) => i.listingGainPct > 0).length
    return {
      count: filtered.length,
      main: filtered.filter((i) => i.board === 'mainboard').length,
      sme: filtered.filter((i) => i.board === 'sme').length,
      medianGain: median(listedWithGain.map((i) => i.listingGainPct)),
      positiveShare: listedWithGain.length ? (pos / listedWithGain.length) * 100 : null,
      n: listedWithGain.length,
      best: [...listedWithGain].sort((a, b) => b.listingGainPct - a.listingGainPct).slice(0, 3),
      worst: [...listedWithGain].sort((a, b) => a.listingGainPct - b.listingGainPct).slice(0, 3),
    }
  }, [filtered])

  return (
    <div>
        <div role="tablist" aria-label="IPO lists" className="flex gap-1 overflow-x-auto border-b border-ink/15 [scrollbar-width:none]">
          {TABS.map(([id, label]) => {
            const n = id === 'listed' ? listedRecent.length : null
            return (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === id ? 'border-brand text-ink' : 'border-transparent text-ink/60 hover:text-ink'}`}>
                {label}{n !== null && <span className="num ml-1.5 text-xs text-ink/50">{n}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4" role="tabpanel">
          {tab === 'listed' && <IpoTable rows={listedRecent} columns="listed" caption="Recently listed IPOs" />}
          {tab === 'all' && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 basis-56 text-xs text-ink/60">
                  Search
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company or NSE symbol"
                    className="mt-1 block w-full rounded-sm border border-ink/20 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
                </label>
                <label className="text-xs text-ink/60">
                  Board
                  <select value={board} onChange={(e) => setBoard(e.target.value)} className="mt-1 block rounded-sm border border-ink/20 bg-panel px-2 py-2 text-sm text-ink">
                    <option value="all">All</option><option value="mainboard">Mainboard</option><option value="sme">SME</option>
                  </select>
                </label>
                <label className="text-xs text-ink/60">
                  Year
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 block rounded-sm border border-ink/20 bg-panel px-2 py-2 text-sm text-ink">
                    <option value="all">All years</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
                <label className="text-xs text-ink/60">
                  Sort by
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 block rounded-sm border border-ink/20 bg-panel px-2 py-2 text-sm text-ink">
                    <option value="newest">Newest first</option><option value="size">Issue size</option><option value="sub">Subscription</option><option value="gain">Listing gain</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Issues in this view" value={fmt.inr(stats.count, 0)} sub={`${stats.main} mainboard, ${stats.sme} SME`} />
                <Kpi label="Median listing gain" value={fmt.pct(stats.medianGain)} sub={stats.n ? `across ${stats.n} listings with price data` : 'no listing prices yet'} />
                <Kpi label="Listed above issue price" value={stats.positiveShare === null ? '—' : `${fmt.inr(stats.positiveShare, 0)}%`} />
                <div className="bg-panel p-4 text-xs">
                  <p className="text-ink/60">Best and worst listings</p>
                  {stats.best.map((i) => <p key={i.slug} className="mt-1 flex justify-between gap-2"><Link to={`/ipos/${i.slug}`} className="truncate hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link><span className={`num ${gainClass(i.listingGainPct)}`}>{fmt.pct(i.listingGainPct)}</span></p>)}
                  {stats.worst.slice(0, 2).map((i) => <p key={i.slug} className="mt-1 flex justify-between gap-2"><Link to={`/ipos/${i.slug}`} className="truncate hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link><span className={`num ${gainClass(i.listingGainPct)}`}>{fmt.pct(i.listingGainPct)}</span></p>)}
                </div>
              </div>

              <div className="mt-4">
                <IpoTable rows={filtered.slice(0, page * PAGE)} columns="all" caption="All IPOs" empty="No IPOs match. Clear the search or filters." />
                {filtered.length > page * PAGE && (
                  <button type="button" onClick={() => setPage((p) => p + 1)} className="mt-4 w-full rounded-sm border border-ink/20 py-2.5 text-sm font-semibold hover:border-brand">
                    Show {Math.min(PAGE, filtered.length - page * PAGE)} more of {fmt.inr(filtered.length - page * PAGE, 0)}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
    </div>
  )
}
