// cpcb.nic.in has been serving an expired TLS certificate since November 2026, so Node's
// fetch refuses it (CERT_HAS_EXPIRED). For CPCB's hosts only, this downloads a file while
// accepting a certificate whose single fault is its expiry date: any other certificate
// error, or a hostname mismatch, is still refused. Callers also check the body is a PDF.
import https from 'node:https'
import tls from 'node:tls'

const ALLOWED = new Set(['cpcb.nic.in', 'www.cpcb.nic.in'])

export const isExpiredCert = (e) => (e?.cause?.code || e?.code) === 'CERT_HAS_EXPIRED'

export function getAllowExpired(url, { headers = {}, timeout = 60000, redirects = 3 } = {}) {
  const u = new URL(url)
  if (u.protocol !== 'https:' || !ALLOWED.has(u.hostname)) {
    return Promise.reject(new Error(`expired-certificate exception not allowed for ${u.hostname}`))
  }
  return new Promise((resolve, reject) => {
    const req = https.get(u, { headers, rejectUnauthorized: false, timeout, agent: false }, (res) => {
      const s = res.socket
      const certErr = s.authorized ? null : String(s.authorizationError || 'unverified')
      const idErr = tls.checkServerIdentity(u.hostname, s.getPeerCertificate())
      if ((certErr && certErr !== 'CERT_HAS_EXPIRED') || idErr) {
        res.destroy()
        return reject(new Error(`certificate refused: ${idErr ? idErr.message : certErr}`))
      }
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume()
        return resolve(getAllowExpired(new URL(res.headers.location, u).href, { headers, timeout, redirects: redirects - 1 }))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), expiredCert: certErr === 'CERT_HAS_EXPIRED' }))
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

// fetch() first; only on an expired certificate fall back to the exception above.
export async function download(url, { headers = {}, timeout = 60000, onExpired } = {}) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeout), headers })
    return { status: r.status, buffer: Buffer.from(await r.arrayBuffer()) }
  } catch (e) {
    if (!isExpiredCert(e)) throw e
    onExpired?.()
    return getAllowExpired(url, { headers, timeout })
  }
}
