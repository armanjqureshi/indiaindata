import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IndicatorCard from '../components/IndicatorCard.jsx'
import { indicatorCategories, useIndicators } from '../data/content.js'

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}
// Relative move between previous and current reading, used for "Biggest mover".
const movePct = (i) => {
  const c = num(i.currentValue)
  const p = num(i.previousValue)
  if (c === null || p === null || p === 0) return 0
  return Math.abs((c - p) / p)
}

const SORTS = [
  { id: 'default', label: 'Verified first' },
  { id: 'mover', label: 'Biggest mover' },
  { id: 'recent', label: 'Most recent' },
  { id: 'name', label: 'Name A to Z' },
]

export default function IndicatorsPage() {
  useSeo({
    title: 'Indicators',
    description:
      "India's key economic and market indicators in one marketplace: inflation, growth, rates, FPI flows, currencies, commodities, markets and more.",
  })

  const indicators = useIndicators()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('default')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [watch, setWatch] = useState([])

  useEffect(() => {
    try {
      setWatch(JSON.parse(localStorage.getItem('iid-watchlist') || '[]'))
    } catch (e) {}
  }, [])
  const toggleWatch = (slug) =>
    setWatch((w) => {
      const next = w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug]
      try {
        localStorage.setItem('iid-watchlist', JSON.stringify(next))
      } catch (e) {}
      return next
    })

  const counts = useMemo(() => {
    const c = { all: indicators.length, watch: 0 }
    indicators.forEach((i) => (c[i.category] = (c[i.category] || 0) + 1))
    return c
  }, [indicators])
  counts.watch = indicators.filter((i) => watch.includes(i.slug)).length

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = indicators.filter((i) => {
      if (cat === 'watch' && !watch.includes(i.slug)) return false
      if (cat !== 'all' && cat !== 'watch' && i.category !== cat) return false
      if (verifiedOnly && i.verified === false) return false
      if (term && !`${i.name} ${i.description} ${i.source}`.toLowerCase().includes(term)) return false
      return true
    })
    if (sort === 'default')
      out = [...out].sort((a, b) => (a.verified === false) - (b.verified === false) || b.asOf.localeCompare(a.asOf))
    if (sort === 'mover') out = [...out].sort((a, b) => movePct(b) - movePct(a))
    if (sort === 'recent') out = [...out].sort((a, b) => b.asOf.localeCompare(a.asOf))
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [q, cat, sort, verifiedOnly, watch, indicators])

  const verifiedCount = indicators.filter((i) => i.verified !== false).length
  const chip = (id, label, count) => (
    <button
      key={id}
      type="button"
      onClick={() => setCat(id)}
      aria-pressed={cat === id}
      className={`shrink-0 rounded-sm border px-3 py-1.5 text-sm transition-colors ${
        cat === id
          ? 'border-brand bg-action font-semibold text-white'
          : 'border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink'
      }`}
    >
      {label} <span className="num ml-1 text-xs opacity-70">{count}</span>
    </button>
  )

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="text-4xl font-semibold sm:text-5xl">Indicator marketplace</h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-ink/70">
            Browse {indicators.length} indicators across inflation, growth, rates, flows, currencies,
            commodities and markets. {verifiedCount} are checked against a published source and
            carry a Verified tag. Star the ones you follow to build a watchlist on this device.
          </p>
          <div className="mt-6 max-w-xl">
            <label htmlFor="ind-search" className="sr-only">Search indicators</label>
            <input
              id="ind-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search indicators, e.g. FPI, rupee, inflation"
              className="w-full rounded-sm border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {chip('all', 'All', counts.all)}
          {chip('watch', 'Watchlist', counts.watch)}
          {indicatorCategories.map((c) => counts[c.slug] ? chip(c.slug, c.name, counts[c.slug]) : null)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3 text-sm">
          <p className="num text-ink/60" aria-live="polite">{list.length} shown</p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-ink/70">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-[rgb(var(--brand))]" />
              Verified only
            </label>
            <label className="flex items-center gap-2 text-ink/70">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-sm border border-ink/20 bg-panel px-2 py-1 text-ink">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="py-16 text-center text-ink/60">
            {cat === 'watch'
              ? 'Your watchlist is empty. Select the star on any indicator to add it.'
              : 'No indicators match. Clear the search or filters to see everything.'}
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((ind) => (
              <IndicatorCard key={ind.slug} indicator={ind} watched={watch.includes(ind.slug)} onToggleWatch={toggleWatch} />
            ))}
          </div>
        )}
        <p className="mt-10 border-t border-ink/10 pt-4 text-sm leading-body text-ink/60">
          Indicators marked Auto-updated refresh after each trading session from NSE, FBIL, IBJA, EIA and
          NSDL. The others are updated when new official releases come out; each page names its source. Spotted an error or want an indicator added? <Link to="/contact" className="font-semibold text-brand hover:text-brand-dark">Tell us</Link>.
        </p>
      </section>
    </>
  )
}
