// Big number + label. Used in the footer stats band, market ticker row,
// and inline in articles/about.
export default function StatBlock({ value, label, sub, direction, inverse = false }) {
  const dirColor = direction === 'up' ? 'text-up' : direction === 'down' ? 'text-down' : ''
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`font-display text-3xl font-semibold leading-none sm:text-4xl ${
          inverse ? 'text-white' : 'text-ink'
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${dirColor}`}>
          {direction === 'up' && <span aria-hidden="true">▲</span>}
          {direction === 'down' && <span aria-hidden="true">▼</span>}
          {sub}
          {direction && <span className="sr-only">{direction === 'up' ? ' (up)' : ' (down)'}</span>}
        </span>
      )}
      <span className={`text-sm leading-body ${inverse ? 'text-white/70' : 'text-ink/60'}`}>{label}</span>
    </div>
  )
}
