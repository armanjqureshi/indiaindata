import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import StatBlock from '../components/StatBlock.jsx'
import NewsletterSignup from '../components/NewsletterSignup.jsx'
import CategoryChip from '../components/CategoryChip.jsx'
import {
  getSection,
  getBySection,
  getArticle,
  marketTickers,
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
  const isBusiness = slug === 'business'

  const items = useMemo(() => {
    let list = [...all]
    if (isBlogs && topicFilter) list = list.filter((a) => a.topics.includes(topicFilter))
    if (sort === 'mostRead') list.sort((a, b) => a.readingTime - b.readingTime) // demo proxy
    return list
  }, [all, sort, topicFilter, isBlogs])

  const shown = items.slice(0, visible)
  const trending = [...all].sort((a, b) => b.readingTime - a.readingTime).slice(0, 4)

  const embeddedChartArticle = isBusiness ? getArticle('manufacturing-output-sectors') : null
  const marketChartArticle = isMarket ? getArticle('nifty-decade-returns') : null

  return (
    <>
      {/* Section header */}
      <section className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}>
            Section · {all.length} articles
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{section.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-ink/70">{section.description}</p>
        </div>
      </section>

      {/* Market ticker row */}
      {isMarket && (
        <section aria-label="Market snapshot" className="border-b border-ink/10 bg-white">
          <div className="mx-auto grid max-w-site grid-cols-2 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-4">
            {marketTickers.map((t) => (
              <StatBlock key={t.label} value={t.value} sub={t.change} direction={t.direction} label={t.label} />
            ))}
          </div>
          <div className="mx-auto max-w-site px-4 pb-2 sm:px-6">
            <p className="pb-3 text-xs text-ink/40">Demo values — live feeds arrive in phase 2.</p>
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
          <div role="group" aria-label="Sort articles" className="flex gap-1 rounded-md border border-ink/15 bg-white p-1">
            {[
              { id: 'latest', label: 'Latest' },
              { id: 'mostRead', label: 'Most read' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSort(o.id)}
                aria-pressed={sort === o.id}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  sort === o.id ? 'bg-brand text-white' : 'text-ink/60 hover:bg-ink/5'
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
                  topicFilter === null ? 'bg-ink text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
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
                      ? `${sectionColorMap[t.slug].bg} text-white`
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
              <div className="rounded-lg border border-ink/10 bg-white p-10 text-center">
                <p className="font-display text-lg font-semibold">No articles under this topic yet</p>
                <p className="mt-1 text-sm text-ink/60">Clear the filter to see everything in {section.name}.</p>
              </div>
            )}

            {visible < items.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-md border border-ink/20 bg-white px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Load more
                </button>
              </div>
            )}
          </div>

          {/* Right rail */}
          <aside className="hidden lg:block" aria-label="Sidebar">
            <div className="sticky top-24 flex flex-col gap-6">
              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
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
              <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
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
