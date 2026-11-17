import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import DataPanel from '../components/DataTools.jsx'
import { fmt } from '../data/live.js'
import { ISSUERS, issuer, CC_HUB, ccPath, CHECKED, GST, MAD_RULES, lateMax } from '../data/credit-cards.js'

// Credit card charges by issuer, from each issuer's own published terms. Data: src/data/credit-cards.js.

const ARTICLE = '/article/credit-card-interest-rates-india'
const rs = (v, dp = 0) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
const pctStr = (v) => (typeof v === 'string' ? v : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`)
const checked = fmt.date(CHECKED, { day: 'numeric', month: 'long', year: 'numeric' })
const round2 = (v) => Math.round(v * 100) / 100

// headline rate as text: "3.75%", "up to 3.75%", "3.83% to 3.95%"
const rateText = (x) => (x.rateLow ? `${pctStr(x.rateLow)} to ${pctStr(x.rate)}` : `${x.upTo ? 'up to ' : ''}${pctStr(x.rate)}`)
const paText = (x) => (x.paQuoted ? `${pctStr(x.paQuoted[0])} to ${pctStr(x.paQuoted[1])}` : x.rateLow ? `${pctStr(round2(x.rateLow * 12))} to ${pctStr(round2(x.rate * 12))}` : pctStr(round2(x.rate * 12)))
const onCards = (x) => (!x.rateLow ? 'its standard credit cards' : x.rangeLabel === 'most cards' ? 'most of its cards' : `its cards, ${x.rangeLabel}`)
const cashPhrase = (x) => (x.cash.flat ? `${rs(x.cash.flat)} each` : `${x.cash.pct}% of the amount (at least ${rs(x.cash.min)})`)
const NUM = { 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven' }
const madShort = { hdfc: '5% of balance', icici: '5% of balance', rbl: '5% of balance', sbi: '2% plus interest', bob: '2% plus interest', two: '2% plus interest', au: '2% plus interest', kotak: '1% plus interest', hsbc: '1% plus interest' }

function lateFor(x, amt) {
  const l = x.late
  if (l.slabs) return l.slabs.find(([lo, hi]) => amt >= lo && (hi == null || amt <= hi))?.[2] ?? null
  if (l.pct) return Math.min(l.max, Math.max(l.min, (amt * l.pct) / 100))
  return null
}
const lateText = (x) => {
  const l = x.late
  if (l.slabs) return `Up to ${rs(lateMax(x))}`
  if (l.pct) return `${l.pct}%, max ${rs(l.max)}`
  return `Minimum due, ${rs(l.min)} to ${rs(l.max)}`
}
const cashFee = (x, amt) => (x.cash.flat ? x.cash.flat : Math.max((amt * x.cash.pct) / 100, x.cash.min))
const interest = (bal, ratePm, days) => (bal * ratePm * 12 * days) / 36500

// repayment model: ₹50,000 owed, no new spending, interest at the issuer's standard (or top) rate a month
// on principal, 18% GST on interest, minimum due paid on time by the issuer's formula
function simulate(rule, ratePm, start = 50000, months = 60) {
  const f = MAD_RULES[rule]
  let P = start, paid = 0, cost = 0, first = null
  const at = {}
  for (let m = 1; m <= months; m++) {
    if (P > 0.5) {
      const I = (P * ratePm) / 100, G = I * GST
      const pay = Math.min(f(P, I, G, m), P + I + G)
      if (first == null) first = pay
      P = Math.max(0, P - (pay - I - G)); paid += pay; cost += I + G
    }
    if (m === 12 || m === 36 || m === 60) at[m] = { owed: Math.round(P), cost: Math.round(cost), paid: Math.round(paid) }
  }
  return { first: Math.round(first), at }
}
function fixedPlan(ratePm, payment = 5000, start = 50000) {
  let P = start, cost = 0, m = 0
  while (P > 0.5 && m < 600) { const I = (P * ratePm) / 100, G = I * GST; P = Math.max(0, P - (Math.min(payment, P + I + G) - I - G)); cost += I + G; m++ }
  return { months: m, cost: Math.round(cost) }
}

/* ---------- shared bits ---------- */
const H = ({ children, id }) => <h2 id={id} className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0 bg-panel p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="num mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </div>
  )
}
function Faq({ items }) {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <H>Questions</H>
      <div className="max-w-3xl space-y-4">
        {items.map(([q, a]) => (
          <div key={q}>
            <h3 className="font-semibold">{q}</h3>
            <p className="mt-1 leading-body text-ink/80">{a}</p>
          </div>
        ))}
      </div>
    </>
  )
}
function Table({ head, rows, caption, firstWide }) {
  return (
    <figure className="my-2">
      <div className="overflow-x-auto border-y border-ink/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
              {head.map((h, i) => <th key={h} scope="col" className={`px-3 py-2 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-ink/10 last:border-0">
                {r.map((c, i) => <td key={i} className={`px-3 py-2 ${i ? 'num text-right' : `font-semibold ${firstWide ? 'min-w-[14rem]' : ''}`}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="mt-2 text-xs text-ink/60">{caption}</figcaption>}
    </figure>
  )
}
const About = () => (
  <>
    <H>About these figures</H>
    <div className="max-w-3xl space-y-3 leading-body text-ink/80">
      <p>Every figure comes from the issuer&apos;s own published terms: its most important terms and conditions (MITC), key fact statement or schedule of charges, read on {checked}. Rates are per month before GST; the yearly figure is the monthly rate times 12, the way most issuers quote it. GST at 18% is charged on top of interest, late fees and other charges.</p>
      <p>Rates and fees differ between cards from the same issuer, and banks can change them with notice. Check your own card&apos;s terms, or your statement, before relying on a figure here.</p>
      <p>Under Reserve Bank of India rules, a late fee can be charged, and an account reported as past due, only when a payment is more than three days late, and the fee is charged on the amount still unpaid after the due date. The minimum due must be set so that paying it does not let the balance grow.</p>
    </div>
  </>
)

const CSV_COLS = [
  { key: 'name', label: 'Issuer' }, { key: 'rate', label: 'Interest, % a month (standard cards; top of range where set per customer)' }, { key: 'rateLow', label: 'Lowest rate in range, % a month' },
  { key: 'pa', label: 'Interest, % a year (monthly x 12)' }, { key: 'late', label: 'Late fee' }, { key: 'lateMax', label: 'Late fee maximum, Rs' }, { key: 'cash', label: 'Cash withdrawal fee' },
  { key: 'ifp', label: 'Interest-free period' }, { key: 'mad', label: 'Minimum amount due' }, { key: 'source', label: 'Source document' },
]
const csvRow = (x) => ({ name: x.name, rate: x.rate, rateLow: x.rateLow ?? '', pa: round2(x.rate * 12), late: lateText(x), lateMax: lateMax(x), cash: x.cash.label, ifp: x.ifp || '', mad: x.mad?.text || '', source: x.sources.map((s) => `${s[0]} (${s[1]})`).join('; ') })

/* ---------- hub ---------- */
export function CreditCardHub() {
  useSeo({
    title: 'Credit card charges in India: interest rate, late fee and cash withdrawal charges of 12 banks (2026)',
    description: `Bank-wise credit card charges in India: interest rate a month, late payment charges, cash withdrawal fee, interest-free period and minimum due rules for 12 issuers, from their own published terms, checked ${checked}.`,
  })
  const [sort, setSort] = useState({ key: 'rate', dir: -1 })
  const rows = useMemo(() => ISSUERS.map((x) => ({ ...x, lateMaxV: lateMax(x) })), [])
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const k = sort.key
    const va = k === 'name' ? a.name : k === 'late' ? a.lateMaxV : a.rate
    const vb = k === 'name' ? b.name : k === 'late' ? b.lateMaxV : b.rate
    return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * sort.dir || a.name.localeCompare(b.name)
  }), [rows, sort])
  const head = (key, label, num = true) => {
    const on = sort.key === key
    return (
      <th scope="col" aria-sort={on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-semibold ${num ? 'text-right' : ''}`}>
        <button type="button" onClick={() => setSort({ key, dir: on ? -sort.dir : num ? -1 : 1 })} className={`inline-flex items-center gap-1 hover:text-brand ${on ? 'text-ink' : ''}`}>
          {label}<span aria-hidden="true" className="text-[10px]">{on ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
        </button>
      </th>
    )
  }
  const at375 = ISSUERS.filter((x) => !x.rateLow && x.rate === 3.75).length + ISSUERS.filter((x) => x.rateLow && x.rateLow >= 3.75).length
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Credit card charges by bank</h1>
          <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
            Interest, late payment charges, cash withdrawal fees and minimum due rules for 12 credit card issuers in India, read from each issuer&apos;s own terms on {checked}. {NUM[at375] || at375} of the 12 charge 3.75% a month or more on their standard cards, which is 45% a year before GST and 53.1% with it.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H id="table">Bank-wise credit card charges</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                {head('name', 'Issuer', false)}
                {head('rate', 'Interest a month')}
                <th scope="col" className="px-3 py-2 text-right font-semibold">A year</th>
                {head('late', 'Late fee')}
                <th scope="col" className="px-3 py-2 text-right font-semibold">Cash withdrawal</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Interest-free period</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Minimum due</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((x) => (
                <tr key={x.slug} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-2"><Link to={ccPath(x.slug)} className="font-semibold hover:text-brand">{x.name}</Link>{x.rangeLabel && <span className="block text-xs text-ink/50">{x.rangeLabel}</span>}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right font-semibold">{rateText(x)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{paText(x)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{lateText(x)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{x.cash.label}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{x.ifp ? x.ifp.replace(/ \(.*\)$/, '') : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{x.mad ? madShort[x.mad.rule] : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Standard retail cards, before 18% GST. A year is the monthly rate times 12; Axis Bank quotes the compounded figure, 55.55%. Minimum due is the share of the borrowed balance the minimum payment repays each month, on top of interest and fees. A dash means the documents we read do not state it. Select a bank for its full charges and sources.</p>

        <H>What these charges add up to</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          <p>Carry ₹50,000 on a card at 3.75% a month, pay only the minimum due and make no new purchases, and after five years you still owe ₹14,900 to ₹27,400, depending on the bank&apos;s minimum due formula, having paid ₹77,700 to ₹1,00,200 in interest and GST. Paying ₹5,000 a month clears the same balance in 14 months for ₹17,499. <Link to={ARTICLE} className="text-brand hover:underline">How we worked this out, and what the minimum due really costs</Link>.</p>
          <p>Cash is the costliest way to use a card: most issuers charge 2.5% of the amount (at least ₹500) and interest from the day of the withdrawal, with no interest-free period. ₹10,000 repaid after 30 days costs about ₹1,026 with GST at 3.75% a month.</p>
        </div>

        <Faq items={[
          ['What are the charges on a credit card in India?', 'The main ones are interest (finance charges) of about 3.75% a month on any balance not paid in full, a late payment fee of up to ₹1,200 to ₹1,300 if even the minimum due is missed, and a cash withdrawal fee of usually 2.5% (at least ₹500). Annual fees, foreign currency mark-ups and fees on rent, fuel or utility payments vary by card. GST at 18% is added to all of these charges.'],
          ['Which bank charges the least interest on credit cards?', 'Among standard cards, American Express charges 3.5% a month, against 3.75% at most large banks. Some premium and secured cards charge less: Axis Bank Burgundy Private 1.5%, IndusInd Indulge 1.79%, and HDFC Bank Infinia and Diners Black, AU Zenith+ and HDFC Bank cards issued against a fixed deposit 1.99%. IDFC FIRST Bank sets a rate for each customer from 0.71% to 3.85% a month.'],
          ['Which bank has the highest credit card late fee?', 'Most large issuers cap the late fee at ₹1,300 for bills above ₹50,000. HSBC caps it at ₹1,200 and American Express at ₹1,250. AU Small Finance Bank and IDFC FIRST Bank charge 15% of the amount due and RBL Bank 12.5%, each up to ₹1,300. SBI Card and Axis Bank add ₹100 a cycle once the minimum is missed twice in a row.'],
          ['Is GST charged on credit card charges?', 'Yes. GST at 18% is charged on interest, late payment fees, cash withdrawal fees and other charges.'],
        ]} />

        <DataPanel
          dataset={{
            name: 'Credit card charges of 12 Indian issuers',
            description: `Interest rate, late payment charges, cash withdrawal fee, interest-free period and minimum amount due rules for 12 credit card issuers in India, from each issuer's published terms (MITC, key fact statement or schedule of charges), checked ${checked}. Compiled by India in Data.`,
            path: CC_HUB, asOf: CHECKED, source: 'Card issuers’ published terms (MITC, key fact statements, schedules of charges)',
            variables: ['Credit card interest rate', 'Late payment charges', 'Cash withdrawal fee'], keywords: ['credit card charges', 'credit card interest rate', 'credit card late payment charges', 'bank-wise credit card charges'],
          }}
          csv={{ filename: `india-in-data-credit-card-charges-${CHECKED}`, label: 'All 12 issuers (CSV)', columns: CSV_COLS, rows: ISSUERS.map(csvRow) }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- one issuer ---------- */
export function CreditCardIssuerPage() {
  const { bank: slug } = useParams()
  const x = issuer[slug]
  const short = x?.short || slug
  useSeo({
    title: `${short} credit card charges: interest rate, late fee and cash withdrawal charges (2026)`,
    description: x ? `${x.name} credit card interest rate (${rateText(x)} a month), late payment charges (${lateText(x).toLowerCase()}), cash withdrawal fee (${x.cash.label}) and minimum due rules, from ${x.name}'s own terms, checked ${checked}.` : undefined,
  })
  if (!x) return <section className="mx-auto max-w-site px-4 py-16 sm:px-6"><h1 className="font-display text-4xl font-semibold">Credit card charges</h1><p className="mt-3 text-ink/70"><Link to={CC_HUB} className="text-brand hover:underline">See all issuers</Link>.</p></section>

  const r = x.rate
  const ranged = !!x.rateLow
  const top = ranged ? ' at the top of its range' : ''
  const int20 = interest(20000, r, 40)
  const fee10 = cashFee(x, 10000), int10 = interest(10000, r, 30), cashTotal = (fee10 + int10) * (1 + GST)
  const late30 = lateFor(x, 30000)
  const sim = x.mad ? simulate(x.mad.rule, r) : null
  const fixed = fixedPlan(r)
  const ranked = [...ISSUERS].sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name))
  const cheaper = ISSUERS.filter((o) => o.rate < r).length
  const slabRows = x.late.slabs?.map(([lo, hi, fee]) => [hi == null ? `Above ${rs(lo - 1)}` : lo === 0 ? `Up to ${rs(hi)}` : `${rs(lo)} to ${rs(hi)}`, fee ? rs(fee) : 'Nil'])
  const lateRule = x.late.slabs
    ? `${x.name} charges a fixed late fee that depends on the amount due${x.late.basis ? ` (${x.late.basis.toLowerCase()})` : ''}${x.late.from ? `, in slabs that apply from ${x.late.from}` : ''}.`
    : x.late.pct
      ? `${x.name} charges ${x.late.pct}% of the ${x.late.basis.toLowerCase()} as a late fee, at least ${rs(x.late.min)} and at most ${rs(x.late.max)}.`
      : `${x.name} charges a late fee equal to the full minimum payment due, at least ${rs(x.late.min)} and at most ${rs(x.late.max)} a month.`

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to={CC_HUB} className="hover:text-brand">Credit card charges</Link> / {x.name}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{short} credit card charges</h1>
          <p className="num mt-4 text-5xl font-semibold text-brand sm:text-6xl">{rateText(x)}<span className="ml-2 font-sans text-2xl font-normal text-ink/60">a month</span></p>
          <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">
            {x.name}{x.aka ? ` (${x.aka})` : ''} charges interest of {rateText(x)} a month on {onCards(x)}, or {paText(x)} a year, before 18% GST. Its late fee goes up to {rs(lateMax(x))} and cash withdrawals cost {cashPhrase(x)}. All figures are from {x.name}&apos;s own terms checked on {checked}.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Interest" value={`${rateText(x)}`} sub={`a month; ${paText(x)} a year`} />
          <Stat label="Late payment fee" value={lateText(x)} sub="plus 18% GST" />
          <Stat label="Cash withdrawal fee" value={x.cash.label} sub="plus interest from day one" />
          <Stat label="Interest-free period" value={x.ifp ? x.ifp.replace(/ \(.*\)$/, '') : '—'} sub={x.ifp ? 'if the last bill was paid in full' : 'not stated in the terms we read'} />
        </div>

        <H id="interest">{short} credit card interest rate</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          <p>Interest, which banks call finance charges, applies when the total amount due is not paid by the due date. It is then charged on every purchase from the day it was made, and on new purchases from the day they are made, until the balance is cleared. Cash withdrawals attract interest from the day of the withdrawal. {x.minFinance || ''}</p>
          <p>At {pctStr(r)} a month{top}, a ₹20,000 balance carried for 40 days costs {rs(int20)} in interest plus {rs(int20 * GST)} GST: the balance, times the monthly rate, times 12, times the days, divided by 365. With GST, {pctStr(r)} a month works out to {pctStr(round2(r * 12 * (1 + GST)))} a year.{x.quotedPa ? ` ${x.name} quotes its rate as ${pctStr(x.quotedPa)} a year, the compounded equivalent of ${pctStr(r)} a month.` : ''}</p>
          {x.since && <p>{x.since}</p>}
          {x.defaultRate && <p>{x.defaultRate}</p>}
        </div>
        {x.variants && (
          <>
            <h3 className="mb-2 mt-6 font-semibold">Interest by card</h3>
            <Table head={['Cards', 'A month', 'A year']} firstWide
              rows={x.variants.map(([label, v]) => [label, pctStr(v), typeof v === 'number' ? pctStr(round2(v * 12)) : '—'])}
              caption={x.variantNote || `From ${x.name}'s published terms. Before 18% GST.`} />
          </>
        )}

        <H id="late-fee">{short} credit card late payment charges</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          <p>A late fee is charged if not even the minimum amount due is paid. {lateRule} Under RBI rules it can be charged only once the payment is more than three days past the due date, and only on the amount unpaid after the due date. GST at 18% is added.</p>
          {late30 != null && <p>On ₹30,000 left unpaid, the fee is {rs(late30)} plus {rs(late30 * GST)} GST.</p>}
          {x.lateExtra && <p>{x.lateExtra}</p>}
        </div>
        {slabRows && <Table head={['Amount due', 'Late fee']} rows={slabRows} caption="Before 18% GST." />}

        <H id="cash">{short} credit card cash withdrawal charges</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          <p>{x.cash.flat ? `${x.name} charges a flat ${rs(x.cash.flat)} for each cash withdrawal` : `${x.name} charges ${x.cash.pct}% of the amount withdrawn, at least ${rs(x.cash.min)}`}, and interest from the day of the withdrawal: there is no interest-free period on cash. {x.cash.note || ''}</p>
          <p>Withdraw ₹10,000 and repay it 30 days later, and the fee ({rs(fee10)}) and interest ({rs(int10)}{top}), each with GST, come to {rs(cashTotal)}, or {pctStr(round2((cashTotal / 10000) * 100))} of the amount for one month.</p>
        </div>

        <H id="minimum-due">{short} credit card minimum amount due</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          {x.mad ? <p>{x.name} sets the minimum amount due as {x.mad.text.charAt(0).toLowerCase() + x.mad.text.slice(1)}</p> : <p>The terms we read do not set out {x.name}&apos;s formula for the minimum payment due.</p>}
          <p>Paying it on time avoids the late fee and keeps the account from being reported as past due, but it does not stop interest: the rest of the balance keeps attracting {pctStr(r)} a month{top} plus GST.</p>
          {x.madExample && <p>{x.madExample}</p>}
        </div>
        {sim && (
          <Table head={['If you owe ₹50,000 and pay only the minimum', 'After 1 year', 'After 3 years', 'After 5 years']} firstWide
            rows={[
              ['Still owed', rs(sim.at[12].owed), rs(sim.at[36].owed), rs(sim.at[60].owed)],
              ['Interest and GST paid so far', rs(sim.at[12].cost), rs(sim.at[36].cost), rs(sim.at[60].cost)],
            ]}
            caption={`Our calculation with ${x.name}'s formula: ₹50,000 owed, no new spending, interest at ${pctStr(r)} a month${top} on the amount borrowed plus 18% GST, minimum paid on time. The first minimum would be ${rs(sim.first)}. Paying ₹5,000 a month instead clears the balance in ${fixed.months} months for ${rs(fixed.cost)} in interest and GST. Statements charge interest by the day, so real figures differ slightly.`} />
        )}

        <H id="compare">How {x.name} compares</H>
        <p className="mb-3 max-w-3xl leading-body text-ink/80">{ranged ? `${x.name}'s rate runs from ${pctStr(x.rateLow)} to ${pctStr(r)} a month (${x.rangeLabel}); eight of the other 11 issuers charge 3.75% on their standard cards and American Express 3.5%.` : cheaper === 0 ? `${x.name}'s standard rate is the lowest of the 12 issuers we checked.` : `Of the 12 issuers we checked, only ${ISSUERS.filter((o) => o.rate < r && !o.rateLow).map((o) => o.name).join(' and ')} ${cheaper === 1 ? 'charges' : 'charge'} less than ${x.name} on standard cards.`}}</p>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th scope="col" className="px-3 py-2 font-semibold">Issuer</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Interest a month</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Late fee</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Cash withdrawal</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((o) => (
                <tr key={o.slug} className={`border-b border-ink/10 last:border-0 ${o.slug === x.slug ? 'bg-brand/10' : ''}`}>
                  <td className="px-3 py-2">{o.slug === x.slug ? <span className="font-semibold">{o.name}</span> : <Link to={ccPath(o.slug)} className="font-semibold hover:text-brand">{o.name}</Link>}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{rateText(o)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{lateText(o)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right">{o.cash.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={CC_HUB} className="text-brand hover:underline">All 12 issuers</Link>
          <Link to={ARTICLE} className="text-brand hover:underline">What the minimum due really costs</Link>
        </p>

        <Faq items={[
          [`What is the ${short} credit card interest rate?`, `${rateText(x).charAt(0).toUpperCase() + rateText(x).slice(1)} a month, or ${paText(x)} a year, on ${onCards(x)}, before 18% GST. It applies when the total amount due is not paid by the due date, from the date of each purchase.${x.variants ? ' Some cards carry a different rate; see the table above.' : ''}`],
          [`What are the ${short} credit card late payment charges?`, `${lateRule} The maximum is ${rs(lateMax(x))}, plus 18% GST. It is charged only if not even the minimum amount due is paid, and only when the payment is more than three days late.${x.lateExtra ? ` ${x.lateExtra}` : ''}`],
          [`What is the ${short} credit card cash withdrawal charge?`, `${x.cash.flat ? `A flat ${rs(x.cash.flat)}` : `${x.cash.pct}% of the amount, at least ${rs(x.cash.min)}`}, plus interest at ${pctStr(r)} a month${top} from the day of withdrawal, and GST on both. ${x.cash.note || ''}`.trim()],
          ...(x.mad ? [[`How is the ${short} credit card minimum amount due calculated?`, x.mad.text]] : []),
          ...(x.ifp ? [[`What is the interest-free period on ${short} credit cards?`, `${x.ifp}, depending on the purchase date, provided the previous bill was paid in full. There is no interest-free period on cash withdrawals.`]] : []),
          [`Is GST charged on ${short} credit card charges?`, 'Yes. GST at 18% is charged on interest, late payment fees, cash withdrawal fees and other charges.'],
        ]} />

        <H>Sources</H>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-body text-ink/80">
          {x.sources.map(([t, u]) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{t}</a></li>)}
          <li>Reserve Bank of India, directions on credit card issuance and conduct, for the late fee and minimum due rules.</li>
        </ul>

        <DataPanel
          dataset={{
            name: `${x.name} credit card charges`,
            description: `Interest rate, late payment charges, cash withdrawal fee, interest-free period and minimum amount due rule for ${x.name} credit cards, from ${x.name}'s published terms, checked ${checked}. Compiled by India in Data.`,
            path: ccPath(x.slug), asOf: CHECKED, source: x.sources[0][0], sourceUrl: x.sources[0][1],
            variables: ['Credit card interest rate', 'Late payment charges', 'Cash withdrawal fee'], keywords: [`${short} credit card charges`, `${short} credit card interest rate`, `${short} credit card late payment charges`],
          }}
          csv={{ filename: `india-in-data-${x.slug}-credit-card-charges-${CHECKED}`, label: `${x.name} charges (CSV)`, columns: CSV_COLS, rows: [csvRow(x)] }}
        />
        <About />
      </section>
    </>
  )
}
