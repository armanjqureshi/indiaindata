import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import NewsletterSignup from '../components/NewsletterSignup.jsx'
import {
  sections,
  getFeatured,
  getLatest,
  getBySection,
  getArticle,
  sectionColorMap,
  indicators,
  useIndicators,
  getIndicatorCategory,
  getSection,
  formatDate,
} from '../data/content.js'
const HERO_SLUGS = ['nifty-50','sensex','inr-usd','cpi-inflation','repo-rate','gdp-growth']

function BoardTile({ ind }) {
  const cat = getIndicatorCategory(ind.category)
  const colors = sectionColorMap[cat?.color] || sectionColorMap.economy
  const dir = ind.direction === 'up' ? 'text-up' : ind.direction === 'down' ? 'text-down' : 'text-ink/60'
  const key = ind.chart.dataKeys[0]
  const vals = ind.chart.data.map((d) => Number(d[key]) || 0)
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${28 - ((v - min) / r) * 24}`).join(' ')
  return (
    <Link to={`/indicators/${ind.slug}`} className="group flex flex-col gap-1 bg-panel p-3 transition-colors hover:bg-raise">
      <span className="truncate text-xs text-ink/60 group-hover:text-ink">{ind.name}</span>
      <span className={`num font-semibold leading-tight ${ind.currentValue.length > 8 ? "text-base" : "text-xl"}`}>{ind.currentValue}</span>
      <span className={`num text-xs ${dir}`}>
        {ind.direction === 'up' ? '▲' : ind.direction === 'down' ? '▼' : ''} {ind.change}
      </span>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1 h-6 w-full" aria-hidden="true">
        <polyline points={pts} fill="none" stroke={colors.hex} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </Link>
  )
}

function Hero() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const go = () => navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  const all = useIndicators()
  const board = HERO_SLUGS.map((slug) => all.find((i) => i.slug === slug)).filter(Boolean)

  return (
    <section className="jaali border-b border-ink/10">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[5fr_6fr] lg:items-center lg:py-16">
        <div>
          <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
            India&rsquo;s numbers, read plainly.
          </h1>
          <p className="mt-4 max-w-md text-base leading-body text-ink/70">
            Every story starts with a chart and a source. Track the indicators, follow the IPOs, and
            read what the data says about news, business and markets.
          </p>
          <div className="mt-7 flex max-w-md gap-2">
            <label htmlFor="hero-search" className="sr-only">
              Search articles, indicators and IPOs
            </label>
            <input
              id="hero-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="Search articles, indicators, IPOs"
              className="w-full rounded-sm border border-ink/20 bg-panel px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
            />
            <button
              type="button"
              onClick={go}
              className="shrink-0 rounded-sm bg-brand px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brand-dark"
            >
              Search
            </button>
          </div>
        </div>
        <div className="arch-top bg-brand pt-[3px]">
          <div className="arch-top bg-panel px-4 pb-4 pt-12 sm:px-6">
            <div className="mb-3 text-center">
              <h2 className="font-display text-base font-bold">Key indicators</h2>
              <Link to="/indicators" className="text-xs font-semibold text-brand hover:underline">
                All {indicators.length} indicators
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 sm:grid-cols-3">
              {board.map((ind) => (
                <BoardTile key={ind.slug} ind={ind} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LatestRow({ a }) {
  const colors = sectionColorMap[a.section]
  return (
    <li className="border-b border-ink/10">
      <Link
        to={`/article/${a.slug}`}
        className="group grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 py-3 sm:grid-cols-[6.5rem_6rem_1fr_auto]"
      >
        <time className="num text-xs text-ink/50" dateTime={a.date}>{formatDate(a.date)}</time>
        <span className={`text-xs font-semibold ${colors.text}`}>{getSection(a.section)?.name}</span>
        <span className="col-span-2 font-semibold leading-snug group-hover:text-brand sm:col-span-1">{a.title}</span>
        <span className="num hidden text-xs text-ink/50 sm:block">{a.readingTime} min</span>
      </Link>
    </li>
  )
}

export default function Home() {
  useSeo({
    title: 'Understanding India through data',
    description:
      'Chart-led stories on India\u2019s news, business, markets and economy. Every piece anchored by a chart or a stat.',
  })

  const featured = getFeatured().slice(0, 3)
  const latest = getLatest(9)
  const chartOfWeek = getLatest(50).find((a) => a.chartOfWeek && a.charts.length) || getFeatured().find((a) => a.charts.length)

  return (
    <>
      <Hero />

      {/* Featured work */}
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader
          title="Featured work"
          description="Hand-picked pieces from across our sections."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {featured[0] && <ArticleCard article={featured[0]} variant="large" />}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            {featured.slice(1, 3).map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Latest */}
      <section className="mx-auto max-w-site px-4 py-8 sm:px-6">
        <SectionHeader title="Latest" description="Newest stories across every section." />
        <ul className="border-t border-ink/10">
          {latest.map((a) => (
            <LatestRow key={a.id} a={a} />
          ))}
        </ul>
      </section>

      {/* Chart of the week */}
      {chartOfWeek && (
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <SectionHeader
            title="Chart of the week"
            description="One chart, and the story it tells."
            to={`/article/${chartOfWeek.slug}`}
            linkLabel="Read the full story"
          />
          <ChartCard
            chart={chartOfWeek.charts[0]}
            sectionSlug={chartOfWeek.section}
            caption={chartOfWeek.dek}
          />
        </section>
      )}

      {/* Section clusters */}
      {sections.map((s) => {
        const items = getBySection(s.slug).slice(0, 3)
        return (
          <section key={s.slug} className="mx-auto max-w-site px-4 py-8 sm:px-6">
            <SectionHeader
              title={s.name}
              description={s.description}
              to={`/${s.slug}`}
              colorSlug={s.slug}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )
      })}

      {/* Newsletter band */}
      <section id="newsletter" className="mx-auto max-w-site scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="jaali jaali-soft arch-top bg-brand px-6 pb-10 pt-16 text-paper sm:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                The week&rsquo;s most important charts, in your inbox
              </h2>
              <p className="mt-2 text-sm leading-body text-paper/80 sm:text-base">
                A short, free weekly brief: the data behind India&rsquo;s biggest stories, with no noise
                and no paywall.
              </p>
            </div>
            <NewsletterSignup compact inverse />
          </div>
        </div>
      </section>

      {/* Explore all sections */}
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader
          title="Explore all sections"
          description="Our full range of stories, organised by section."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => {
            const colors = sectionColorMap[s.slug]
            const count = getBySection(s.slug).length
            return (
              <Link
                key={s.slug}
                to={`/${s.slug}`}
                className={`group rounded-sm border border-ink/10 bg-panel p-6`}
              >
                <p className={`text-xs font-semibold ${colors.text}`}>
                  {count} {count === 1 ? 'article' : 'articles'}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold group-hover:text-brand-dark">
                  {s.name}
                </h3>
                <p className="mt-1.5 text-sm leading-body text-ink/60">{s.description}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
