import { Link } from 'react-router-dom'
import { sectionColorMap } from '../data/content.js'

export default function SectionHeader({ title, description, to, linkLabel = 'View all', colorSlug }) {
  const colors = colorSlug ? sectionColorMap[colorSlug] : null
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-double border-ink/25 pb-3">
      <div className="max-w-2xl">
        <h2 className="flex items-center gap-3 font-display text-xl font-bold sm:text-2xl">
          {colors && <span aria-hidden="true" className={`inline-block h-5 w-4 ${colors.bg}`} style={{ clipPath: 'url(#arch-sm)' }} />}
          {title}
        </h2>
        {description && <p className="mt-1 text-sm leading-body text-ink/60">{description}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-brand transition-colors hover:text-brand-dark hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
