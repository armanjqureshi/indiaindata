import useSeo from '../components/Seo.jsx'
import { CONTACT_EMAIL } from '../data/site.js'

const TOPICS = [
  ['Corrections', 'Spotted a wrong figure? Send the page address and the source you checked.', 'Correction: '],
  ['Story tips and data requests', 'Tell us what you think the data should cover.', 'Story tip: '],
  ['Licensing and reuse', 'Commercial use of our charts or datasets.', 'Licensing: '],
]

export default function Contact() {
  useSeo({
    title: 'Contact',
    description: 'Email India in Data about corrections, story tips, data requests or licensing.',
  })

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Contact</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Corrections, story tips, dataset requests or licensing questions. Email us directly.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-sm border border-ink/10 bg-panel p-6 sm:p-8">
          <p className="text-sm text-ink/60">Email</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-1 block break-all font-display text-2xl font-semibold text-brand hover:underline sm:text-3xl"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-4 text-sm leading-body text-ink/70">
            This is a small team, so replies can take a few days. Please include the page address if you are writing about a figure.
          </p>
        </div>

        <ul className="mt-8 space-y-4">
          {TOPICS.map(([t, d, prefix]) => (
            <li key={t} className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-body text-ink/70">{d}</p>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(prefix)}`}
                className="shrink-0 rounded-sm border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-paper"
              >
                Write
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
