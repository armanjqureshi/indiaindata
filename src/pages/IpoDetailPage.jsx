import { useParams, Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import NotFound from './NotFound.jsx'
import {
  getIpo,
  getIpoStatus,
  getArticlesForIpo,
  sectionColorMap,
} from '../data/content.js'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function IpoDetailPage() {
  const { slug } = useParams()
  const ipo = getIpo(slug)
  useSeo({
    title: ipo ? `${ipo.companyName} IPO` : 'IPO not found',
    description: ipo ? ipo.description : undefined,
  })

  if (!ipo) return <NotFound />

  const status = getIpoStatus(ipo.status)
  const colors = sectionColorMap[status?.color] || sectionColorMap.news
  const dirColor = ipo.direction === 'up' ? 'text-up' : ipo.direction === 'down' ? 'text-down' : ''
  const related = getArticlesForIpo(ipo, 4)

  return (
    <>
      <header className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="mb-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white`}
            >
              {status?.name}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {ipo.companyName}
          </h1>
          <p className="mt-2 text-base text-ink/60">
            {ipo.sector}
            <span className="mx-1.5" aria-hidden="true">•</span>
            {ipo.exchange}
          </p>

          {ipo.status === 'listed' && (
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div>
                <p className="font-display text-4xl font-semibold leading-none sm:text-5xl">
                  {ipo.currentPrice}
                </p>
                <p className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${dirColor}`}>
                  {ipo.direction === 'up' && <span aria-hidden="true">▲</span>}
                  {ipo.direction === 'down' && <span aria-hidden="true">▼</span>}
                  {ipo.currentGain} since issue price of {ipo.issuePrice}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-ink/10 bg-white p-6 shadow-sm sm:grid-cols-4">
          <Fact label="Price band" value={ipo.priceBand} />
          <Fact label="Issue price" value={ipo.issuePrice} />
          <Fact label="Listing price" value={ipo.listingPrice} />
          <Fact label="Listing gain" value={ipo.listingGain} />
          <Fact label="Issue size" value={ipo.issueSize} />
          <Fact label="Lot size" value={ipo.lotSize} />
          <Fact label="Subscription" value={ipo.subscriptionTimes} />
          <Fact
            label={ipo.status === 'listed' ? 'Listing date' : ipo.status === 'upcoming' ? 'Opens' : 'Closes'}
            value={formatDate(ipo.status === 'listed' ? ipo.listingDate : ipo.status === 'upcoming' ? ipo.openDate : ipo.closeDate)}
          />
        </div>

        {ipo.chart ? (
          <div className="mt-8">
            <ChartCard chart={ipo.chart} sectionSlug={status?.color || 'news'} />
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-ink/20 bg-white p-6 text-center text-sm text-ink/50">
            A price chart will appear here once {ipo.companyName} starts trading.
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">About the company</h2>
            <p className="mt-2 text-sm leading-normal text-ink/70">{ipo.description}</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Key facts</h2>
            <ul className="mt-2 space-y-2 text-sm leading-normal text-ink/70">
              {ipo.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                  {h}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink/50">Source: {ipo.source}</p>
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
