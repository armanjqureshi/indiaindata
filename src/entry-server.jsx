import './data/live-server.js'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App.jsx'
import { __collectUsed, getMarketSnapshot, getMeta } from './data/live.js'

// Called once per route at build time by scripts/prerender.mjs. Returns the
// HTML and the live-data snapshots the page read, which prerender embeds so
// the browser hydrates with identical data.
export function render(url) {
  __collectUsed()
  getMarketSnapshot()
  getMeta()
  const html = renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  )
  return { html, live: __collectUsed() }
}
