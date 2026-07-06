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
} from '../data/content.js'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
} from 'recharts'

const HERO_SERIES = [
  { x: '2016', v: 22 },
  { x: '2017', v: 31 },
  { x: '2018', v: 29 },
  { x: '2019', v: 38 },
  { x: '2020', v: 34 },
  { x: '2021', v: 52 },
  { x: '2022', v: 58 },
  { x: '2023', v: 71 },
  { x: '2024', v: 83 },
  { x: '2025', v: 96 },
]

function Hero() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const go = () => navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')

  return (
    <section className="border-b border-ink/10 bg-white">
      <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[3fr_2fr] lg:py-20">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
            Understanding India
            <br />
            through <span className="text-brand">data</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-body text-ink/70 sm:text-lg">
            Chart-led stories on India&rsquo;s news, business, markets and economy — written in plain
            language, anchored in the numbers.
          </p>
          <div className="mt-7 flex max-w-xl gap-2">
            <label htmlFor="hero-search" className="sr-only">
              Search across articles, charts and datasets
            </label>
            <input
              id="hero-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="Search across articles, charts and datasets"
              className="w-full rounded-md border border-ink/20 bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
            />
            <button
              type="button"
              onClick={go}
              className="shrink-0 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Search
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="hidden lg:block">
          <div className="rounded-lg border border-ink/10 bg-paper p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              India, one line at a time
            </p>
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HERO_SERIES} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#1A1A1A99' }} tickLine={false} axisLine={false} interval={2} />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#0E6E6E"
                    strokeWidth={2.5}
                    fill="#0E6E6E"
                    fillOpacity={0.12}
                    isAnimationActive
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-ink/50">A decade of stories, told in charts like this one.</p>
          </div>
        </div>
      </div>
    </section>
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
  const chartOfWeek = getArticle('nifty-decade-returns')

  return (
    <>
      <Hero />

      {/* Featured work */}
      <section className="mx-auto max-w-site px-4 py-12 sm:px-6">
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
        <SectionHeader title="Latest" description="The newest stories across every section." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
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
        <div className="rounded-lg bg-brand px-6 py-10 text-white sm:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                The week&rsquo;s most important charts, in your inbox
              </h2>
              <p className="mt-2 text-sm leading-body text-white/80 sm:text-base">
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
                className={`group rounded-lg border border-ink/10 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
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
