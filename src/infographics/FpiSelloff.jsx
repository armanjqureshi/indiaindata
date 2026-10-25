import { forwardRef } from 'react'
import { FPI_DAYS, NSE_DAYS } from './fpiSelloffData.js'

// Fixed palette so the picture looks the same on screen and when exported as PNG.
const C = { bg: '#0b151e', panel: '#122230', ink: '#e8eef3', mute: '#8fa3b3', line: '#2a4052', down: '#f0605d', up: '#3dd6a0', accent: '#ff9a3c' }
const F = 'Inter, "Helvetica Neue", Arial, sans-serif'
const fmt = (n, d = 0) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

const total = FPI_DAYS.reduce((s, r) => s + r.v, 0)
const firstSix = FPI_DAYS.slice(0, 6).reduce((s, r) => s + r.v, 0)
const rest = total - firstSix
const share = Math.round((firstSix / total) * 100)
const restInflow = FPI_DAYS.slice(6).filter((r) => r.v > 0).length
const restDays = FPI_DAYS.length - 6
const biggest = FPI_DAYS.reduce((a, b) => (b.v < a.v ? b : a))
let run = 0
const cum = FPI_DAYS.map((r) => ({ ...r, c: (run += r.v) }))
const low = cum.reduce((a, b) => (b.c < a.c ? b : a))
const day = (iso) => String(Number(iso.slice(8)))

const FpiSelloff = forwardRef(function FpiSelloff(_, ref) {
  // chart A: diverging bars
  const ax0 = 80, aw = 1040, zeroY = 520, downH = 330, upH = 90
  const bw = 52, step = aw / FPI_DAYS.length
  const maxDown = Math.abs(biggest.v)
  const barX = (i) => ax0 + i * step + (step - bw) / 2
  const barH = (v) => (v < 0 ? (Math.abs(v) / maxDown) * downH : (v / 2643.24) * upH)
  // chart B: running total
  const bx0 = 80, bw2 = 1040, byTop = 1290, byH = 150
  const minC = low.c
  const cx = (i) => bx0 + (i + 0.5) * (bw2 / FPI_DAYS.length)
  const cy = (c) => byTop + (-c / -minC) * byH
  const path = cum.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${cy(p.c).toFixed(1)}`).join(' ')

  const nse = NSE_DAYS.reduce((a, r) => ({ fii: a.fii + r.fii, dii: a.dii + r.dii }), { fii: 0, dii: 0 })
  const nmax = Math.max(Math.abs(nse.fii), nse.dii)

  return (
    <svg ref={ref} viewBox="0 0 1200 1840" xmlns="http://www.w3.org/2000/svg" role="img" fontFamily={F}
      aria-label={`Foreign investors net sold ₹${fmt(total)} crore of Indian shares over 15 trading days in October 2026. ${share} per cent of it came in the first six sessions.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect width="1200" height="1840" fill={C.bg} />

      {/* headline */}
      <text x="80" y="82" fill={C.accent} fontSize="22" fontWeight="700" letterSpacing="3">INDIA IN DATA  ·  FPI FLOWS</text>
      <text x="80" y="160" fill={C.ink} fontSize="58" fontWeight="800">Foreign investors pulled</text>
      <text x="80" y="228" fill={C.down} fontSize="72" fontWeight="800">₹{fmt(total)} crore</text>
      <text x="80" y="288" fill={C.ink} fontSize="40" fontWeight="700">out of Indian shares in 15 trading days</text>
      <text x="80" y="332" fill={C.mute} fontSize="22">Net FPI equity flows by trading day, 1 to 23 October 2026, ₹ crore</text>

      {/* chart A */}
      <line x1={ax0} x2={ax0 + aw} y1={zeroY} y2={zeroY} stroke={C.mute} strokeWidth="2" />
      <rect x="80" y="362" width="16" height="16" rx="2" fill={C.up} />
      <text x="104" y="376" fill={C.mute} fontSize="18">Net buying</text>
      <rect x="220" y="362" width="16" height="16" rx="2" fill={C.down} />
      <text x="244" y="376" fill={C.mute} fontSize="18">Net selling  ·  figures in ₹ thousand crore (k), by trading day in October</text>
      {FPI_DAYS.map((r, i) => {
        const h = barH(r.v)
        const x = barX(i)
        return (
          <g key={r.date}>
            <rect x={x} y={r.v < 0 ? zeroY : zeroY - h} width={bw} height={h} rx="3" fill={r.v < 0 ? C.down : C.up} opacity={i < 6 ? 1 : 0.82} />
            <text x={x + bw / 2} y={r.v < 0 ? zeroY + h + 22 : zeroY - h - 8} textAnchor="middle" fill={C.ink} fontSize="17" fontWeight="600">
              {r.v < 0 ? '−' : '+'}{fmt(r.v / 1000, 1)}k
            </text>
            <text x={x + bw / 2} y={r.v < 0 ? zeroY - 10 : zeroY + 26} textAnchor="middle" fill={C.mute} fontSize="17">{day(r.date)}</text>
          </g>
        )
      })}

      {/* bracket: first six */}
      <path d={`M${barX(0)},${zeroY + downH + 62} V${zeroY + downH + 72} H${barX(5) + bw} V${zeroY + downH + 62}`} stroke={C.accent} strokeWidth="3" fill="none" />
      <text x={(barX(0) + barX(5) + bw) / 2} y={zeroY + downH + 104} textAnchor="middle" fill={C.accent} fontSize="26" fontWeight="800">
        First six sessions: ₹{fmt(firstSix)} cr out
      </text>
      <path d={`M${barX(6)},${zeroY + downH + 62} V${zeroY + downH + 72} H${barX(14) + bw} V${zeroY + downH + 62}`} stroke={C.mute} strokeWidth="3" fill="none" />
      <text x={(barX(6) + barX(14) + bw) / 2} y={zeroY + downH + 104} textAnchor="middle" fill={C.ink} fontSize="26" fontWeight="800">
        Next nine: ₹{fmt(rest)} cr out
      </text>
      <text x={(barX(6) + barX(14) + bw) / 2} y={zeroY + downH + 134} textAnchor="middle" fill={C.mute} fontSize="19">{restInflow} of {restDays} sessions saw net buying</text>

      {/* biggest-day callout */}
      <text x={barX(5) + bw + 14} y={zeroY + 150} fill={C.ink} fontSize="19" fontWeight="700">
        <tspan x={barX(5) + bw + 14}>9 Oct: biggest day,</tspan>
        <tspan x={barX(5) + bw + 14} dy="24">₹{fmt(biggest.v)} cr out</tspan>
      </text>
      <path d={`M${barX(5) + bw + 10},${zeroY + 160} L${barX(5) + bw + 2},${zeroY + 200}`} stroke={C.mute} strokeWidth="1.5" fill="none" />

      {/* big stat */}
      <rect x="80" y="1075" width="1040" height="2" fill={C.line} />
      <text x="80" y="1160" fill={C.accent} fontSize="84" fontWeight="800">{share}%</text>
      <text x="300" y="1135" fill={C.ink} fontSize="28" fontWeight="700">of the month’s net selling came in the first six sessions</text>
      <text x="300" y="1170" fill={C.mute} fontSize="22">By 9 October, ₹{fmt(firstSix)} cr had gone. Since then the net flow has been small.</text>

      {/* chart B */}
      <text x="80" y="1250" fill={C.ink} fontSize="26" fontWeight="800">Running total for October</text>
      <line x1={bx0} x2={bx0 + bw2} y1={byTop} y2={byTop} stroke={C.mute} strokeWidth="1.5" />
      <path d={`${path} L${cx(14)},${byTop} L${cx(0)},${byTop} Z`} fill={C.down} opacity="0.16" />
      <path d={path} fill="none" stroke={C.down} strokeWidth="4" strokeLinejoin="round" />
      <circle cx={cx(cum.indexOf(low))} cy={cy(low.c)} r="7" fill={C.down} />
      <text x={cx(cum.indexOf(low)) - 20} y={cy(low.c) + 6} textAnchor="end" fill={C.ink} fontSize="19" fontWeight="700">Low, {day(low.date)} Oct: −₹{fmt(low.c)} cr</text>
      <circle cx={cx(14)} cy={cy(cum[14].c)} r="7" fill={C.ink} />
      <text x={cx(14)} y={cy(cum[14].c) + 34} textAnchor="end" fill={C.ink} fontSize="19" fontWeight="700">23 Oct: −₹{fmt(total)} cr</text>
      <text x={bx0} y={byTop - 10} fill={C.mute} fontSize="17">₹0</text>

      {/* panel C: DIIs */}
      <rect x="80" y="1500" width="1040" height="230" rx="10" fill={C.panel} />
      <text x="110" y="1547" fill={C.ink} fontSize="26" fontWeight="800">Meanwhile, domestic institutions kept buying</text>
      <text x="110" y="1577" fill={C.mute} fontSize="19">Net cash-market flows, last four sessions (19, 21, 22 and 23 Oct), ₹ crore</text>
      <text x="110" y="1637" fill={C.mute} fontSize="22" fontWeight="600">DIIs</text>
      <rect x="230" y="1613" width={(nse.dii / nmax) * 640} height="34" rx="3" fill={C.up} />
      <text x={230 + (nse.dii / nmax) * 640 + 14} y="1638" fill={C.ink} fontSize="24" fontWeight="800">+₹{fmt(nse.dii)} cr</text>
      <text x="110" y="1695" fill={C.mute} fontSize="22" fontWeight="600">FIIs</text>
      <rect x="230" y="1671" width={(Math.abs(nse.fii) / nmax) * 640} height="34" rx="3" fill={C.down} />
      <text x={230 + (Math.abs(nse.fii) / nmax) * 640 + 14} y="1696" fill={C.ink} fontSize="24" fontWeight="800">−₹{fmt(nse.fii)} cr</text>

      {/* footer */}
      <text x="80" y="1788" fill={C.mute} fontSize="16">Sources: NSDL, trends in FPI investment (equity, all routes), top and middle; NSE provisional FII/DII trading data, bottom panel.</text>
      <text x="80" y="1812" fill={C.mute} fontSize="16">The two sources measure flows differently and are not directly comparable. Data to 23 October 2026. FPI flows are revised.</text>
      <text x="1120" y="82" textAnchor="end" fill={C.mute} fontSize="18">indiaindata.online</text>
    </svg>
  )
})

export default FpiSelloff
