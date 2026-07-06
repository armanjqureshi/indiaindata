import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IndicatorCard from '../components/IndicatorCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { indicatorCategories, getIndicatorsByCategory, indicators } from '../data/content.js'

export default function IndicatorsPage() {
  useSeo({
    title: 'Indicators',
    description:
      "India's key economic and market indicators, tracked in one place — prices, growth, employment, monetary policy, trade, public finance, markets and real-time proxies.",
  })

  return (
    <>
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Indicators</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            India&rsquo;s vital signs, in one place
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-normal text-ink/70">
            {indicators.length} indicators tracked across prices, growth, employment, monetary
            policy, trade, public finance, markets and real-time proxies — each with its current
            reading, direction, and full history.
          </p>
        </div>
      </section>

      {indicatorCategories.map((cat) => {
        const items = getIndicatorsByCategory(cat.slug)
        if (items.length === 0) return null
        return (
          <section key={cat.slug} className="mx-auto max-w-site px-4 py-8 sm:px-6">
            <SectionHeader
              title={cat.name}
              to={`/indicators/category/${cat.slug}`}
              linkLabel="View category"
              colorSlug={cat.color}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((ind) => (
                <IndicatorCard key={ind.slug} indicator={ind} />
              ))}
            </div>
          </section>
        )
      })}

      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-ink/10 bg-white p-6 text-sm leading-normal text-ink/60 shadow-sm">
          Values shown here are illustrative reference points, updated periodically — not a live
          market or data feed. Each indicator page lists its official source and release schedule.
          Have a correction or a source to suggest? <Link to="/contact" className="font-semibold text-brand hover:text-brand-dark">Get in touch</Link>.
        </div>
      </section>
    </>
  )
}
