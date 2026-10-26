import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import NotFound from './NotFound.jsx'
import { useEffect } from 'react'
import { useGmp, gmpFor, useLiveState, useLive, useTodayIST, ipoStatus, getDetailSnapshot, getRowSnapshot, fetchLive, fmt, istDateOf, getMeta } from '../data/live.js'
import { getIpoEditorial, getArticlesForIpo } from '../data/content.js'
import { BOARD_LABEL, STATUS_CLASS, STATUS_LABEL, priceLabel, gainClass, allotmentLinks } from '../components/ipo/ipoUtil.js'

function Fact({ label, value, sub }) {
  if (value === null || value === undefined || value === '—') return null
  return (
    <div className="bg-panel p-4">
      <p className="text-xs text-ink/60">{label}</p>
      <p className="num mt-1 text-lg font-semibold leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  )
}

function Timeline({ t, today }) {
  const steps = [
    ['open', 'Bidding opens'],
    ['close', 'Bidding closes'],
    ['allotment', 'Allotment finalised'],
    ['refunds', 'Refunds and demat credit'],
    ['listing', 'Listing on exchange'],
  ].filter(([k]) => t?.[k])
  if (!steps.length) return null
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-5">
      {steps.map(([k, label]) => {
        const d = t[k]
        const done = today && d <= today
        return (
          <li key={k} className={`bg-panel p-3 ${done ? '' : 'opacity-90'}`}>
            <p className="flex items-center gap-2 text-xs text-ink/60">
              <span aria-hidden="true" className={`h-2 w-2 ${done ? 'bg-brand' : 'border border-ink/40'}`} />
              {label}
            </p>
            <p className="num mt-1 font-semibold">{fmt.date(d, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            {t.expected?.[k] && <p className="text-[11px] text-ink/50">Expected (T+3)</p>}
          </li>
        )
      })}
    </ol>
  )
}

function SubscriptionBars({ sub }) {
  const cats = (sub?.categories || []).filter((c) => c.key !== 'total' && c.key !== 'nii' && c.offered)
  const nii = (sub?.categories || []).find((c) => c.key === 'nii')
  const rows = [...cats]
  if (nii && !cats.some((c) => c.key === 'bnii' || c.key === 'snii')) rows.splice(1, 0, nii)
  if (!rows.length) return null
  const max = Math.max(...rows.map((c) => c.times), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((c) => (
        <div key={c.key} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm">
          <span className="text-ink/70">{c.label}</span>
          <div className="h-3 bg-ink/5" aria-hidden="true">
            <div className="h-3 bg-brand" style={{ width: `${Math.max(1.5, (Math.log10(c.times + 1) / Math.log10(max + 1)) * 100)}%` }} />
          </div>
          <span className="num text-right font-semibold">{fmt.times(c.times)}</span>
        </div>
      ))}
      <p className="text-xs text-ink/50">Bar lengths use a log scale so small and large multiples can be read together.</p>
    </div>
  )
}

function LotCalculator({ lot, price, board }) {
  const [lots, setLots] = useState(1)
  if (!lot || !price) return null
  const cap = board === 'mainboard' ? Math.floor(200000 / (lot * price)) : null
  return (
    <div className="bg-panel p-4">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink/70">Lots</span>
        <input type="number" min="1" max="1000" value={lots} onChange={(e) => setLots(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
          className="num w-24 rounded-sm border border-ink/20 bg-paper px-2 py-1 text-right" />
      </label>
      <p className="num mt-3 text-2xl font-semibold">{fmt.rupees(lots * lot * price)}</p>
      <p className="mt-1 text-xs text-ink/50">{fmt.inr(lots * lot, 0)} shares at ₹{fmt.inr(price, 0)} (upper end of the band)</p>
      {cap !== null && cap >= 1 && <p className="mt-2 text-xs text-ink/60">Retail applicants can bid up to ₹2 lakh: {cap} lots at this price.</p>}
    </div>
  )
}

export default function IpoDetailPage() {
  const { slug } = useParams()
  const rowSnap = getRowSnapshot(slug)
  const { data: index, done } = useLiveState('live/ipos.json', { ipos: rowSnap ? [rowSnap] : [] })
  const [archiveRow, setArchiveRow] = useState(null)
  const [archiveDone, setArchiveDone] = useState(false)
  const fromIndex = useMemo(() => index.ipos.find((i) => i.slug === slug), [index, slug])
  // older issues live in the archive file, fetched only when needed
  useEffect(() => {
    if (done && !fromIndex && !archiveDone)
      fetchLive('live/ipos-archive.json').then((d) => {
        setArchiveRow(d?.ipos?.find((i) => i.slug === slug) || null)
        setArchiveDone(true)
      })
  }, [done, fromIndex, slug])
  const row = fromIndex || archiveRow || null
  const gmpData = useGmp()
  const detail = useLive(`live/ipo/${slug}.json`, getDetailSnapshot(slug) || null)
  const today = useTodayIST(istDateOf(index.updatedAt || getMeta().iposUpdatedAt))
  const ed = row ? getIpoEditorial(row.symbol, slug) : null
  const name = row?.name?.replace(/\s+Limited$/i, '') || ed?.companyName
  useSeo({
    title: name ? `${name} IPO: dates, price band, subscription, listing` : 'IPO not found',
    description: row
      ? `${name} IPO on NSE ${BOARD_LABEL[row.board]}: bidding ${fmt.date(row.open)} to ${fmt.date(row.close)}, price ${priceLabel(row)}${row.subscription ? `, subscribed ${fmt.times(row.subscription)}` : ''}${row.listingGainPct !== null && row.listingGainPct !== undefined ? `, listing gain ${fmt.pct(row.listingGainPct)}` : ''}.`
      : undefined,
  })
  if (!row) return done && (archiveDone || fromIndex) ? <NotFound /> : <div className="mx-auto max-w-site px-4 py-20 text-center text-sm text-ink/60 sm:px-6">Loading IPO data…</div>

  const status = ipoStatus(row, today)
  const price = row.issuePrice || row.priceHigh
  const size = detail?.issueSize
  const sub = detail?.subscription
  const gmpEntry = gmpFor(gmpData.entries, row.slug).latest
  const related = ed ? getArticlesForIpo(ed, 3) : []

  return (
    <>
      <header className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60">
            <Link to="/ipo-dashboard" className="hover:text-brand">IPO dashboard</Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-[2px] px-1.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
            <span className={`rounded-[2px] px-1.5 py-0.5 text-xs font-semibold ${row.board === 'sme' ? 'bg-society-light text-society' : 'bg-business-light text-business'}`}>{BOARD_LABEL[row.board]}</span>
            <span className="num text-xs text-ink/60">NSE: {row.symbol}</span>
            {ed?.sector && <span className="text-xs text-ink/60">{ed.sector}</span>}
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl">{name} IPO</h1>
          {status === 'listed' && row.lastClose && (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="num text-3xl font-semibold">{fmt.rupees(row.lastClose, 2)}</span>
              <span className={`num font-semibold ${gainClass(row.gainPct)}`}>{fmt.pct(row.gainPct)} since issue</span>
              <span className="text-xs text-ink/50">Close on {fmt.date(row.lastCloseDate)}</span>
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-site px-4 py-8 sm:px-6">
        {(() => {
          const facts = [
            [row.issuePrice ? 'Issue price' : 'Price band', priceLabel(row), detail?.faceValue ? `Face value ₹${detail.faceValue}` : null],
            ['Issue size', size ? fmt.crore(size.totalCr) : null, size ? (size.freshCr && size.ofsCr ? `Fresh ${fmt.crore(size.freshCr)}, offer for sale ${fmt.crore(size.ofsCr)}` : size.ofsCr ? 'Offer for sale only' : 'Fresh issue only') : null],
            ['Lot size', row.lotSize ? `${fmt.inr(row.lotSize, 0)} shares` : null, row.lotValue ? `${fmt.rupees(row.lotValue)} per lot` : null],
            ['Subscribed', sub?.total !== null && sub?.total !== undefined ? fmt.times(sub.total) : null, sub?.asOf ? `As of ${sub.asOf}${sub.totalMethod && sub.totalMethod !== 'NSE' ? `, ${sub.totalMethod}` : ''}` : null],
            ['Listing price', row.listing ? fmt.rupees(row.listing.open, 2) : null, row.listing ? `Opening price on ${fmt.date(row.listing.date)}` : null],
            ['Listing gain', row.listingGainPct !== null && row.listingGainPct !== undefined ? fmt.pct(row.listingGainPct) : null, null],
            ['Listing-day close', row.listing ? fmt.rupees(row.listing.close, 2) : null, null],
            ['Issue type', detail?.issueType || null, null],
          ].filter(([, v]) => v && v !== '—')
          const fill = (4 - (facts.length % 4)) % 4
          return (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 md:grid-cols-4">
              {facts.map(([l, v, sub2]) => <Fact key={l} label={l} value={v} sub={sub2} />)}
              {Array.from({ length: fill }, (_, i) => <div key={i} aria-hidden="true" className="hidden bg-panel md:block" />)}
              {facts.length % 2 === 1 && <div aria-hidden="true" className="bg-panel md:hidden" />}
            </div>
          )
        })()}

        {status !== 'listed' && status !== 'unlisted' && row.board === 'mainboard' && (
          <section className="mt-8 rounded-xl border border-ink/10 bg-panel p-4">
            <h2 className="text-lg font-bold">{name} IPO GMP</h2>
            {gmpEntry && price ? (
              <p className="mt-2 text-sm leading-body">
                Reported grey market premium: <span className="num font-semibold">{gmpEntry.gmp > 0 ? '+' : ''}{fmt.rupees(gmpEntry.gmp)}</span> per share
                (<span className="num">{fmt.pct((gmpEntry.gmp / price) * 100)}</span> of the {fmt.rupees(price)} {row.issuePrice ? 'issue price' : 'upper price band'}), per{' '}
                {gmpEntry.sourceUrl ? <a href={gmpEntry.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{gmpEntry.source}</a> : gmpEntry.source}, {fmt.date(gmpEntry.asOf)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink/70">No grey market premium reported yet from a source we can name.</p>
            )}
            <p className="mt-2 text-xs text-ink/60">
              GMP is unofficial and unverified, and not a forecast of the listing price. See <Link to={`/ipo-gmp/${row.slug}`} className="text-brand hover:underline">{name} GMP history</Link> and <Link to="/ipo-gmp" className="text-brand hover:underline">all IPO GMPs</Link>.
            </p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Timetable</h2>
          <Timeline t={row.timetable} today={today} />
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
          <section>
            <h2 className="mb-1 text-lg font-bold">Subscription by investor category</h2>
            {sub ? (
              <>
                <p className="mb-4 text-xs text-ink/60">Times the shares reserved for each category, {sub.scope}. {sub.asOf ? `As of ${sub.asOf} IST.` : ''}</p>
                <SubscriptionBars sub={sub} />
              </>
            ) : (
              <p className="text-sm text-ink/60">{status === 'upcoming' ? 'Subscription figures appear once bidding opens.' : 'Category-wise subscription is not available for this issue.'}</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">How much you need</h2>
            <LotCalculator lot={row.lotSize} price={price} board={row.board} />
            {detail?.employeeDiscount && !/^(na|nil|-)$/i.test(detail.employeeDiscount) && <p className="mt-2 text-xs text-ink/60">Employee discount: {detail.employeeDiscount}</p>}
          </section>
        </div>

        {(ed?.description || ed?.highlights?.length) && (
          <section className="mt-10 max-w-3xl">
            <h2 className="mb-2 text-lg font-bold">About the company</h2>
            {ed.description && <p className="leading-body text-ink/80">{ed.description}</p>}
            {ed.highlights?.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-ink/75">
                {ed.highlights.map((h, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 bg-ink/40" />{h}</li>)}
              </ul>
            )}
          </section>
        )}

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {detail?.issueSizeText && (
            <section className="md:col-span-2">
              <h2 className="mb-2 text-lg font-bold">Issue structure</h2>
              <p className="text-sm leading-body text-ink/75">{detail.issueSizeText}</p>
              {size && <p className="mt-2 text-xs text-ink/50">{size.method}.</p>}
            </section>
          )}
          <section>
            <h2 className="mb-2 text-lg font-bold">Check allotment</h2>
            <ul className="space-y-1.5 text-sm">
              {allotmentLinks(detail?.registrar).map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{l.label}</a></li>
              ))}
            </ul>
          </section>
        </div>

        {(detail?.leadManagers?.length || detail?.registrar || Object.keys(detail?.documents || {}).length) && (
          <div className="mt-10 grid gap-8 border-t border-ink/10 pt-6 md:grid-cols-3">
            {detail?.leadManagers?.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold">Book-running lead managers</h2>
                <ul className="space-y-1 text-sm text-ink/75">{detail.leadManagers.map((m) => <li key={m}>{m}</li>)}</ul>
              </section>
            )}
            {detail?.registrar && (
              <section>
                <h2 className="mb-2 text-sm font-bold">Registrar</h2>
                <p className="text-sm text-ink/75">{detail.registrar}</p>
                {detail.registrarContact && <p className="mt-1 text-xs text-ink/50">{detail.registrarContact}</p>}
              </section>
            )}
            {Object.keys(detail?.documents || {}).length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold">Documents (NSE)</h2>
                <ul className="space-y-1 text-sm">
                  {Object.entries(detail.documents).map(([label, url]) => (
                    <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{label}</a></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <p className="mt-10 border-t border-ink/10 pt-4 text-xs leading-body text-ink/50">
          Source: NSE public issue data{detail?.fetchedAt ? `, fetched ${new Date(detail.fetchedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : ''}; prices from NSE end-of-day files.
          Expected dates follow SEBI’s T+3 timetable and NSE’s trading holidays. This is information, not investment advice.
        </p>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-site px-4 pb-12 sm:px-6">
          <h2 className="mb-4 text-xl font-bold">Related stories</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
        </section>
      )}
    </>
  )
}
