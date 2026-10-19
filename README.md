# India in Data

A data-driven editorial website for **indiaindata.online** — chart-led stories
about India's news, business, markets and economy.

Built with React + Vite + Tailwind CSS + Recharts + React Router, **prerendered
to static HTML** for search engines, and editable through **Decap CMS** so
articles, images, and page copy can be updated without touching code.

---

## 1. What's in this project

- The site itself: same design and components as before (Home, News,
  Business, Market, Blogs, topic pages, article pages, search, About, Contact).
- **Prerendering**: every page is rendered to real, finished HTML at build
  time (`scripts/prerender.mjs`), so Google receives full article text
  immediately instead of an empty JavaScript shell. The site is still fully
  interactive after that HTML loads — charts, search, and filters all work
  exactly as before.
- **Auto-generated `sitemap.xml`** (`scripts/generate-sitemap.mjs`), built
  from the same content, so it's always accurate.
- **Decap CMS admin** at `/admin` — a login screen and editor for articles,
  images, and page text, with no code editing required day to day.

## 2. Content lives in `/content`, not in one big file

Instead of one large `content.js`, editorial content is now plain JSON files:

```
content/
  articles/*.json        one file per article — the main thing you'll edit
  indicators/*.json      one file per tracked indicator (CPI, GDP, repo rate,
                         Nifty, UPI transactions, and 21 others) — update the
                         current value whenever fresh data drops
  ipos/*.json            one file per IPO — upcoming, open, closed, or listed.
                         Move an IPO through its lifecycle by updating its
                         "status" field, and add price/listing data as it
                         becomes available.
  authors.json           the team grid shown on the About page
  pages/home.json        homepage hero headline + subtitle
  pages/about.json       About page heading/intro/using-our-work text
  pages/contact.json     Contact page intro line
  settings/site.json     section/topic descriptions, market ticker demo
                         values, footer stats band numbers
```

The **Indicators** section (`/indicators`) is a permanent, always-current
reference — 25 of India's key economic and market numbers (prices, growth,
employment, monetary policy, external sector, public finance, markets, and
real-time proxies like UPI transactions), each with its current value,
direction, full history chart, definition, source, and release schedule.

The **IPOs** section (`/ipos`) tracks the IPO pipeline across four stages —
upcoming, open for subscription, closed and awaiting listing, and listed —
with price bands, subscription levels, and a performance chart once a
company starts trading. Move an IPO forward by editing its `status` field
through `/admin`; the site regroups it automatically.

**Note on the seed data:** the 12 IPOs shipped with this project use
clearly fictional company names (Suryodaya Renewables, Kaveri FinTech, and
so on), not real companies. Unlike the generic macro indicators, IPO data
is inherently about specific, identifiable companies and their real stock
performance — inventing numbers for a real, named company would be
publishing false financial claims about them, not just placeholder data.
Replace these entries with real IPOs and real, sourced figures before this
section goes live.

Articles automatically show up as "related stories" on any indicator or
IPO that shares a topic tag with them — no manual linking to maintain.

`src/data/content.js` loads all of these at build time and assembles them
into the exact same shapes the app already used — so if you ever want to
edit a file by hand (or with me) instead of through `/admin`, you can, and
nothing else needs to change.

Uploaded images (hero photos, author photos) are saved under
`public/uploads/` and referenced by path from the JSON files.

## 3. One-time setup: GitHub → Netlify → Decap

This is the only part that takes real setup. After it's done, publishing is
just "log in to `/admin`, edit, click Publish."

**a. Put the project on GitHub**
Create a new GitHub repository and push this project to it (a free GitHub
account is all you need).

**b. Connect it to Netlify**
In Netlify, "Add a new site" → "Import from Git" → pick the repo. Because
`netlify.toml` is already in the project, Netlify will automatically use the
right build command (`npm run build`) and publish directory (`dist/client`)
— no manual configuration needed. Then in Netlify's domain settings, point
your domain (indiaindata.online) at the new site; Netlify provisions HTTPS
automatically.

**c. Turn on Netlify Identity + Git Gateway**
In your Netlify site dashboard: **Site configuration → Identity → Enable
Identity**, then **Services → Git Gateway → Enable Git Gateway**. This is
what lets `/admin` log you in and commit your edits back to GitHub on your
behalf, without you ever touching git yourself.

Under Identity settings, set registration to **Invite only**, then invite
yourself (and anyone else who should be able to publish) by email. You'll
get an email with a link to set a password — that password is what you'll
use to log in at `/admin`.

**d. Publish**
Go to `https://indiaindata.online/admin`, log in, and you'll see the
Articles list and Site Pages. Edit, click **Publish** — Decap commits the
change to GitHub, Netlify automatically rebuilds (prerendering included),
and the live site updates within about a minute. No further help from a
developer needed for routine updates.

## 4. Search Console

Once the site is live:

1. Go to search.google.com/search-console → add a **Domain property** for
   `indiaindata.online` (no `https://`, no `www`).
2. Verify via the DNS TXT record Google gives you — add it at your domain
   registrar, then click Verify.
3. Open **Sitemaps**, enter `sitemap.xml`, submit.
4. Use **URL Inspection → Request Indexing** on individual pages if you want
   to nudge them, and check the **Performance** report over the following
   weeks for clicks/impressions/position.

## 5. What Decap can and can't do

**Can, entirely through `/admin`:** add/edit/delete articles, change any
headline or body text whenever you like, upload and swap article hero
images and author photos, edit the About/Contact/Home page copy, edit the
footer stats and market ticker demo numbers, update or add **indicators**
(current value, previous value, direction, and historical chart data), and
manage **IPOs** — add a new one, move it from upcoming → open → closed →
listed as it progresses, and update prices.

**Editing extras built into the CMS:**
- **Live preview** — Articles, Indicators, and IPOs all show a styled
  preview of the actual page while you edit, not a blank form.
- **Team collection** — authors are managed once under "Team," and picked
  per-article from a dropdown (a Decap "relation" field). Fix a typo in
  someone's bio once, and it updates on every article that credits them.
- **Live chart-data validation** — the "Data (advanced)" field on any
  chart shows an immediate "✓ Valid JSON — N data points" or
  "✗ Invalid JSON: ..." message as you type, so a typo is caught right
  away instead of silently breaking a chart after publish.
- Uploaded images are organized into `public/uploads/articles/` and
  `public/uploads/team/` automatically.

**Can't (needs a code change):** new page templates, layout/design changes,
new site sections. That's normal for any CMS — content is yours to touch
freely; structure and design stay a code change.

## 6. Local development

```bash
npm install
npm run dev        # local dev server, plain client-side rendering
npm run build      # full production build: client + SSR + prerender + sitemap
npm run preview    # preview the prerendered build locally
```

`npm run build` runs four steps in order: the client bundle, an SSR bundle
used only at build time, the prerender script (writes static HTML per
route into `dist/client`), and the sitemap generator. The SSR bundle is
deleted automatically at the end — only `dist/client` needs to be deployed,
which is exactly what `netlify.toml` points at.

## 7. Design system (unchanged)

- Background `#FAFAF7`, ink `#1A1A1A`, brand accent deep teal `#0E6E6E`
- Category colors: News slate blue · Business indigo · Market green ·
  Economy amber · Society purple · Blogs teal
- Fraunces (display) + Inter (body), solid colors only, max width 1200px
- Article cards without a hero image show a generated chart-style sparkline
  cover drawn from that article's own data (`CardCover.jsx`) — upload a hero
  image through `/admin` any time to replace it with a real photo.

## Accuracy rules (October 2026 refresh)

- Every indicator, ticker value, IPO and article figure is taken from a named release or report, and the chart's source line says which one and for what date.
- Provisional figures, quick estimates, month-to-date totals and intraday snapshots are labelled as such next to the number.
- If a figure cannot be traced to a source, it is not published. Use the **Verified against source** toggle on indicators, and the **Draft** toggle on articles, to keep anything unchecked off the live site.
- The 15 launch articles are kept as drafts in the CMS: their figures were illustrative. Rewrite them with sourced numbers before turning Draft off.
- Footer and About-page counts are calculated from the published content, so they update automatically.

## Automatic data updates (no manual work)

Two scheduled jobs run on GitHub Actions (free for public repositories) and write to `live/`:

| Job | When (IST) | What it updates | Sources |
|---|---|---|---|
| `Update market data` | 19:05 and 21:50 on weekdays; 10:00 Saturday | Nifty 50, Nifty Bank, Nifty IT, Midcap 150, Smallcap 250, India VIX, Sensex, USD/EUR/GBP/JPY reference rates, FII/DII daily flows, IBJA gold and silver, Brent spot, FPI equity flows month to date | NSE end-of-day index file, Moneycontrol price feed (Sensex, cross-checked against the Nifty), FBIL reference rates via NSE, NSE FII/DII data, IBJA, US EIA, NSDL |
| `Update IPO data` | 12:00, 15:15, 19:30 on weekdays; 00:15 daily | Every NSE mainboard and SME IPO: dates, price band, lot size, issue size, consolidated subscription by category, timetable, listing price and gain, latest close | NSE public issue data, NSE end-of-day price files, NSE holiday calendar |

How it stays accurate:
- A value is written only if it parses, its date is not older than the stored one, and it passes sanity checks (size of move, continuity with the previous close, and for Sensex a cross-check against the Nifty). Otherwise the old value stays and the reason is logged in `live/market-log.json` or `live/ipos-log.json`.
- Derived numbers say how they were made (issue size "calculated at ₹X per share", expected dates "under SEBI's T+3 timetable").

How it avoids Netlify costs: Netlify's free plan charges 15 credits per production deploy (300 a month). Data commits are marked `[skip netlify]` and `netlify.toml` ignores changes that only touch `live/`, `.github/` or `scripts/data/`. The site loads the newest `live/` files in the browser (from jsDelivr, with raw.githubusercontent.com as a fallback), so it stays current without rebuilding. A rebuild happens only when you publish content in the CMS or change the code; each rebuild also refreshes the prerendered snapshot used by search engines.

What is still manual: monthly macro indicators (CPI, WPI, GDP, IIP, PMIs, jobs, trade, GST, UPI, e-way bills, power, fiscal deficit, current account, bank credit) and the 10-year G-Sec yield. Update them in the CMS when new releases come out.

Running a job by hand: GitHub → Actions → pick the job → Run workflow. `Update IPO data` accepts `backfill_days` to fetch listing-day prices for older listings.

Known gaps: IPOs listed only on BSE (including BSE SME) are not covered, because BSE's data endpoints block automated requests from GitHub's servers.
