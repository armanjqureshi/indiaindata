// Usage: node scripts/data/push-via-api.mjs "<commit message>" <file-or-dir> ...
// A directory means every .json file directly inside it.
import fs from 'node:fs'
import path from 'node:path'
import { pushFiles } from './gh-push.mjs'

const [message, ...args] = process.argv.slice(2)
if (!message || !args.length) { console.error('usage: push-via-api.mjs "<message>" <files...>'); process.exit(1) }
const files = args.flatMap((a) => (fs.existsSync(a) && fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter((n) => n.endsWith('.json')).map((n) => path.join(a, n)) : [a]))
const res = await pushFiles(message, files)
process.exit(res.some(([, s]) => s !== 'pushed' && s !== 'unchanged') ? 1 : 0)
