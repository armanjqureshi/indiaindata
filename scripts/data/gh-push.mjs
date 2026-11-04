// Commits local files to the repo through the GitHub contents API, so a runner
// without git installed (the Windows PC in India) can still publish its results.
// Needs GITHUB_TOKEN and GITHUB_REPOSITORY (both set by GitHub Actions).
import fs from 'node:fs'
import crypto from 'node:crypto'

const blobSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')

export async function pushFiles(message, files, { branch = process.env.PUSH_BRANCH || 'main' } = {}) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')
  const api = (p, opts = {}) =>
    fetch(`https://api.github.com/repos/${repo}/contents/${p}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'india-in-data-bot' },
    })
  const results = []
  for (const f of files) {
    const repoPath = f.replace(/\\/g, '/')
    const content = fs.readFileSync(f)
    let status = 'failed'
    for (let attempt = 1; attempt <= 3; attempt++) {
      const cur = await api(`${repoPath}?ref=${branch}`)
      if (cur.status !== 200 && cur.status !== 404) { status = `lookup HTTP ${cur.status}`; break }
      const sha = cur.ok ? (await cur.json()).sha : undefined
      if (sha && sha === blobSha(content)) { status = 'unchanged'; break }
      const res = await api(repoPath, {
        method: 'PUT',
        body: JSON.stringify({
          message, branch, sha,
          content: content.toString('base64'),
          committer: { name: 'india-in-data-bot', email: '41898282+github-actions[bot]@users.noreply.github.com' },
        }),
      })
      if (res.ok) { status = 'pushed'; break }
      status = `HTTP ${res.status} ${(await res.text()).slice(0, 200)}`
      await new Promise((r) => setTimeout(r, 3000 * attempt))
    }
    results.push([repoPath, status])
    console.log(`${repoPath}: ${status}`)
  }
  return results
}
