// Manual fallback only (no schedule). From 13 Nov 2026 CPCB downloads failed on GitHub's
// servers; the cause was CPCB's expired certificate, now handled in expired-cert-fetch.mjs,
// so update-aqi fetches directly again. If CPCB ever does block GitHub, the PC downloads CPCB's daily AQI bulletins (PDF) into
// cpcb-pdfs/; the workflow uploads them as a run artifact and then asks update-aqi to parse
// them on GitHub's servers (which have pdftotext). Nothing is committed from here.
//   node scripts/data/fetch-cpcb.mjs fetch      download today and the previous DAYS days
//   node scripts/data/fetch-cpcb.mjs dispatch   start update-aqi with this run's artifact
import fs from 'node:fs'
import path from 'node:path'
import { download } from './expired-cert-fetch.mjs'

const DIR = 'cpcb-pdfs'
const DAYS = Number(process.env.DAYS || 4)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)

async function fetchAll() {
  fs.mkdirSync(DIR, { recursive: true })
  let got = 0
  for (let i = 0; i <= DAYS; i++) {
    const ymd = addDays(istToday(), -i).replace(/-/g, '')
    const url = `https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_${ymd}.pdf`
    try {
      const r = await download(url, { headers: { 'User-Agent': UA } })
      const buf = r.buffer
      if (r.status === 200 && buf.subarray(0, 4).toString() === '%PDF') {
        fs.writeFileSync(path.join(DIR, `AQI_Bulletin_${ymd}.pdf`), buf)
        got++
        console.log(`${ymd}: ${buf.length} bytes`)
      } else console.log(`${ymd}: not published (HTTP ${r.status})`)
    } catch (e) { console.log(`${ymd}: ${e.cause?.code || e.message}`) }
  }
  fs.writeFileSync(path.join(DIR, 'count.txt'), String(got))
  console.log(`downloaded ${got}`)
}

async function dispatch() {
  const got = Number(fs.existsSync(path.join(DIR, 'count.txt')) ? fs.readFileSync(path.join(DIR, 'count.txt'), 'utf8') : 0)
  if (!got) { console.log('nothing downloaded; not starting update-aqi'); return }
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/update-aqi.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'india-in-data-bot' },
    body: JSON.stringify({ ref: 'main', inputs: { backfill_days: String(DAYS), bulletins_run_id: String(process.env.GITHUB_RUN_ID) } }),
  })
  console.log(`update-aqi dispatch: HTTP ${r.status}`)
  if (r.status >= 300) { console.error(await r.text()); process.exit(1) }
}

await (process.argv[2] === 'dispatch' ? dispatch() : fetchAll())
