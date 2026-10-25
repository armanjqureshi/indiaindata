// Dev tool: renders each infographic page to a PNG (download) and a 1200x630 crop (social card).
// Usage: npm run build && npx vite preview --outDir dist/client --port 4173 &  then
//        NODE_PATH=$(npm root -g) node scripts/render-infographics.cjs
const { chromium } = require('playwright')
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ['fpi-selloff-october-2026']
;(async () => {
  const b = await chromium.launch()
  for (const slug of slugs) {
    const p = await b.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 2 })
    await p.goto(`http://localhost:4173/infographics/${slug}/`)
    await p.waitForSelector('svg[role=img]')
    const svg = p.locator('svg[role=img]').first()
    await svg.screenshot({ path: `public/infographics/${slug}.png` })
    // social card: top 1200x630 of the image (needs python3 with Pillow)
    require('child_process').execFileSync('python3', ['-c', `from PIL import Image
im = Image.open('public/infographics/${slug}.png')
w, h = im.size
im.crop((0, 0, w, round(w * 630 / 1200))).resize((1200, 630), Image.LANCZOS).save('public/infographics/${slug}-og.png', optimize=True)`])
    console.log('rendered', slug)
  }
  await b.close()
})()
