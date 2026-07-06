import { Link } from 'react-router-dom'
import CategoryChip from './CategoryChip.jsx'
import CardCover from './CardCover.jsx'
import { formatDate, sectionColorMap } from '../data/content.js'

// Reusable article card. Variants:
//  - "default": grid card (cover, chip, title, dek, byline)
//  - "large":   featured hero card (bigger type)
//  - "wide":    text-forward horizontal card for Blogs
export default function ArticleCard({ article, variant = 'default' }) {
  const colors = sectionColorMap[article.section]

  if (variant === 'wide') {
    return (
      <article
        className={`group grid gap-0 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:${colors.border} sm:grid-cols-[2fr_3fr]`}
      >
        <Link to={`/article/${article.slug}`} aria-hidden="true" tabIndex={-1} className="block">
          <CardCover article={article} tall />
        </Link>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip slug={article.section} small />
            {article.topics.map((t) => (
              <CategoryChip key={t} slug={t} small />
            ))}
          </div>
          <h3 className="font-display text-xl font-semibold leading-snug sm:text-2xl">
            <Link
              to={`/article/${article.slug}`}
              className={`transition-colors group-hover:${colors.text} focus-visible:underline`}
            >
              {article.title}
            </Link>
          </h3>
          <p className="text-sm leading-body text-ink/70">{article.dek}</p>
          <Byline article={article} withBioHint />
        </div>
      </article>
    )
  }

  const isLarge = variant === 'large'
  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:${colors.border}`}
    >
      <Link to={`/article/${article.slug}`} aria-hidden="true" tabIndex={-1} className="block">
        <CardCover article={article} tall={isLarge} />
      </Link>
      <div className={`flex flex-1 flex-col gap-2.5 ${isLarge ? 'p-6 sm:p-8' : 'p-5'}`}>
        <div>
          <CategoryChip slug={article.section} small={!isLarge} />
        </div>
        <h3
          className={`font-display font-semibold leading-snug ${
            isLarge ? 'text-2xl sm:text-3xl' : 'text-lg'
          }`}
        >
          <Link
            to={`/article/${article.slug}`}
            className="transition-colors focus-visible:underline group-hover:text-brand-dark"
          >
            {article.title}
          </Link>
        </h3>
        <p className={`leading-body text-ink/70 ${isLarge ? 'text-base' : 'text-sm'} line-clamp-2`}>
          {article.dek}
        </p>
        <div className="mt-auto pt-2">
          <Byline article={article} />
        </div>
      </div>
    </article>
  )
}

function Byline({ article, withBioHint = false }) {
  const { name, avatar } = article.author
  return (
    <div className="flex items-center gap-2.5 text-xs text-ink/60">
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-[10px] font-bold text-brand"
        >
          {name
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </span>
      )}
      <div>
        <span className="font-medium text-ink/80">{name}</span>
        <span className="mx-1.5" aria-hidden="true">
          •
        </span>
        <time dateTime={article.date}>{formatDate(article.date)}</time>
        {withBioHint && (
          <>
            <span className="mx-1.5" aria-hidden="true">
              •
            </span>
            {article.readingTime} min read
          </>
        )}
      </div>
    </div>
  )
}
