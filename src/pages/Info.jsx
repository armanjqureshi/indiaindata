import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import corrections from '../../content/pages/corrections.json'
import { CONTACT_EMAIL, POLICY_UPDATED } from '../data/site.js'

function Shell({ title, intro, updated, children }) {
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 text-lg leading-body text-ink/70">{intro}</p>}
          {updated && <p className="num mt-4 text-xs text-ink/50">Last updated {updated}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</section>
    </>
  )
}
const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold first:mt-0">{children}</h2>
const P = ({ children }) => <p className="mb-4 leading-body text-ink/80">{children}</p>
const UL = ({ items }) => (
  <ul className="mb-4 list-disc space-y-2 pl-5 leading-body text-ink/80">
    {items.map((t, i) => <li key={i}>{t}</li>)}
  </ul>
)
const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">{CONTACT_EMAIL}</a>

const SOURCES = [
  ['Intraday levels: Nifty 50, Bank, IT, Midcap 150, Smallcap 250, India VIX, Sensex', 'NSE website index feed and the Moneycontrol price feed, both unofficial. Checked against our stored close and against each other', 'About every 5 minutes, 9:15 am to 3:30 pm IST, replaced by the official close each evening'],
  ['Nifty 50, Nifty Bank, Nifty IT, Nifty Midcap 150, Nifty Smallcap 250, India VIX', 'NSE end-of-day index files', 'After each trading session'],
  ['BSE Sensex', 'A published price feed (Moneycontrol), cross-checked against the Nifty move before we publish it', 'After each trading session'],
  ['USD/INR, EUR/INR, GBP/INR, JPY/INR', 'FBIL reference rates, as published by NSE', 'After each trading session'],
  ['FII and DII net flows', 'NSE daily figures, which are provisional', 'After each trading session'],
  ['Gold and silver', 'IBJA published closing rates', 'After each trading session'],
  ['Brent crude (spot)', 'US Energy Information Administration, Europe Brent spot, weekly', 'Weekly; lags by several days'],
  ['FPI equity flows, month to date', 'NSDL daily FPI data, summed by us', 'Daily when published'],
  ['IPOs: dates, price band, lot size, subscription, listing', 'NSE public issue data. Subscription is the consolidated NSE and BSE figure NSE publishes', 'Several times a day'],
  ['Inflation, growth, industrial output, jobs, trade, GST, UPI and other monthly releases', 'Official releases (MoSPI, RBI, ministries and agencies), entered by an editor. Each indicator page names its source', 'When the official release comes out'],
]

export function Methodology() {
  useSeo({ title: 'Methodology', description: 'Where every figure on India in Data comes from, how often it updates, and the checks we run before publishing.' })
  return (
    <Shell title="Methodology" intro="Where every figure comes from, how often it updates, and what we check before it goes on the site." updated={POLICY_UPDATED}>
      <H>Principles</H>
      <UL items={[
        'We use the primary or official source whenever we can reach it, and name it next to the figure.',
        'We show a figure only if it passes our checks. If a check fails, the previous value stays and the reason is logged.',
        'Provisional, delayed, estimated and tentative figures are labelled as such.',
        'When we get something wrong, we correct it and record the change on our corrections page.',
      ]} />
      <H>Sources and update schedule</H>
      <div className="mb-4 overflow-x-auto rounded-sm border border-ink/10">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-raise text-xs text-ink/70">
            <tr><th className="p-3 font-semibold">Figure</th><th className="p-3 font-semibold">Source</th><th className="p-3 font-semibold">Updates</th></tr>
          </thead>
          <tbody>
            {SOURCES.map(([a, b, c]) => (
              <tr key={a} className="border-t border-ink/10 align-top"><td className="p-3">{a}</td><td className="p-3 text-ink/80">{b}</td><td className="p-3 text-ink/80">{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>Market and IPO figures are updated by automated jobs that run on a schedule. The scheduler can start late, so a figure may appear hours after the source publishes it. Every page that shows a market or IPO figure says which session or time it is as of.</P>
      <H>Checks before a market figure is published</H>
      <UL items={[
        'The figure parses cleanly and its date is not older than the value already on the site.',
        'The daily move is within a plausible range for that instrument.',
        'It is consistent with the previous stored close.',
        'The Sensex move must agree in direction and rough size with the Nifty move on the same session.',
      ]} />
      <H>IPO pages</H>
      <UL items={[
        'Subscription multiples are times the shares reserved for each category, using NSE’s consolidated NSE and BSE figures. The final figure for each issue is published by NSE at 7 pm on the last day of bidding.',
        'Allotment, refund and listing dates after bidding closes are calculated from the SEBI T+3 timetable and the NSE holiday calendar. They are marked as expected until the exchange confirms them.',
        'We cover issues listed on NSE. Issues listed only on BSE, including BSE SME, are not covered yet.',
        'We do not publish grey market premiums, because they are unofficial and cannot be verified.',
      ]} />
      <H>Known limits</H>
      <UL items={[
        'Intraday index levels are a few minutes behind the market and come from unofficial website feeds. The official close replaces them each evening. Other market figures are end-of-day.',
        'Brent is the weekly spot price from the EIA, which differs from the futures price quoted on trading screens.',
        'FII and DII flows are provisional exchange figures and can be revised.',
        'Monthly economic indicators are entered by hand when each official release comes out, so they can lag the release.',
      ]} />
      <H>Report a problem</H>
      <P>If a figure looks wrong, email <Mail /> with the page and what you expected. See the <Link to="/corrections" className="font-semibold text-brand hover:underline">corrections page</Link> for how we handle it.</P>
    </Shell>
  )
}

export function Corrections() {
  useSeo({ title: 'Corrections', description: 'How India in Data handles errors, and a log of corrections.' })
  const rows = [...corrections.entries].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Shell title="Corrections" intro="We want every figure to be right. When one is not, we fix it and say so here." updated={POLICY_UPDATED}>
      <H>How we handle errors</H>
      <UL items={[
        'Send errors to the email below with the page address and what you believe is correct, ideally with a source.',
        'We check the figure against the primary source and fix confirmed errors as soon as we can.',
        'Corrections that change a figure or a conclusion are recorded in the log below, with the date.',
        'Typos and formatting fixes are made without a note.',
      ]} />
      <P>Email: <Mail /></P>
      <H>Correction log</H>
      {rows.length === 0 ? (
        <P>No corrections yet.</P>
      ) : (
        <ol className="space-y-4">
          {rows.map((r, i) => (
            <li key={i} className="rounded-sm border border-ink/10 bg-panel p-4">
              <p className="num text-xs text-ink/50">{r.date}</p>
              <p className="mt-1 font-semibold">{r.page}</p>
              <p className="mt-1 text-sm leading-body text-ink/80">{r.what}</p>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  )
}

export function Privacy() {
  useSeo({ title: 'Privacy policy', description: 'What information India in Data collects, what we do with it, and who else receives it.' })
  return (
    <Shell title="Privacy policy" intro="We collect very little. This page says exactly what, and which other companies see your visit." updated={POLICY_UPDATED}>
      <H>What we collect</H>
      <UL items={[
        'No accounts and no advertising. We use Google Analytics (measurement only) to count visits and see which pages people read. It sets cookies in your browser and receives your IP address, device and browser details and the pages you view. We have switched off Google’s advertising features and ad personalisation. You can block it with a browser extension such as Google’s Analytics opt-out add-on, or by turning off cookies.',
        'Your device remembers two preferences, your light or dark theme and any indicators you star, in your browser’s local storage. This stays on your device and is never sent to us.',
        'If you email us, we receive your email address and your message. We use them only to reply and to follow up on what you wrote, and we keep them as long as needed for that.',
        'The newsletter and contact buttons open your email app with a prepared message. We receive your address only if you send that email.',
      ]} />
      <H>Who else sees your visit</H>
      <P>When you load our pages, your browser connects to the services below. They receive your IP address and basic browser details under their own privacy policies. We do not control that.</P>
      <UL items={[
        'Netlify hosts the site and keeps standard server logs.',
        'Google Analytics (googletagmanager.com and google-analytics.com) measures visits.',
        'Google Fonts supplies the typefaces.',
        'jsDelivr and GitHub supply the latest market and IPO data files.',
        'Netlify Identity (identity.netlify.com) loads a login script that our editors use.',
      ]} />
      <H>What we do not do</H>
      <UL items={[
        'We do not sell or rent personal information.',
        'We do not build advertising profiles.',
        'The site is not aimed at children.',
      ]} />
      <H>Your choices</H>
      <P>You can ask what we hold about you, or ask us to delete it, by emailing <Mail />. You can clear the preferences stored in your browser at any time from your browser settings. We handle personal data in line with the laws that apply to us in India, including the Digital Personal Data Protection Act, 2023.</P>
      <H>Changes</H>
      <P>If we add a newsletter service, advertising or anything else that collects information, we will update this page first and show the date above.</P>
      <H>Contact</H>
      <P>Questions about privacy: <Mail />. India in Data is operated from Mumbai, India.</P>
    </Shell>
  )
}

export function Terms() {
  useSeo({ title: 'Terms of use', description: 'The terms for using India in Data, including how you may reuse our charts and data.' })
  return (
    <Shell title="Terms of use" intro="By using indiaindata.online you agree to these terms. They are short on purpose." updated={POLICY_UPDATED}>
      <H>What the site is</H>
      <P>India in Data publishes news, analysis, charts and data about India for information. Please read our <Link to="/disclaimer" className="font-semibold text-brand hover:underline">disclaimer</Link>: nothing here is investment, tax or legal advice.</P>
      <H>Accuracy</H>
      <P>We work to keep figures correct and we publish our <Link to="/methodology" className="font-semibold text-brand hover:underline">methodology</Link> and <Link to="/corrections" className="font-semibold text-brand hover:underline">corrections</Link>. We cannot guarantee that every figure is complete, current or free of error, and we provide the site as it is, without warranties. Check important figures against the official source before you act on them.</P>
      <H>Reusing our work</H>
      <P>Our charts and write-ups are free to share, embed and reuse for non-commercial purposes, with credit to India in Data and a link back to the original page. For commercial use or the underlying datasets, email <Mail />.</P>
      <H>Third-party data</H>
      <P>Market, IPO and economic figures come from sources such as NSE, FBIL, IBJA, NSDL, the EIA, RBI and government agencies. We do not own that data. The terms of those sources apply to any reuse beyond what these terms allow.</P>
      <H>Using the site fairly</H>
      <UL items={[
        'Do not try to break, overload or gain unauthorised access to the site or its content system.',
        'Do not present our content as your own or alter a chart in a way that changes what it says.',
      ]} />
      <H>Liability</H>
      <P>To the extent the law allows, India in Data is not liable for any loss arising from your use of, or reliance on, the site or its content.</P>
      <H>Governing law</H>
      <P>These terms are governed by the laws of India, and the courts at Mumbai have jurisdiction.</P>
      <H>Changes and contact</H>
      <P>We may update these terms and will show the date above. Questions: <Mail />.</P>
    </Shell>
  )
}

export function Disclaimer() {
  useSeo({ title: 'Disclaimer', description: 'India in Data does not give investment advice. Read this before you use our market and IPO information.' })
  return (
    <Shell title="Disclaimer" intro="India in Data is a source of information. It does not tell you what to buy, sell or subscribe to." updated={POLICY_UPDATED}>
      <H>Not investment advice</H>
      <P>Nothing on this site is investment, financial, tax or legal advice, or an offer or recommendation to buy, sell or subscribe to any security, IPO or other product. Articles that discuss an IPO or a market move describe data and the published views of others. They do not tell you what to do.</P>
      <H>Your decisions are yours</H>
      <P>Investments carry risk, including loss of capital, and past performance does not predict future results. Before you invest, read the official offer documents and talk to a qualified, registered adviser who knows your circumstances.</P>
      <H>Data can be late, provisional or wrong</H>
      <UL items={[
        'Intraday index levels are several minutes behind the market and come from unofficial website feeds. Other market figures are end-of-day and can appear hours after the source publishes them.',
        'Some figures, such as FII and DII flows, are provisional and can be revised.',
        'IPO dates after bidding closes are expected dates until the exchange confirms them.',
        'We cover NSE-listed issues only.',
      ]} />
      <P>See our <Link to="/methodology" className="font-semibold text-brand hover:underline">methodology</Link> for sources and checks, and tell us about any error at <Mail />.</P>
      <H>Other people’s views</H>
      <P>When we quote analysts, brokerages or companies, those are their views and not ours. We do not control external sites we link to.</P>
    </Shell>
  )
}
