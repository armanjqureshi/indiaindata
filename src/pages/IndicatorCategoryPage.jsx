import { useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IndicatorCard from '../components/IndicatorCard.jsx'
import NotFound from './NotFound.jsx'
import { getIndicatorCategory, getIndicatorsByCategory, sectionColorMap } from '../data/content.js'

export default function IndicatorCategoryPage() {
  const { slug } = useParams()
  const category = getIndicatorCategory(slug)
  useSeo({
    title: category ? `${category.name} indicators` : 'Category not found',
    description: category
      ? `India's ${category.name.toLowerCase()} indicators — current values, direction, and full history.`
      : undefined,
  })

  if (!category) return <NotFound />

  const items = getIndicatorsByCategory(slug)
  const colors = sectionColorMap[category.color] || sectionColorMap.economy

  return (
    <>
      <section className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}>
            Indicators · {items.length} tracked
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{category.name}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((ind) => (
              <IndicatorCard key={ind.slug} indicator={ind} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-white p-10 text-center">
            <p className="font-display text-lg font-semibold">Nothing tracked here yet</p>
          </div>
        )}
      </section>
    </>
  )
}
