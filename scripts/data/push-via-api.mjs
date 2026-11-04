// Commits local files to the repo through the GitHub contents API, so a runner
// without git installed (the Windows PC in India) can still publish its results.
// Usage: node scripts/data/push-via-api.mjs "<commit message>" file1 [file2 ...]
// Needs GITHUB_TOKEN and GITHUB_REPOSITORY (both set by GitHub Actions).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const [message, ...args] = process.argv.slice(2)
// a directory means every .json file directly inside it
const files = args.flatMap((a) => (fs.existsSync(a) && fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter((n) => n.endsWith('.json')).map((n) => path.join(a, n)) : [a]))
const blobSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
const token = process.env.GITHUB_TOKEN
const repo = process.env.GITHUB_REPOSITORY
const branch = process.env.PUSH_BRANCH || 'main'
if (!message || !args.length || !token || !repo) {
  console.error('usage: push-via-api.mjs "<message>" <files...> (needs GITHUB_TOKEN, GITHUB_REPOSITORY)')
  process.exit(1)
}
const api = (p, opts = {}) =>
  fetch(`https://api.github.com/repos/${repo}/contents/${p}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'india-in-data-bot', ...(opts.headers || {}) },
  })

let failed = false
for (const f of files) {
  const repoPath = f.replace(/\\/g, '/')
  const content = fs.readFileSync(f)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const cur = await api(`${repoPath}?ref=${branch}`)
    const sha = cur.ok ? (await cur.json()).sha : undefined
    if (sha && sha === blobSha(content)) { console.log(`${repoPath}: unchanged`); break }
    if (cur.status !== 200 && cur.status !== 404) { console.error(`${repoPath}: lookup HTTP ${cur.status}`); failed = true; break }
    const res = await api(repoPath, {
      method: 'PUT',
      body: JSON.stringify({
        message, branch, sha,
        content: content.toString('base64'),
        committer: { name: 'india-in-data-bot', email: '41898282+github-actions[bot]@users.noreply.github.com' },
      }),
    })
    if (res.ok) { console.log(`${repoPath}: pushed`); break }
    const body = (await res.text()).slice(0, 300)
    console.error(`${repoPath}: attempt ${attempt} HTTP ${res.status} ${body}`)
    if (attempt === 3) failed = true
    else await new Promise((r) => setTimeout(r, 3000))
  }
}
process.exit(failed ? 1 : 0)
