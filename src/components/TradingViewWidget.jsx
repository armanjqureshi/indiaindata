import { useEffect, useRef, useState } from 'react'

// Embeds a TradingView widget (free, ~15 min delayed for Indian exchanges).
// Loads only when scrolled near, and re-renders when the site theme changes.
const BASE = 'https://s3.tradingview.com/external-embedding/'

function currentTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export default function TradingViewWidget({ kind, config, height, label }) {
  const host = useRef(null)
  const [theme, setTheme] = useState('dark')
  const [near, setNear] = useState(false)

  useEffect(() => {
    setTheme(currentTheme())
    const mo = new MutationObserver(() => setTheme(currentTheme()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el || near) return
    if (!('IntersectionObserver' in window)) return setNear(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    const el = host.current
    if (!el || !near) return
    el.innerHTML = ''
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    el.appendChild(inner)
    const s = document.createElement('script')
    s.src = `${BASE}embed-widget-${kind}.js`
    s.async = true
    s.innerHTML = JSON.stringify({ ...config, colorTheme: theme, isTransparent: true, locale: 'en' })
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [near, theme, kind, config])

  return (
    <div>
      <div ref={host} className="tradingview-widget-container" style={{ minHeight: height }} aria-label={label} />
      <p className="mt-1 text-xs text-ink/50">
        Live, delayed by about 15 minutes. Chart data via{' '}
        <a href="https://in.tradingview.com/markets/indices/" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
          TradingView
        </a>
        . Our official closing levels are shown separately and updated after each session.
      </p>
    </div>
  )
}

export const TAPE_CONFIG = {
  symbols: [
    { proName: 'NSE:NIFTY', title: 'Nifty 50' },
    { proName: 'BSE:SENSEX', title: 'Sensex' },
    { proName: 'NSE:BANKNIFTY', title: 'Nifty Bank' },
    { proName: 'NSE:INDIAVIX', title: 'India VIX' },
    { proName: 'FX_IDC:USDINR', title: 'USD/INR' },
  ],
  showSymbolLogo: false,
  displayMode: 'adaptive',
}

export const CHART_CONFIG = {
  symbols: [
    ['Nifty 50', 'NSE:NIFTY|1D'],
    ['Sensex', 'BSE:SENSEX|1D'],
    ['Nifty Bank', 'NSE:BANKNIFTY|1D'],
  ],
  chartOnly: false,
  width: '100%',
  height: 420,
  autosize: false,
  showVolume: false,
  showMA: false,
  hideDateRanges: false,
  hideMarketStatus: false,
  hideSymbolLogo: true,
  scalePosition: 'right',
  scaleMode: 'Normal',
  fontSize: '10',
  noTimeScale: false,
  valuesTracking: '1',
  changeMode: 'price-and-percent',
  chartType: 'area',
  lineWidth: 2,
  lineType: 0,
  dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
}
