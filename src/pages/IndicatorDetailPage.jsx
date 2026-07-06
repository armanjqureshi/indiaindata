import { useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import NotFound from './NotFound.jsx'
import {
  getIndicator,
  getIndicatorCategory,
  getArticlesForIndicator,
  sectionColorMap,
} from '../data/content.js'

export default function IndicatorDetailPage() {
  const { slug } = useParams()
  const indicator = getIndicator(slug)
  useSeo({
    title: indicator ? indicator.name : 'Indicator not found',
    description: indicator ? indicator.description : undefined,
  })

  if (!indicator) return <NotFound />

  const category = getIndicatorCategory(indicator.category)
  const colors = sectionColorMap[category?.color] || sectionColorMap.economy
  const dirColor = indicator.direction === 'up' ? 'text-up' : indicator.direction === 'down' ? 'text-down' : ''
  const related = getArticlesForIndicator(indicator, 4)
  const asOfLabel = new Date(indicator.asOf + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <header className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          {category && (
            <div className="mb-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white`}
              >
                {category.name}
              </span>
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {indicator.name}
          </h1>

          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <p className="font-display text-4xl font-semibold leading-none sm:text-5xl">
                {indicator.currentValue}
              </p>
              <p className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${dirColor}`}>
                {indicator.direction === 'up' && <span aria-hidden="true">▲</span>}
                {indicator.direction === 'down' && <span aria-hidden="true">▼</span>}
                {indicator.change}
                <span className="ml-1 font-normal text-ink/50">from {indicator.previousValue}</span>
              </p>
            </div>
            <p className="pb-1 text-sm text-ink/60">
              As of {asOfLabel}
              <span className="mx-1.5" aria-hidden="true">•</span>
              {indicator.frequency}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ChartCard chart={indicator.chart} sectionSlug={category?.color || 'economy'} />

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">What this measures</h2>
            <p className="mt-2 text-sm leading-normal text-ink/70">{indicator.description}</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Source & release schedule</h2>
            <p className="mt-2 text-sm leading-normal text-ink/70">
              <span className="font-semibold text-ink">{indicator.source}</span>
              <br />
              {indicator.releaseSchedule}
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h2 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">
            Related stories on India in Data
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
