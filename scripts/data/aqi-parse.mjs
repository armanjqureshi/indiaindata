// Parses CPCB's daily AQI bulletin (the PDF at cpcb.nic.in/upload/Downloads/AQI_Bulletin_YYYYMMDD.pdf,
// "Air Quality Index on <date> @ 4 PM, average of past 24 hours") after `pdftotext -layout`.
// Returns { date, cities: [{ name, category, aqi, pollutants, stations, totalStations }], absent: [names] }.
// Rows that do not parse cleanly are reported in `problems`, never guessed.

const CATS = ['Very Poor', 'Severe', 'Satisfactory', 'Moderate', 'Good', 'Poor']
const CAT_RE = /\b(Very Poor|Severe|Satisfactory|Moderate|Good|Poor)\b/
const POLL_RE = /\b(PM2\.5|PM10|O3|NO2|SO2|CO|NH3|Pb)\b/g
const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }

export const AQI_BANDS = [
  { cat: 'Good', min: 0, max: 50 }, { cat: 'Satisfactory', min: 51, max: 100 }, { cat: 'Moderate', min: 101, max: 200 },
  { cat: 'Poor', min: 201, max: 300 }, { cat: 'Very Poor', min: 301, max: 400 }, { cat: 'Severe', min: 401, max: 500 },
]
export const categoryOf = (aqi) => (AQI_BANDS.find((b) => aqi >= b.min && aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1]).cat

export function parseBulletin(text) {
  const out = { date: null, cities: [], absent: [], problems: [] }
  const dm = text.match(/Air Quality Index on\s+([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s+(\d{4})/)
  if (dm) out.date = `${dm[3]}-${MONTHS[dm[1].toLowerCase()]}-${dm[2].padStart(2, '0')}`

  const [table, tail = ''] = text.split(/Cities absent in AQI Bulletin/i)
  // table rows are blocks of non-empty lines separated by blank lines
  const lines = table.split('\n')
  const blocks = []
  let cur = []
  // page headers repeat on every page and can sit right under a row with no blank line
  const HEADER = /^\s*(Air Quality Index on|\(Average of past|No\. of Stations|Index\s*$|S\.No|Value\s*$|Total Stations|Participated)/
  for (const l of lines) {
    if (l.trim() === '' || HEADER.test(l)) { if (cur.length) blocks.push(cur); cur = [] } else cur.push(l)
  }
  if (cur.length) blocks.push(cur)

  for (const b of blocks) {
    const snoIdx = b.findIndex((l) => /^\s*\d{1,3}\s{2,}\S/.test(l) || /^\s*\d{1,3}\s+\d{1,3}\s+\d+\/\d+\s*$/.test(l))
    if (snoIdx < 0) continue
    if (b.some((l) => /S\.No|Air Quality Index on|Average of past|Health Statements|Notes:/i.test(l))) continue
    const parts = b.map((l, i) => (i === snoIdx ? l.replace(/^\s*(\d{1,3})\s+/, ' ') : l))
    const sno = Number(b[snoIdx].match(/^\s*(\d{1,3})/)[1])
    let joined = parts.join(' ')
    const ratio = joined.match(/(\d+)\s*\/\s*(\d+)/)
    const cat = joined.match(CAT_RE)
    const pollutants = [...new Set([...joined.matchAll(POLL_RE)].map((m) => m[1]))]
    joined = joined.replace(/(\d+)\s*\/\s*(\d+)/, ' ').replace(CAT_RE, ' ').replace(POLL_RE, ' ').replace(/,/g, ' ')
    const nums = [...joined.matchAll(/(?<![\w.])(\d{1,3})(?![\w.])/g)].map((m) => Number(m[1]))
    const name = joined.replace(/(?<![\w.])\d{1,3}(?![\w.])/g, ' ').replace(/\s+/g, ' ').trim()
    const aqi = nums.length === 1 ? nums[0] : null
    const row = { sno, name, category: cat?.[1] || null, aqi, pollutants, stations: ratio ? Number(ratio[1]) : null, totalStations: ratio ? Number(ratio[2]) : null }
    const ok = row.name && row.category && row.aqi != null && row.aqi >= 0 && row.aqi <= 500 && CATS.includes(row.category) && categoryOf(row.aqi) === row.category && row.stations != null
    if (ok) out.cities.push(row)
    else out.problems.push({ block: b.join(' | ').replace(/\s+/g, ' ').slice(0, 200), row })
  }
  // serial numbers should run 1..n without gaps
  const snos = out.cities.map((c) => c.sno)
  const max = Math.max(0, ...snos)
  const missing = []
  for (let i = 1; i <= max; i++) if (!snos.includes(i)) missing.push(i)
  if (missing.length) out.problems.push({ missingSerials: missing })

  if (tail) {
    out.absent = [...tail.replace(/\n/g, ' ').matchAll(/\d+\)\s*([^,]+?)(?=,\s*\d+\)|,?\s*$|\s{2,})/g)].map((m) => m[1].trim()).filter((s) => s && !/Air Quality Index|Average of past/i.test(s))
  }
  return out
}
