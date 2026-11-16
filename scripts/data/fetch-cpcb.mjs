// Runs on the self-hosted runner in India. Since 13 Nov 2026 cpcb.nic.in no longer answers
// GitHub's own servers, so the PC downloads CPCB's daily AQI bulletins (PDF) into
// cpcb-pdfs/; the workflow uploads them as a run artifact and then asks update-aqi to parse
// them on GitHub's servers (which have pdftotext). Nothing is committed from here.
//   node scripts/data/fetch-cpcb.mjs fetch      download today and the previous DAYS days
//   node scripts/data/fetch-cpcb.mjs dispatch   start update-aqi with this run's artifact
import fs from 'node:fs'
import path from 'node:path'

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
      const r = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA } })
      const buf = Buffer.from(await r.arrayBuffer())
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
