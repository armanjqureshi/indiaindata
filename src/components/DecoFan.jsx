// Art Deco sunburst: rays and concentric arcs fanning from the bottom centre.
// Pure geometry, drawn in currentColor.
export default function DecoFan({ className = '' }) {
  const rays = Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI - (i * Math.PI) / 14
    return [100 + Math.cos(a) * 96, 100 - Math.sin(a) * 96]
  })
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.2">
      {rays.map(([x, y], i) => (
        <line key={i} x1="100" y1="100" x2={x} y2={y} />
      ))}
      {[28, 52, 76, 96].map((r) => (
        <path key={r} d={`M${100 - r},100 A${r},${r} 0 0 1 ${100 + r},100`} />
      ))}
    </svg>
  )
}
