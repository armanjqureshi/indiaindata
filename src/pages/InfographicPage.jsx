import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import useSeo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'
import { getInfographic } from '../infographics/registry.js'
import { fmt } from '../data/live.js'

const SITE = 'https://indiaindata.online'

export default function InfographicPage() {
  const { slug } = useParams()
  const g = getInfographic(slug)
  const [copied, setCopied] = useState(false)
  useSeo({
    title: g ? g.title : 'Infographic not found',
    description: g ? `${g.dek} Source: ${g.source}.` : undefined,
  })
  if (!g) return <NotFound />
  const { Component } = g
  const embed = `<a href="${SITE}/infographics/${g.slug}"><img src="${SITE}${g.image}" alt="${g.short}. Source: India in Data" width="800" /></a>\n<p>Source: <a href="${SITE}/infographics/${g.slug}">India in Data</a></p>`
  const copy = () => {
    try {
      navigator.clipboard.writeText(embed).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    } catch {}
  }
  return (
    <>
      <header className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to="/infographics" className="hover:text-brand">Infographics</Link></p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{g.title}</h1>
          <p className="mt-3 leading-body text-ink/70">{g.dek}</p>
          <p className="num mt-3 text-xs text-ink/50">{g.topic} · {fmt.date(g.date)}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pb-14 sm:px-6">
        <div className="mt-8 overflow-hidden rounded-sm border border-ink/10">
          <Component />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a href={g.image} download={`${g.slug}.png`} className="rounded-sm bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-action-dark">Download image (PNG)</a>
          {g.related && <Link to={g.related.to} className="rounded-sm border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-action hover:text-white">{g.related.label}</Link>}
        </div>

        <p className="sr-only">{g.summary}</p>
        <p className="mt-6 max-w-3xl leading-body text-ink/80">{g.summary}</p>

        <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Data</h2>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                {g.table.head.map((h, k) => <th key={h} scope="col" className={`px-3 py-2 font-semibold ${k ? 'text-right' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {g.table.rows.map((r) => (
                <tr key={r[0]} className="border-b border-ink/10 last:border-0">
                  {r.map((c, k) => <td key={k} className={`num px-3 py-2 ${k ? 'text-right' : ''}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Source: {g.source}. See the <Link to="/methodology" className="text-brand hover:underline">methodology</Link>. Not investment advice.</p>

        <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Share or embed</h2>
        <p className="mb-2 text-sm text-ink/70">Free to use with credit and a link back. This code does both.</p>
        <textarea readOnly value={embed} rows={4} onFocus={(e) => e.target.select()} className="num w-full rounded-sm border border-ink/20 bg-panel p-3 text-xs" aria-label="Embed code" />
        <button type="button" onClick={copy} className="mt-2 rounded-sm border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-action hover:text-white">{copied ? 'Copied' : 'Copy embed code'}</button>
      </div>
    </>
  )
}
