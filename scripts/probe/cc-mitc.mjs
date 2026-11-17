// One-off probe: download credit card MITC / schedule-of-charges documents from issuers' own sites
// so rates can be read from the primary text. Saves to data/raw/cc/ (pdf, html and pdftotext output).
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = 'data/raw/cc'
fs.mkdirSync(DIR, { recursive: true })
const DOCS = {
  axis_mitc: 'https://www.axisbank.com/docs/default-source/default-document-library/mitc-credit-cards.pdf',
  axis_mitc2: 'https://www.axis.bank.in/docs/default-source/default-document-library/mitc-credit-cards.pdf',
  amex_kfs: 'https://www.americanexpress.com/content/dam/amex/in/legal/mitc/key_fact_Statement.pdf',
  amex_lending: 'https://www.americanexpress.com/content/dam/amex/in/legal/mitc/Lending_MITC_English.pdf',
  axis_kfs_lic: 'https://www.axis.bank.in/cards/credit-card/lic-axis-bank-platinum-credit-card',
}
const out = { runAt: new Date().toISOString(), items: {} }
for (const [key, url] of Object.entries(DOCS)) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA, Accept: '*/*' } })
    const buf = Buffer.from(await r.arrayBuffer())
    const isPdf = buf.subarray(0, 4).toString() === '%PDF'
    const ext = isPdf ? 'pdf' : 'html'
    fs.writeFileSync(`${DIR}/${key}.${ext}`, buf)
    let chars = null
    if (isPdf) {
      try {
        const txt = execFileSync('pdftotext', ['-layout', `${DIR}/${key}.pdf`, '-'], { encoding: 'utf8', maxBuffer: 64e6 })
        fs.writeFileSync(`${DIR}/${key}.txt`, txt)
        chars = txt.length
      } catch (e) { chars = `pdftotext failed: ${e.message.slice(0, 80)}` }
    }
    out.items[key] = { url, status: r.status, finalUrl: r.url, type: r.headers.get('content-type'), lastModified: r.headers.get('last-modified'), bytes: buf.length, isPdf, chars }
  } catch (e) { out.items[key] = { url, error: String(e.cause?.code || e.message) } }
  console.log(key, JSON.stringify(out.items[key]).slice(0, 220))
}
fs.mkdirSync('live/debug', { recursive: true })
fs.writeFileSync('live/debug/cc-probe-2.json', JSON.stringify(out, null, 1))
