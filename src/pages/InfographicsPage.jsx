import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import { INFOGRAPHICS } from '../infographics/registry.js'
import { fmt } from '../data/live.js'

export default function InfographicsPage() {
  useSeo({
    title: 'Infographics: India in data, one picture at a time',
    description: 'Designed, shareable infographics on India’s markets, economy and society, built from official data. Download the image or embed it with credit.',
  })
  const items = [...INFOGRAPHICS].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Infographics</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            One idea per picture, built from official data. Each one comes with its source and the data table. Download the image or embed it, with credit to India in Data.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 pt-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <Link key={i.slug} to={`/infographics/${i.slug}`} className="group block overflow-hidden rounded-sm border border-ink/10 bg-panel hover:border-brand">
              <div className="aspect-[1200/630] w-full overflow-hidden bg-ink/5">
                <img src={i.ogImage} alt="" width="1200" height="630" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-brand">{i.topic}</p>
                <h2 className="mt-1 font-display text-xl font-semibold leading-snug group-hover:text-brand">{i.short}</h2>
                <p className="mt-2 text-sm leading-body text-ink/70">{i.dek}</p>
                <p className="num mt-3 text-xs text-ink/50">{fmt.date(i.date)}</p>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-sm leading-body text-ink/60">
          More are on the way: markets, the economy, and state-level data on crime, schools and food. Suggest a topic at the <Link to="/contact" className="text-brand hover:underline">contact page</Link>.
        </p>
      </section>
    </>
  )
}
