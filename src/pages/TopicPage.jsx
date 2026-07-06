import { useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import NotFound from './NotFound.jsx'
import { getTopic, getByTopic, sectionColorMap } from '../data/content.js'

export default function TopicPage() {
  const { slug } = useParams()
  const topic = getTopic(slug)
  useSeo({
    title: topic ? topic.name : 'Topic not found',
    description: topic ? topic.description : undefined,
  })

  if (!topic) return <NotFound />

  const items = getByTopic(slug)
  const colors = sectionColorMap[slug] || sectionColorMap.blogs

  return (
    <>
      <section className={`border-b border-ink/10 ${colors.bgLight}`}>
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}>
            Topic · {items.length} {items.length === 1 ? 'article' : 'articles'}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{topic.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-ink/70">{topic.description}</p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        {items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-white p-10 text-center">
            <p className="font-display text-lg font-semibold">Nothing tagged here yet</p>
            <p className="mt-1 text-sm text-ink/60">New stories under {topic.name} are on the way.</p>
          </div>
        )}
      </section>
    </>
  )
}
