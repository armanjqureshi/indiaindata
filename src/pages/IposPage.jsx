import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IpoCard from '../components/IpoCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { ipoStatuses, getIposByStatus, ipos } from '../data/content.js'

export default function IposPage() {
  useSeo({
    title: 'IPOs',
    description:
      "Upcoming, open, and recently listed IPOs on Indian exchanges, alongside performance history for past listings.",
  })

  const [sectorFilter, setSectorFilter] = useState(null)
  const sectors = useMemo(() => [...new Set(ipos.map((i) => i.sector))].sort(), [])

  const filtered = (status) => {
    const list = getIposByStatus(status)
    return sectorFilter ? list.filter((i) => i.sector === sectorFilter) : list
  }

  return (
    <>
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">IPOs</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            India&rsquo;s IPO pipeline, tracked
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-normal text-ink/70">
            {ipos.length} companies across upcoming, open, and recently listed offerings — price
            bands, subscription levels, and performance since listing.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by sector">
          <button
            type="button"
            onClick={() => setSectorFilter(null)}
            aria-pressed={sectorFilter === null}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              sectorFilter === null ? 'bg-ink text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
            }`}
          >
            All sectors
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
              aria-pressed={sectorFilter === s}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                sectorFilter === s ? 'bg-brand text-white' : 'bg-brand-light text-brand hover:brightness-95'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {ipoStatuses.map((status) => {
        const items = filtered(status.slug)
        if (items.length === 0) return null
        return (
          <section key={status.slug} className="mx-auto max-w-site px-4 py-8 sm:px-6">
            <SectionHeader title={status.name} colorSlug={status.color} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((ipo) => (
                <IpoCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          </section>
        )
      })}

      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-ink/10 bg-white p-6 text-sm leading-normal text-ink/60 shadow-sm">
          Values shown here are illustrative reference points, not live market data. Each IPO page
          lists its source. Have a correction, or an IPO to add?{' '}
          <Link to="/contact" className="font-semibold text-brand hover:text-brand-dark">
            Get in touch
          </Link>
          .
        </div>
      </section>
    </>
  )
}
