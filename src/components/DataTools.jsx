import { useState } from 'react'

// "Use this data" tools for data pages: a CSV download of what the page shows,
// a ready-to-paste citation, and schema.org Dataset markup so search engines
// and AI answer engines can find the data and credit India in Data.

const SITE = 'https://indiaindata.online'
const RAW = 'https://raw.githubusercontent.com/armanjqureshi/indiaindata/main/'

const cell = (v) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// columns: [{ key, label }] or plain strings; rows: array of objects
export function toCsv(columns, rows) {
  const cols = columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : c))
  const head = cols.map((c) => cell(c.label)).join(',')
  const body = rows.map((r) => cols.map((c) => cell(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','))
  return [head, ...body].join('\r\n')
}

export function downloadCsv(filename, columns, rows) {
  const blob = new Blob(['﻿' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const DownloadIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
)

export function CsvButton({ filename, columns, rows, label = 'Download CSV', className = '' }) {
  const disabled = !rows || !rows.length
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => downloadCsv(filename, columns, rows)}
      className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-ink/40 disabled:no-underline ${className}`}
    >
      <DownloadIcon />
      {label}
    </button>
  )
}

const longDate = (iso) => {
  if (!iso) return null
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z')
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function citation({ name, path, asOf, source }) {
  const when = longDate(asOf)
  return `India in Data, "${name}"${when ? `, data as of ${when}` : ''}. ${SITE}${path}${source ? `. Original source: ${String(source).replace(/\.\s*$/, '')}.` : ''}`
}

function datasetLd({ name, description, path, asOf, source, sourceUrl, temporalCoverage, variables, keywords, liveFile }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: `${SITE}${path}`,
    creator: { '@type': 'Organization', name: 'India in Data', url: SITE },
    publisher: { '@type': 'Organization', name: 'India in Data', url: SITE },
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'India' },
  }
  if (asOf) ld.dateModified = String(asOf).slice(0, 10)
  if (temporalCoverage) ld.temporalCoverage = temporalCoverage
  if (keywords?.length) ld.keywords = keywords
  if (variables?.length) ld.variableMeasured = variables
  if (source) ld.isBasedOn = { '@type': 'CreativeWork', name: source, ...(sourceUrl ? { url: sourceUrl } : {}) }
  if (liveFile) ld.distribution = [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: RAW + liveFile }]
  return ld
}

function CopyCitation({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        try {
          navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) })
        } catch { /* clipboard blocked: the text stays selectable */ }
      }}
      className="shrink-0 font-semibold text-brand hover:underline"
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * The "Use this data" block for a data page.
 * dataset: { name, description, path, asOf, source, sourceUrl, temporalCoverage, variables, keywords, liveFile }
 * csv: { filename, columns, rows } (optional; several allowed as an array)
 */
export default function DataPanel({ dataset, csv }) {
  const files = csv ? (Array.isArray(csv) ? csv : [csv]) : []
  const cite = citation(dataset)
  return (
    <section className="mt-10 rounded-xl border border-ink/10 bg-panel p-5 text-sm sm:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd(dataset)) }} />
      <h2 className="font-display text-lg font-semibold">Use this data</h2>
      <p className="mt-1 max-w-3xl leading-body text-ink/70">Download the figures on this page. If you use them, please credit India in Data and the original source.</p>
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {files.map((f) => (
            <CsvButton key={f.filename} {...f} label={f.label || 'Download CSV'} />
          ))}
        </div>
      )}
      <div className="mt-4">
        <p className="text-xs text-ink/60">Cite this</p>
        <div className="mt-1 flex items-start gap-3 rounded-lg border border-ink/10 bg-paper px-3 py-2">
          <p className="min-w-0 flex-1 select-all break-words text-ink/80">{cite}</p>
          <CopyCitation text={cite} />
        </div>
      </div>
    </section>
  )
}
