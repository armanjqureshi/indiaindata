import { Link } from 'react-router-dom'
import { sectionColorMap } from '../data/content.js'

export default function SectionHeader({ title, description, to, linkLabel = 'View all', colorSlug }) {
  const colors = colorSlug ? sectionColorMap[colorSlug] : null
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          {colors && <span aria-hidden="true" className={`mr-3 inline-block h-5 w-1.5 rounded-full align-[-2px] ${colors.bg}`} />}
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm leading-body text-ink/60 sm:text-base">{description}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
        >
          {linkLabel}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      )}
    </div>
  )
}
