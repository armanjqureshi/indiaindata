import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarket, fmt } from '../data/live.js'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import StatBlock from '../components/StatBlock.jsx'
import NewsletterSignup from '../components/NewsletterSignup.jsx'
import CategoryChip from '../components/CategoryChip.jsx'
import DecoFan from '../components/DecoFan.jsx'
import TradingViewWidget, { TAPE_CONFIG, CHART_CONFIG } from '../components/TradingViewWidget.jsx'
import {
  getSection,
  getBySection,
  getArticle,
  topics as allTopics,
  sectionColorMap,
  formatDate,
} from '../data/content.js'

const PAGE_SIZE = 6

export default function SectionPage({ slug }) {
  const section = getSection(slug)
  useSeo({ title: section.name, description: section.description })

  const all = getBySection(slug)
  const [sort, setSort] = useState('latest')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [topicFilter, setTopicFilter] = useState(null)

  const colors = sectionColorMap[slug]
  const isBlogs = slug === 'blogs'
  const isMarket = slug === 'market'
  const market = useMarket()
  const isBusiness = slug === 'business'

  const items = useMemo(() => {
    let list = [...all]
    if (isBlogs && topicFilter) list = list.filter((a) => a.topics.includes(topicFilter))
    if (sort === 'mostRead') list.sort((a, b) => a.readingTime - b.readingTime)
    return list
  }, [all, sort, topicFilter, isBlogs])

  const shown = items.slice(0, visible)
  const trending = [...all].sort((a, b) => b.readingTime - a.readingTime).slice(0, 4)

  const embeddedChartArticle = isBusiness ? getBySection('business').find((a) => a.charts.length) : null
  const marketChartArticle = isMarket ? getBySection('market').find((a) => a.charts.length) : null

  return (
    <>
      {/* Section header */}
      {isMarket ? (
        <section className="deco-header">
          <DecoFan className="pointer-events-none absolute -bottom-2 right-4 hidden h-48 w-96 text-deco-gold opacity-60 sm:block lg:right-24 lg:h-60 lg:w-[30rem]" />
          <div className="relative mx-auto max-w-site px-4 pb-14 pt-12 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-deco-gold">
              Dalal Street &middot; Mumbai &middot; {all.length} articles
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold sm:text-6xl">{section.name}</h1>
            <p className="mt-3 max-w-xl text-base leading-body" style={{ color: 'rgb(var(--deco-ink) / 0.8)' }}>
              {section.description}
            </p>
          </div>
        </section>
      ) : (
      <section className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className={`text-xs font-semibold ${colors.text}`}>
            Section · {all.length} articles
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{section.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-ink/70">{section.description}</p>
        </div>
      </section>
      )}

      {/* Market ticker row */}
      {isMarket && (
        <section aria-label="Market snapshot" className="border-b border-ink/10 bg-panel">
          <div className="deco-band" aria-hidden="true" />
          <div className="mx-auto grid max-w-site grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4">
            {[['nifty-50', 'Nifty 50', 2], ['sensex', 'Sensex', 2], ['usd-inr', 'USD / INR (FBIL)', 4], ['india-vix', 'India VIX', 2]].map(([k, label, dp]) => {
              const it = market.items?.[k]
              if (!it) return null
              return (
                <div key={k} className="deco-tile">
                  <div className="deco-tile-in p-4">
                    <StatBlock value={fmt.inr(it.value, dp)} label={label}
                      sub={it.changePct === null ? '' : `${it.changePct > 0 ? '+' : ''}${fmt.inr(it.changePct, 2)}%`}
                      direction={it.change > 0 ? 'up' : it.change < 0 ? 'down' : undefined} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mx-auto max-w-site px-4 pb-2 sm:px-6">
            <p className="pb-3 text-xs text-ink/50">Closing levels on {fmt.date(market.session)}. Regular session 9:15 am to 3:30 pm IST, Monday to Friday. Updated automatically after each trading session. <Link to="/indicators" className="text-brand hover:underline">More market indicators</Link></p>
          </div>
        </section>
      )}

      {isMarket && (
        <section aria-label="Live markets" className="border-b border-ink/10">
          <div className="mx-auto max-w-site px-4 py-6 sm:px-6">
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-up" />
              <h2 className="font-display text-lg font-semibold">Live markets</h2>
            </div>
            <TradingViewWidget kind="ticker-tape" config={TAPE_CONFIG} height={78} label="Live market ticker" />
            <div className="mt-4">
              <TradingViewWidget kind="symbol-overview" config={CHART_CONFIG} height={420} label="Live index charts" />
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        {/* Featured markets chart */}
        {marketChartArticle && (
          <div className="mb-10">
            <ChartCard
              chart={marketChartArticle.charts[0]}
              sectionSlug="market"
              caption={
                <>
                  {marketChartArticle.dek}{' '}
                  <Link to={`/article/${marketChartArticle.slug}`} className="font-semibold text-brand hover:text-brand-dark">
                    Read the story →
                  </Link>
                </>
              }
            />
          </div>
        )}

        {/* Filter/sort row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Sort articles" className="flex gap-1 rounded-sm border border-ink/15 bg-panel p-1">
            {[
              { id: 'latest', label: 'Latest' },
              { id: 'mostRead', label: 'Quick reads' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSort(o.id)}
                aria-pressed={sort === o.id}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  sort === o.id ? 'bg-brand text-paper' : 'text-ink/60 hover:bg-ink/5'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Topic chips for Blogs */}
          {isBlogs && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by topic">
              <button
                type="button"
                onClick={() => setTopicFilter(null)}
                aria-pressed={topicFilter === null}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  topicFilter === null ? 'bg-ink text-paper' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
              >
                All topics
              </button>
              {allTopics.slice(0, 4).map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setTopicFilter(topicFilter === t.slug ? null : t.slug)}
                  aria-pressed={topicFilter === t.slug}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    topicFilter === t.slug
                      ? `${sectionColorMap[t.slug].bg} text-paper`
                      : `${sectionColorMap[t.slug].bgLight} ${sectionColorMap[t.slug].text} hover:brightness-95`
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          {/* Article grid */}
          <div>
            {isBlogs ? (
              <div className="flex flex-col gap-6">
                {shown.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="wide" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {shown.flatMap((a, i) => {
                  const card = <ArticleCard key={a.id} article={a} />
                  // Business: embed a ChartCard into the feed after the 2nd card
                  if (isBusiness && i === 1 && embeddedChartArticle) {
                    return [
                      card,
                      <div key="embedded-chart" className="sm:col-span-2">
                        <ChartCard
                          chart={embeddedChartArticle.charts[0]}
                          sectionSlug="business"
                          caption={
                            <>
                              From our audit of the factory floor.{' '}
                              <Link
                                to={`/article/${embeddedChartArticle.slug}`}
                                className="font-semibold text-brand hover:text-brand-dark"
                              >
                                Read the story →
                              </Link>
                            </>
                          }
                        />
                      </div>,
                    ]
                  }
                  return [card]
                })}
              </div>
            )}

            {shown.length === 0 && (
              <div className="rounded-sm border border-ink/10 bg-panel p-10 text-center">
                <p className="font-display text-lg font-semibold">No articles under this topic yet</p>
                <p className="mt-1 text-sm text-ink/60">Clear the filter to see everything in {section.name}.</p>
              </div>
            )}

            {visible < items.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-sm border border-ink/20 bg-panel px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Load more
                </button>
              </div>
            )}
          </div>

          {/* Right rail */}
          <aside className="hidden lg:block" aria-label="Sidebar">
            <div className="sticky top-24 flex flex-col gap-6">
              <div className="rounded-sm border border-ink/10 bg-panel p-5">
                <h2 className="font-display text-lg font-semibold">Trending in {section.name}</h2>
                <ol className="mt-4 space-y-4">
                  {trending.map((a, i) => (
                    <li key={a.id} className="flex gap-3">
                      <span aria-hidden="true" className={`font-display text-xl font-semibold ${colors.text}`}>
                        {i + 1}
                      </span>
                      <div>
                        <Link
                          to={`/article/${a.slug}`}
                          className="text-sm font-semibold leading-snug hover:text-brand"
                        >
                          {a.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink/50">{formatDate(a.date)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-sm border border-ink/10 bg-panel p-5">
                <h2 className="font-display text-lg font-semibold">The weekly brief</h2>
                <div className="mt-3">
                  <NewsletterSignup compact />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
