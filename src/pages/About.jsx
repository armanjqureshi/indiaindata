import useSeo from '../components/Seo.jsx'
import StatBlock from '../components/StatBlock.jsx'
import { authors, getSiteStats } from '../data/content.js'

const SOURCING = [
  {
    title: 'Official statistics first',
    text: 'We start from the primary source wherever we can reach it: MoSPI press releases, RBI data, PLFS bulletins, exchange records and ministry statements. When the official release is not directly available, we use a reputable report of it and name that report.',
  },
  {
    title: 'Every chart cites its source',
    text: 'Each chart and indicator carries a source line naming the release or report it is built from, and the date it covers, so any reader can trace the number back.',
  },
  {
    title: 'Methods in the open',
    text: 'When a figure is provisional, a quick estimate, month to date or a snapshot during the trading day, we say so next to it. Our Blogs section explains how India\u2019s numbers are made.',
  },
]

export default function About() {
  useSeo({
    title: 'About',
    description:
      'India in Data is a data-driven editorial site: chart-led stories on India\u2019s news, business, markets and economy.',
  })

  const team = Object.values(authors)

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold text-brand">About</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            We tell India&rsquo;s stories with the numbers attached
          </h1>
          <p className="mt-5 text-lg leading-body text-ink/70">
            India in Data is a data-driven editorial site. Every piece we publish is anchored by a
            chart or a stat, written in plain language, and organised so you can browse by section
            or by topic. We sit somewhere between a data-journalism platform and a modern insights
            site: credible, neutral, and built for the public interest — not for clicks.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">How we source the data</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {SOURCING.map((s) => (
            <div key={s.title} className="rounded-sm border border-ink/10 bg-panel p-6">
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-body text-ink/70">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="team" className="mx-auto max-w-site scroll-mt-24 px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Who writes India in Data</h2>
        <p className="mt-2 max-w-2xl text-sm leading-body text-ink/60">
          India in Data is written and edited by Sarah Qureshi.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <div key={m.name} className="flex gap-4 rounded-sm border border-ink/10 bg-panel p-6">
              {m.photo ? (
                <img src={m.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand"
                >
                  {m.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
              )}
              <div>
                <h3 className="font-display text-lg font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm leading-body text-ink/70">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="using-our-work" className="mx-auto max-w-site scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="rounded-sm bg-brand-light p-8 sm:p-10">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Using our work</h2>
          <p className="mt-3 max-w-2xl leading-body text-ink/75">
            Our charts and write-ups are free to share, embed and reuse for non-commercial purposes,
            with attribution to India in Data and a link back to the original piece. For commercial
            licensing or the underlying datasets, write to us through the contact page.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 py-12 sm:px-6">
        <div className="grid gap-8 rounded-sm border border-ink/10 bg-panel p-8 sm:grid-cols-3">
          {getSiteStats().map((s) => (
            <StatBlock key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>
    </>
  )
}
