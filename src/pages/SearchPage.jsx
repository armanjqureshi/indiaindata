import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import { articles } from '../data/content.js'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()

  // The prerendered version of this page always shows the empty state (no
  // query is known ahead of time). Starting client state at '' too, then
  // picking up any ?q= from the real URL in an effect (which only runs after
  // hydration completes), keeps the very first client render identical to
  // the server-rendered HTML — otherwise a direct visit to a shared
  // /search?q=... link would mismatch and React would have to discard and
  // re-render the whole page.
  const [query, setQuery] = useState('')

  useEffect(() => {
    const q = params.get('q')
    if (q) setQuery(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useSeo({
    title: 'Search',
    description: 'Search across every article, chart and dataset on India in Data.',
  })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return articles.filter((a) => {
      const haystack = [a.title, a.dek, a.section, ...a.topics, a.author.name]
        .join(' ')
        .toLowerCase()
      return q.split(/\s+/).every((word) => haystack.includes(word))
    })
  }, [query])

  const onChange = (v) => {
    setQuery(v)
    setParams(v.trim() ? { q: v } : {}, { replace: true })
  }

  return (
    <>
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Search</h1>
          <div className="mt-6 max-w-2xl">
            <label htmlFor="search-input" className="sr-only">
              Search across articles, charts and datasets
            </label>
            <input
              id="search-input"
              type="search"
              autoFocus
              value={query}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search across articles, charts and datasets"
              className="w-full rounded-md border border-ink/20 bg-paper px-4 py-3 text-base outline-none transition-colors focus:border-brand"
            />
          </div>
          <p role="status" className="mt-3 text-sm text-ink/60">
            {query.trim()
              ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for \u201C${query.trim()}\u201D`
              : 'Type to search titles, deks, topics and authors.'}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
        {query.trim() && results.length === 0 && (
          <div className="rounded-lg border border-ink/10 bg-white p-10 text-center">
            <p className="font-display text-lg font-semibold">No matches found</p>
            <p className="mt-1 text-sm text-ink/60">
              Try a broader term — for example &ldquo;inflation&rdquo;, &ldquo;Nifty&rdquo; or &ldquo;manufacturing&rdquo;.
            </p>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </section>
    </>
  )
}
