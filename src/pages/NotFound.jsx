import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'

export default function NotFound() {
  useSeo({ title: 'Page not found', description: 'This page does not exist on India in Data.' })
  return (
    <section className="mx-auto max-w-site px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-semibold text-brand">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold">This page isn&rsquo;t in our dataset</h1>
      <p className="mt-2 text-ink/60">The link may be outdated, or the page may have moved.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Back to the homepage
      </Link>
    </section>
  )
}
