import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import IpoTable from '../components/ipo/IpoTable.jsx'
import { useIpos, useTodayIST, ipoStatus, istDateOf, fmt } from '../data/live.js'

function addDays(iso, n) {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
}

const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

const FAQ = [
  ['What does IPO subscription status mean?', 'It shows how many times the shares on offer have been bid for. A figure of 10x means investors bid for ten times the shares available. Subscription is reported for the whole issue and for each investor category.'],
  ['What are QIB, NII and retail?', 'QIB is qualified institutional buyers such as mutual funds and insurers. NII is non-institutional investors, meaning bids above ₹2 lakh. Retail is individual investors bidding up to ₹2 lakh. Each category has its own share of the issue, so each has its own subscription multiple.'],
  ['Which figure do you show?', 'The consolidated NSE and BSE figure that NSE publishes for each issue. It updates through the bidding days. The final figure is published after bidding closes on the last day, at about 7 pm.'],
  ['Does a high subscription mean the IPO will list at a gain?', 'Not by itself. Subscription shows demand during bidding. The listing price depends on market conditions on listing day, and many heavily subscribed issues have listed flat or lower. This page reports data and does not give investment advice.'],
  ['How do I check my allotment?', 'Allotment is usually finalised on the third working day after bidding closes. Check the registrar’s website or the exchange allotment page. Each IPO page on this site lists the registrar and the expected allotment date.'],
]

export default function IpoSubscriptionPage() {
  useSeo({
    title: 'IPO subscription status today',
    description:
      'Subscription status of IPOs open now on NSE, upcoming issues and recently closed IPOs, with the consolidated NSE and BSE subscription multiple. Updated through the bidding day.',
  })
  const data = useIpos()
  const today = useTodayIST(istDateOf(data.updatedAt))
  const ipos = data.ipos.map((i) => ({ ...i, status: ipoStatus(i, today) }))
  const board = (a, b) => (a.board === b.board ? 0 : a.board === 'mainboard' ? -1 : 1)

  const open = ipos.filter((i) => i.status === 'open').sort(board)
  const upcoming = ipos.filter((i) => i.status === 'upcoming').sort((a, b) => a.open.localeCompare(b.open))
  const recent = ipos
    .filter((i) => (i.status === 'closed' || i.status === 'listed') && today && i.close >= addDays(today, -14))
    .sort((a, b) => b.close.localeCompare(a.close) || board(a, b))
  const updated = data.updatedAt ? fmt.date(istDateOf(data.updatedAt)) : null
  // Latest subscription timestamp among open issues, as reported by NSE (e.g. "26-Oct-2026 15:03:00").
  const latestSub = open.map((i) => i.subscriptionAsOf).filter(Boolean).sort().slice(-1)[0] || null

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">IPO subscription status today</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            How many times each IPO on NSE has been subscribed. Open issues, upcoming issues and the last two weeks of closed issues, from the consolidated NSE and BSE figures.
          </p>
          {(updated || latestSub) && <p className="num mt-3 text-xs text-ink/50">{latestSub ? `Latest subscription figure: ${latestSub.replace(/:\d{2}$/, '')} IST. ` : ''}{updated ? `List refreshed ${updated}. ` : ''}See the <Link to="/methodology" className="text-brand hover:underline">methodology</Link>.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Open for bidding now</H>
        <IpoTable rows={open} columns="live" caption="IPOs open for bidding" empty="No IPO is open for bidding today." />

        <H>Opening next</H>
        <IpoTable rows={upcoming} columns="live" caption="Upcoming IPOs" empty="No upcoming IPO dates announced yet." />

        <H>Closed in the last 14 days</H>
        <IpoTable rows={recent} columns="closed" caption="Recently closed IPOs with final subscription" empty="No IPO closed in the last 14 days." />
        <p className="mt-3 text-xs text-ink/60">
          Listing dates marked * are expected dates until the exchange confirms them. Open any issue for the subscription split by QIB, NII and retail. The full list is on the <Link to="/ipo-dashboard" className="text-brand hover:underline">IPO dashboard</Link>.
        </p>

        <H>How to read subscription</H>
        <div className="max-w-3xl space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 leading-body text-ink/80">{a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm text-ink/60">
          Not investment advice. Read the <Link to="/disclaimer" className="text-brand hover:underline">disclaimer</Link> before using this data.
        </p>
      </section>
    </>
  )
}
