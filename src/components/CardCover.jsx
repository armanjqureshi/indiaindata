import { sectionColorMap } from '../data/content.js'

// Signature element: every card cover is drawn from the article's OWN chart
// data — a generated sparkline/bar glyph on the section's tint. No stock
// images; the data is the artwork.
export default function CardCover({ article, tall = false }) {
  const colors = sectionColorMap[article.section]

  // If an editor has uploaded a real photo for this article, show that.
  // Otherwise fall back to the signature generated sparkline/bar glyph
  // drawn from the article's own chart data — no stock images needed.
  if (article.heroImage) {
    return (
      <div className={`w-full overflow-hidden ${colors.bgLight} ${tall ? 'aspect-[16/8]' : 'aspect-[16/9]'}`}>
        <img
          src={article.heroImage}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  const chart = article.charts && article.charts[0]

  let glyph = null
  if (chart && chart.data && chart.data.length > 1) {
    const key = chart.dataKeys[0]
    const values = chart.data.map((d) => Number(d[key]) || 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const W = 300
    const H = 120
    const pad = 10

    if (chart.type === 'bar' || chart.type === 'stackedBar') {
      const bw = (W - pad * 2) / values.length
      glyph = values.map((v, i) => {
        const h = ((v - min) / range) * (H - pad * 2) * 0.85 + (H - pad * 2) * 0.15
        return (
          <rect
            key={i}
            x={pad + i * bw + bw * 0.18}
            y={H - pad - h}
            width={bw * 0.64}
            height={h}
            fill={colors.hex}
            opacity="0.85"
          />
        )
      })
    } else if (chart.type === 'pie') {
      glyph = (
        <g>
          <circle cx={W / 2} cy={H / 2} r={44} fill="none" stroke={colors.hex} strokeWidth="16" opacity="0.25" />
          <circle
            cx={W / 2}
            cy={H / 2}
            r={44}
            fill="none"
            stroke={colors.hex}
            strokeWidth="16"
            strokeDasharray={`${2 * Math.PI * 44 * 0.55} ${2 * Math.PI * 44}`}
            transform={`rotate(-90 ${W / 2} ${H / 2})`}
            opacity="0.9"
          />
        </g>
      )
    } else {
      const pts = values
        .map((v, i) => {
          const x = pad + (i / (values.length - 1)) * (W - pad * 2)
          const y = H - pad - ((v - min) / range) * (H - pad * 2)
          return `${x},${y}`
        })
        .join(' ')
      const areaPts = `${pad},${H - pad} ${pts} ${W - pad},${H - pad}`
      glyph = (
        <g>
          <polygon points={areaPts} fill={colors.hex} opacity="0.12" />
          <polyline points={pts} fill="none" stroke={colors.hex} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
        </g>
      )
    }
  }

  return (
    <div
      role="img"
      aria-label={chart ? `Chart preview: ${chart.title}` : `${article.title} cover`}
      className={`w-full overflow-hidden ${colors.bgLight} ${tall ? 'aspect-[16/8]' : 'aspect-[16/9]'}`}
    >
      <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <line x1="10" y1="110" x2="290" y2="110" stroke={colors.hex} strokeWidth="1" opacity="0.3" />
        {glyph || (
          <g opacity="0.5">
            <rect x="60" y="70" width="30" height="40" fill={colors.hex} />
            <rect x="110" y="50" width="30" height="60" fill={colors.hex} />
            <rect x="160" y="30" width="30" height="80" fill={colors.hex} />
            <rect x="210" y="55" width="30" height="55" fill={colors.hex} />
          </g>
        )}
      </svg>
    </div>
  )
}
