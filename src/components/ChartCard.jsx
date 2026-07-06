import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { sectionColorMap } from '../data/content.js'

const STACK_PALETTE = ['#0E6E6E', '#4A6FA5', '#B45309', '#7E3FA8', '#9CA3AF']
const PIE_PALETTE = ['#0E6E6E', '#4A6FA5', '#B45309', '#7E3FA8', '#1E7F4F']

const axisStyle = { fontSize: 12, fill: '#1A1A1A', fontFamily: 'Inter, sans-serif' }
const gridStroke = '#1A1A1A14'

function ChartBody({ chart, accent }) {
  const height = 300
  const margin = { top: 8, right: 12, bottom: 4, left: 0 }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chart.data} margin={margin}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey={chart.xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1A1A1A33' }} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} />
          <Tooltip formatter={(v) => [`${v}${chart.unit || ''}`]} />
          {chart.dataKeys.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={accent}
              strokeWidth={2.5}
              dot={{ r: 3, fill: accent, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chart.data} margin={margin}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey={chart.xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1A1A1A33' }} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} />
          <Tooltip formatter={(v) => [`${v}${chart.unit || ''}`]} />
          {chart.dataKeys.map((k) => (
            <Area key={k} type="monotone" dataKey={k} stroke={accent} strokeWidth={2.5} fill={accent} fillOpacity={0.14} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'bar') {
    const multi = chart.dataKeys.length > 1
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chart.data} margin={margin}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey={chart.xKey}
            tick={{ ...axisStyle, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#1A1A1A33' }}
            interval={0}
            angle={chart.data.length > 6 ? -30 : 0}
            textAnchor={chart.data.length > 6 ? 'end' : 'middle'}
            height={chart.data.length > 6 ? 60 : 30}
          />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => [`${v}${chart.unit || ''}`]} cursor={{ fill: '#1A1A1A0A' }} />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {chart.dataKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={multi ? STACK_PALETTE[i] : accent} radius={[3, 3, 0, 0]} maxBarSize={56} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'stackedBar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chart.data} margin={margin}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey={chart.xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1A1A1A33' }} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => [`${v}${chart.unit || ''}`]} cursor={{ fill: '#1A1A1A0A' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.dataKeys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="stack" fill={STACK_PALETTE[i % STACK_PALETTE.length]} maxBarSize={72} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chart.data}
            dataKey={chart.dataKeys[0]}
            nameKey={chart.nameKey || 'name'}
            innerRadius={64}
            outerRadius={104}
            paddingAngle={2}
            label={({ name, value }) => `${name} ${value}${chart.unit || ''}`}
            labelLine={false}
          >
            {chart.data.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${v}${chart.unit || ''}`]} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return null
}

export default function ChartCard({ chart, sectionSlug = 'blogs', caption }) {
  const accent = (sectionColorMap[sectionSlug] || sectionColorMap.blogs).hex

  return (
    <figure className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm">
      <div className="border-b border-ink/10 px-5 py-4 sm:px-6">
        <h3 className="font-display text-lg font-semibold leading-snug">{chart.title}</h3>
        {chart.subtitle && <p className="mt-0.5 text-sm text-ink/60">{chart.subtitle}</p>}
      </div>
      <div className="px-2 py-4 sm:px-4">
        <ChartBody chart={chart} accent={accent} />
      </div>
      {caption && (
        <figcaption className="px-5 pb-3 text-sm leading-body text-ink/70 sm:px-6">{caption}</figcaption>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-paper px-5 py-2.5 text-xs text-ink/50 sm:px-6">
        <span>Source: {chart.source}</span>
        <span className="inline-flex items-center gap-1 font-medium text-brand">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
          </svg>
          Share or embed this chart
        </span>
      </div>
    </figure>
  )
}
