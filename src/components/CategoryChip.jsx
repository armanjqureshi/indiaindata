import { Link } from 'react-router-dom'
import { sectionColorMap, getSection, getTopic } from '../data/content.js'

export default function CategoryChip({ slug, small = false, asLink = true }) {
  const meta = getSection(slug) || getTopic(slug)
  const colors = sectionColorMap[slug] || sectionColorMap.blogs
  if (!meta) return null

  const cls = `inline-flex items-center gap-1.5 rounded-[2px] font-semibold ${colors.bgLight} ${colors.text} ${
    small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  }`
  const dot = <span aria-hidden="true" className={`h-1.5 w-1.5 ${colors.bg}`} />
  const to = getSection(slug) ? `/${slug}` : `/topic/${slug}`

  if (!asLink) {
    return (
      <span className={cls}>
        {dot}
        {meta.name}
      </span>
    )
  }
  return (
    <Link to={to} className={`${cls} transition-colors hover:brightness-95`}>
      {dot}
      {meta.name}
    </Link>
  )
}
