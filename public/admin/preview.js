/*
 * India in Data — Decap CMS customizations.
 *
 * Two things live here:
 *  1. Preview templates so editors see something close to the real,
 *     styled page while writing — not a blank list of form fields.
 *  2. A custom widget that validates the chart "data" JSON field live,
 *     so a typo shows an immediate warning instead of silently breaking
 *     a chart after publish.
 *
 * This file is loaded via a plain <script> tag (see admin/index.html),
 * not through a bundler, so it uses Decap's documented globals for that
 * setup: `createClass` (create-react-class) and `h` (React.createElement).
 * Every render is wrapped defensively — if a field is missing or shaped
 * unexpectedly, the preview shows a fallback instead of crashing.
 */

// Cosmetic-only lookup so the preview can show a real name instead of the
// raw "meera-kulkarni" slug the author relation field stores. This is NOT
// the real data source (that's content/team/*.json, resolved at build
// time) — it only affects what the preview pane displays while editing.
// If you add a new team member, add them here too so their name shows up
// correctly in previews; if you forget, the preview just falls back to
// showing their slug, which is harmless.
var TEAM_NAMES = {
  'sarah-qureshi': 'Sarah Qureshi',
}

var CATEGORY_COLORS = {
  news: '#4A6FA5',
  business: '#4F46B8',
  market: '#1E7F4F',
  markets: '#1E7F4F',
  blogs: '#0E6E6E',
  economy: '#B45309',
  society: '#7E3FA8',
  policy: '#4A6FA5',
  prices: '#B45309',
  growth: '#4F46B8',
  employment: '#7E3FA8',
  monetary: '#4A6FA5',
  external: '#1E7F4F',
  'public-finance': '#B45309',
  'real-time': '#0E6E6E',
  flows: '#4F46B8',
  'currency-commodities': '#7E3FA8',
  markets: '#1E7F4F',
  open: '#1E7F4F',
  upcoming: '#4A6FA5',
  closed: '#B45309',
  listed: '#0E6E6E',
}

function safeGet(entry, path, fallback) {
  try {
    var v = entry.getIn(path)
    return v === undefined || v === null ? fallback : v
  } catch (e) {
    return fallback
  }
}

function categoryBadge(label, colorKey) {
  var color = CATEGORY_COLORS[colorKey] || '#1A1A1A'
  return h(
    'span',
    {
      style: {
        display: 'inline-block',
        background: color,
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: '999px',
        marginBottom: '12px',
      },
    },
    label
  )
}

// ---------------------------------------------------------------- Articles
var ArticlePreview = createClass({
  render: function () {
    try {
      var entry = this.props.entry
      var title = safeGet(entry, ['data', 'title'], 'Untitled article')
      var dek = safeGet(entry, ['data', 'dek'], '')
      var section = safeGet(entry, ['data', 'section'], '')
      var authorSlug = safeGet(entry, ['data', 'author'], '')
      var authorName = TEAM_NAMES[authorSlug] || authorSlug || 'Unknown author'
      var date = safeGet(entry, ['data', 'date'], '')

      var bodyBlocks = []
      try {
        this.props.widgetsFor('body').forEach(function (block, i) {
          var type = block.getIn(['data', 'type'])
          var text = block.getIn(['data', 'text'])
          if (type === 'heading') {
            bodyBlocks.push(h('h2', { key: i, style: { fontFamily: 'Fraunces, Georgia, serif', marginTop: '24px' } }, text))
          } else if (type === 'quote') {
            bodyBlocks.push(
              h(
                'blockquote',
                {
                  key: i,
                  style: {
                    borderLeft: '4px solid ' + (CATEGORY_COLORS[section] || '#0E6E6E'),
                    background: '#F5F5F0',
                    padding: '14px 18px',
                    margin: '18px 0',
                    fontFamily: 'Fraunces, Georgia, serif',
                    fontSize: '18px',
                  },
                },
                text
              )
            )
          } else if (type === 'chart') {
            bodyBlocks.push(
              h(
                'div',
                {
                  key: i,
                  style: {
                    border: '1px dashed #ccc',
                    borderRadius: '8px',
                    padding: '20px',
                    margin: '18px 0',
                    textAlign: 'center',
                    color: '#888',
                    fontSize: '13px',
                  },
                },
                '[ Chart will render here on the live site ]'
              )
            )
          } else {
            bodyBlocks.push(h('p', { key: i, style: { lineHeight: 1.7 } }, text))
          }
        })
      } catch (e) {
        // If body isn't set yet on a brand-new entry, just skip it.
      }

      return h(
        'div',
        { style: { maxWidth: '720px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif', color: '#1A1A1A' } },
        categoryBadge(section, section),
        h('h1', { style: { fontFamily: 'Fraunces, Georgia, serif', fontSize: '34px', lineHeight: 1.15, margin: '0 0 12px' } }, title),
        h('p', { style: { fontSize: '17px', color: '#555', marginBottom: '16px' } }, dek),
        h('p', { style: { fontSize: '13px', color: '#888', marginBottom: '24px' } }, authorName + (date ? ' · ' + date : '')),
        h('div', {}, bodyBlocks)
      )
    } catch (e) {
      return h('div', { style: { padding: '20px', color: '#C0392B' } }, 'Preview unavailable for this entry yet.')
    }
  },
})

// -------------------------------------------------------------- Indicators
var IndicatorPreview = createClass({
  render: function () {
    try {
      var entry = this.props.entry
      var name = safeGet(entry, ['data', 'name'], 'Untitled indicator')
      var category = safeGet(entry, ['data', 'category'], '')
      var currentValue = safeGet(entry, ['data', 'currentValue'], '—')
      var change = safeGet(entry, ['data', 'change'], '')
      var direction = safeGet(entry, ['data', 'direction'], '')
      var description = safeGet(entry, ['data', 'description'], '')
      var source = safeGet(entry, ['data', 'source'], '')
      var arrow = direction === 'up' ? '▲ ' : direction === 'down' ? '▼ ' : ''
      var changeColor = direction === 'up' ? '#1E7F4F' : direction === 'down' ? '#C0392B' : '#555'

      return h(
        'div',
        { style: { maxWidth: '640px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif', color: '#1A1A1A' } },
        categoryBadge(category, category),
        h('h1', { style: { fontFamily: 'Fraunces, Georgia, serif', fontSize: '30px', margin: '0 0 16px' } }, name),
        h('p', { style: { fontSize: '36px', fontWeight: 700, margin: '0 0 4px' } }, currentValue),
        h('p', { style: { fontSize: '14px', fontWeight: 700, color: changeColor, marginBottom: '20px' } }, arrow + change),
        h('p', { style: { fontSize: '15px', lineHeight: 1.6, color: '#444', marginBottom: '12px' } }, description),
        h('p', { style: { fontSize: '12px', color: '#888' } }, 'Source: ' + source)
      )
    } catch (e) {
      return h('div', { style: { padding: '20px', color: '#C0392B' } }, 'Preview unavailable for this entry yet.')
    }
  },
})

// -------------------------------------------------------------------- IPOs
var IpoPreview = createClass({
  render: function () {
    try {
      var entry = this.props.entry
      var companyName = safeGet(entry, ['data', 'companyName'], 'Unnamed company')
      var sector = safeGet(entry, ['data', 'sector'], '')
      var status = safeGet(entry, ['data', 'status'], '')
      var description = safeGet(entry, ['data', 'description'], '')
      var priceBand = safeGet(entry, ['data', 'priceBand'], '')
      var currentPrice = safeGet(entry, ['data', 'currentPrice'], '')
      var currentGain = safeGet(entry, ['data', 'currentGain'], '')
      var issueSize = safeGet(entry, ['data', 'issueSize'], '')

      var highlightItems = []
      try {
        this.props.widgetsFor('highlights').forEach(function (item, i) {
          // Plain string-list items may come through as a raw string, or
          // wrapped in a {data: ...} shape depending on widget internals —
          // try the likely shapes rather than assuming one.
          var text = typeof item === 'string' ? item : item && item.data !== undefined ? item.data : ''
          highlightItems.push(h('li', { key: i, style: { marginBottom: '6px' } }, text))
        })
      } catch (e) {}

      return h(
        'div',
        { style: { maxWidth: '640px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif', color: '#1A1A1A' } },
        categoryBadge(status, status),
        h('h1', { style: { fontFamily: 'Fraunces, Georgia, serif', fontSize: '30px', margin: '0 0 4px' } }, companyName),
        h('p', { style: { fontSize: '13px', color: '#888', marginBottom: '16px' } }, sector),
        status === 'listed'
          ? h('div', { style: { marginBottom: '16px' } },
              h('p', { style: { fontSize: '30px', fontWeight: 700, margin: 0 } }, currentPrice),
              h('p', { style: { fontSize: '13px', fontWeight: 700, color: '#1E7F4F' } }, currentGain + ' since issue')
            )
          : h('p', { style: { fontSize: '20px', fontWeight: 700, marginBottom: '16px' } }, priceBand),
        h('p', { style: { fontSize: '15px', lineHeight: 1.6, color: '#444', marginBottom: '16px' } }, description),
        h('ul', { style: { fontSize: '14px', paddingLeft: '18px', marginBottom: '12px' } }, highlightItems),
        h('p', { style: { fontSize: '12px', color: '#888' } }, 'Issue size: ' + issueSize)
      )
    } catch (e) {
      return h('div', { style: { padding: '20px', color: '#C0392B' } }, 'Preview unavailable for this entry yet.')
    }
  },
})

CMS.registerPreviewTemplate('articles', ArticlePreview)
CMS.registerPreviewTemplate('indicators', IndicatorPreview)
CMS.registerPreviewTemplate('ipos', IpoPreview)
CMS.registerPreviewStyle('/admin/preview.css')

// ------------------------------------------------- Validated chart-data widget
// Replaces a plain freehand text box for the chart "data" field with one
// that shows a live "valid / invalid JSON" indicator as you type. It never
// blocks saving — if something looks wrong you still can save and fix it
// later — it just makes a broken chart visible immediately instead of
// silently, only after the site rebuilds.
var JSONDataControl = createClass({
  getInitialState: function () {
    return this.validate(this.props.value)
  },
  validate: function (value) {
    if (!value) return { error: null, count: 0 }
    try {
      var parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        return { error: 'This should be a JSON array — it should start with [ and end with ].', count: 0 }
      }
      return { error: null, count: parsed.length }
    } catch (e) {
      return { error: e.message, count: 0 }
    }
  },
  handleChange: function (e) {
    var val = e.target.value
    this.props.onChange(val)
    this.setState(this.validate(val))
  },
  render: function () {
    var ok = !this.state.error
    return h(
      'div',
      {},
      h('textarea', {
        id: this.props.forID,
        className: this.props.classNameWrapper,
        value: this.props.value || '',
        onChange: this.handleChange,
        rows: 7,
        style: {
          width: '100%',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '13px',
          padding: '10px',
          boxSizing: 'border-box',
          border: '1px solid ' + (ok ? '#ccc' : '#C0392B'),
          borderRadius: '4px',
        },
      }),
      h(
        'div',
        {
          style: {
            marginTop: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: ok ? '#1E7F4F' : '#C0392B',
          },
        },
        ok
          ? '\u2713 Valid JSON — ' + this.state.count + ' data point' + (this.state.count === 1 ? '' : 's')
          : '\u2715 Invalid JSON: ' + this.state.error
      )
    )
  },
})

CMS.registerWidget('json-data-validator', JSONDataControl)
