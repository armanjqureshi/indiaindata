import { useParams, Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import CategoryChip from '../components/CategoryChip.jsx'
import ChartCard from '../components/ChartCard.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import CardCover from '../components/CardCover.jsx'
import NotFound from './NotFound.jsx'
import { getArticle, getRelated, formatDate, sectionColorMap, getSection } from '../data/content.js'

const SHARE_ICONS = [
  {
    label: 'Share on X',
    icon: (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2Z" />
      </svg>
    ),
  },
  {
    label: 'Share on LinkedIn',
    icon: (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.24 8.25h4.52V23H.24V8.25ZM8.34 8.25h4.33v2.01h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.92V23h-4.51v-7.16c0-1.71-.03-3.91-2.38-3.91-2.39 0-2.75 1.86-2.75 3.78V23H8.34V8.25Z" />
      </svg>
    ),
  },
  {
    label: 'Copy link',
    icon: (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </svg>
    ),
  },
]

export default function ArticlePage() {
  const { slug } = useParams()
  const article = getArticle(slug)

  useSeo({
    title: article ? article.title : 'Article not found',
    description: article ? article.dek : undefined,
  })

  if (!article) return <NotFound />

  const colors = sectionColorMap[article.section]
  const section = getSection(article.section)
  const related = getRelated(article, 3)

  return (
    <article>
      {/* Header */}
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip slug={article.section} />
            {article.topics.map((t) => (
              <CategoryChip key={t} slug={t} small />
            ))}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg leading-body text-ink/70">{article.dek}</p>
          <div className="mt-6 flex items-center gap-3 text-sm text-ink/60">
            {article.author.avatar ? (
              <img src={article.author.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand"
              >
                {article.author.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
            )}
            <div>
              <p className="font-semibold text-ink">{article.author.name}</p>
              <p>
                <time dateTime={article.date}>{formatDate(article.date)}</time>
                <span className="mx-1.5" aria-hidden="true">•</span>
                {article.readingTime} min read
              </p>
            </div>
          </div>
        </div>
        {/* Hero visual */}
        <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
          <div className="overflow-hidden rounded-lg border border-ink/10">
            <CardCover article={article} tall />
          </div>
        </div>
      </header>

      {/* Body + sticky share */}
      <div className="mx-auto flex max-w-5xl gap-8 px-4 py-10 sm:px-6">
        {/* Sticky share buttons (visual only) */}
        <aside className="hidden w-12 shrink-0 md:block" aria-label="Share this article">
          <div className="sticky top-28 flex flex-col gap-2">
            {SHARE_ICONS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                className="rounded-md border border-ink/15 bg-white p-2.5 text-ink/60 transition-colors hover:border-brand hover:text-brand"
              >
                {s.icon}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 max-w-3xl flex-1">
          {article.body.map((block, i) => {
            if (block.type === 'paragraph') {
              return (
                <p key={i} className="mb-6 text-base leading-[1.75] text-ink/85 sm:text-lg">
                  {block.text}
                </p>
              )
            }
            if (block.type === 'heading') {
              return (
                <h2 key={i} className="mb-4 mt-10 font-display text-2xl font-semibold sm:text-3xl">
                  {block.text}
                </h2>
              )
            }
            if (block.type === 'quote') {
              return (
                <blockquote
                  key={i}
                  className={`my-8 border-l-4 ${colors.border} ${colors.bgLight} rounded-r-lg px-6 py-5 font-display text-xl font-medium leading-snug sm:text-2xl`}
                >
                  {block.text}
                </blockquote>
              )
            }
            if (block.type === 'chart') {
              const chart = article.charts[block.chartIndex]
              if (!chart) return null
              return (
                <div key={i} className="my-8">
                  <ChartCard chart={chart} sectionSlug={article.section} />
                </div>
              )
            }
            return null
          })}

          {/* Author bio */}
          <div className="mt-12 flex gap-4 rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            {article.author.avatar ? (
              <img src={article.author.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light text-base font-bold text-brand"
              >
                {article.author.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Written by</p>
              <p className="mt-0.5 font-display text-lg font-semibold">{article.author.name}</p>
              <p className="mt-1 text-sm leading-body text-ink/70">{article.author.bio}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              More from {section.name}
            </h2>
            <Link
              to={`/${article.section}`}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              View all
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
