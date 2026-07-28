import { access } from 'node:fs/promises'

const webOrigin = process.env.DEMO_WEB_ORIGIN || 'http://localhost:5173'
const apiOrigin = process.env.DEMO_API_ORIGIN || 'http://localhost:3001'

async function readCheck(name, url, validate) {
  const startedAt = performance.now()
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const body = await response.text()
    return { name, ok: response.ok && validate(body), status: response.status, durationMs: Math.round(performance.now() - startedAt) }
  } catch (error) {
    return { name, ok: false, status: 0, durationMs: Math.round(performance.now() - startedAt), errorName: error instanceof Error ? error.name : 'unknown' }
  }
}

const checks = await Promise.all([
  readCheck('api-health', `${apiOrigin}/api/health`, (body) => body.includes('"status":"ok"')),
  readCheck('practice-page', `${webOrigin}/practice/school`, (body) => body.includes('<div id="root">')),
  readCheck('action-page', `${webOrigin}/action`, (body) => body.includes('<div id="root">')),
  access('api/data/practice-store.json').then(() => ({ name: 'practice-store', ok: true })).catch(() => ({ name: 'practice-store', ok: false })),
])

console.log(JSON.stringify({ event: 'demo.preflight', checkedAt: new Date().toISOString(), checks }, null, 2))
if (checks.some((check) => !check.ok)) process.exitCode = 1
