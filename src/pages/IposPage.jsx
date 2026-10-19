import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IpoTable from '../components/ipo/IpoTable.jsx'
import { useIpos, useTodayIST, ipoStatus, fetchLive, fmt, istDateOf } from '../data/live.js'
import { median, gainClass } from '../components/ipo/ipoUtil.js'

const TABS = [
  ['live', 'Open and upcoming'],
  ['closed', 'Awaiting listing'],
  ['listed', 'Recently listed'],
  ['all', 'All IPOs'],
]
const PAGE = 50

function addDays(iso, n) {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
}

function WeekCalendar({ ipos, today }) {
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i))
  const events = (d) => {
    const out = []
    for (const i of ipos) {
      const t = i.timetable || {}
      if (i.open === d) out.push(['Opens', i])
      if (i.close === d) out.push(['Closes', i])
      if (t.allotment === d) out.push(['Allotment', i])
      if ((i.listingDate || t.listing) === d) out.push([i.listingDate || !t.expected?.listing ? 'Lists' : 'Lists*', i])
    }
    return out
  }
  const withEvents = days.map((d) => [d, events(d)]).filter(([, e]) => e.length)
  if (!withEvents.length) return <p className="text-sm text-ink/60">No IPO dates in the next week.</p>
  return (
    <div className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
      {withEvents.slice(0, 8).map(([d, ev]) => (
        <div key={d} className="bg-panel p-3">
          <p className="num text-xs font-semibold text-ink/60">
            {d === today ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <ul className="mt-2 space-y-1.5">
            {ev.map(([what, i]) => (
              <li key={what + i.slug} className="flex items-baseline justify-between gap-2 text-sm">
                <Link to={`/ipos/${i.slug}`} className="truncate hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link>
                <span className={`shrink-0 text-[11px] font-semibold ${what.startsWith('Lists') ? 'text-blogs' : what === 'Opens' ? 'text-market' : what === 'Closes' ? 'text-economy' : 'text-ink/60'}`}>{what}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-panel p-4">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  )
}

export default function IposPage() {
  useSeo({
    title: 'IPO tracker: mainboard and SME IPOs',
    description:
      'Every mainboard and SME IPO on NSE: live subscription by category, price bands, lot sizes, timetables, listing gains and returns since listing. Updated through the day from NSE data.',
  })
  const data = useIpos()
  const today = useTodayIST(istDateOf(data.updatedAt))
  const [tab, setTab] = useState('live')
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

  const byStatus = (s) => ipos.filter((i) => i.status === s)
  const live = [...byStatus('open'), ...byStatus('upcoming').sort((a, b) => a.open.localeCompare(b.open))]
  const closed = byStatus('closed').sort((a, b) => (a.timetable?.listing || '').localeCompare(b.timetable?.listing || ''))
  const listedRecent = byStatus('listed').sort((a, b) => b.listingDate.localeCompare(a.listingDate)).slice(0, 30)

  const yearNow = (today || data.updatedAt || '2026').slice(0, 4)
  const ytd = ipos.filter((i) => i.open?.startsWith(yearNow))
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

  const listingSoon = ipos.filter((i) => {
    const l = i.listingDate || i.timetable?.listing
    return l && today && l >= today && l <= addDays(today, 7)
  }).length

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl">IPO tracker</h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-ink/70">
            Every mainboard and SME IPO on NSE, with subscription by investor category, price bands, lot
            sizes, timetables and how each issue has traded since listing. Figures come from NSE and
            refresh several times a day while issues are open.
          </p>
          <p className="num mt-3 text-xs text-ink/50">
            Updated {data.updatedAt ? new Date(data.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST' : '—'}
            {data.lastPriceSession ? `; prices as of the ${fmt.date(data.lastPriceSession)} close` : ''}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 lg:grid-cols-4">
          <Kpi label="Open for bidding" value={byStatus('open').length} />
          <Kpi label="Opening soon" value={byStatus('upcoming').length} />
          <Kpi label="Listing in the next 7 days" value={listingSoon} />
          <Kpi label={`IPOs in ${yearNow} so far`} value={ytd.length} sub={`${ytd.filter((i) => i.board === 'mainboard').length} mainboard, ${ytd.filter((i) => i.board === 'sme').length} SME`} />
        </div>
      </section>

      {today && (
        <section className="mx-auto max-w-site px-4 pt-8 sm:px-6">
          <h2 className="mb-3 text-lg font-bold">The week ahead</h2>
          <WeekCalendar ipos={ipos.filter((i) => i.status !== 'listed' || (i.listingDate && i.listingDate >= today))} today={today} />
          <p className="mt-2 text-xs text-ink/50">* Expected under SEBI’s T+3 timetable; confirmed when NSE announces the listing.</p>
        </section>
      )}

      <section className="mx-auto max-w-site px-4 py-8 sm:px-6">
        <div role="tablist" aria-label="IPO lists" className="flex gap-1 overflow-x-auto border-b border-ink/15 [scrollbar-width:none]">
          {TABS.map(([id, label]) => {
            const n = id === 'live' ? live.length : id === 'closed' ? closed.length : id === 'listed' ? listedRecent.length : null
            return (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === id ? 'border-brand text-ink' : 'border-transparent text-ink/60 hover:text-ink'}`}>
                {label}{n !== null && <span className="num ml-1.5 text-xs text-ink/50">{n}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4" role="tabpanel">
          {tab === 'live' && <IpoTable rows={live} columns="live" caption="Open and upcoming IPOs" empty="No IPOs are open or announced right now." />}
          {tab === 'closed' && <IpoTable rows={closed} columns="closed" caption="IPOs awaiting listing" empty="No issues are waiting to list." />}
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

              <div className="mt-4 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <section className="mx-auto max-w-site px-4 pb-12 sm:px-6">
        <div className="border-t border-ink/10 pt-4 text-xs leading-body text-ink/60">
          <p>
            Source: NSE public issue data, NSE end-of-day price files and NSE’s holiday calendar. Subscription
            figures combine bids on NSE and BSE as NSE reports them. Listing price is the opening price on
            listing day, set in the special pre-open session. {data.coverage}
          </p>
          <p className="mt-2">This is information, not investment advice. Check the red herring prospectus before applying.</p>
        </div>
      </section>
    </>
  )
}
