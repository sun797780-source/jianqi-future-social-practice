import { Router, type Request, type Response } from 'express'
import { createAdminSession, destroyAdminSession, getAdminSession, requireAdminSession, sessionPayload, verifyAdminCredentials } from '../lib/adminSession.js'

type LoginAttempt = { count: number; windowStartedAt: number; blockedUntil: number }

const router = Router()
const attempts = new Map<string, LoginAttempt>()
const attemptWindowMs = 10 * 60 * 1000
const blockDurationMs = 15 * 60 * 1000

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

router.get('/session', (req: Request, res: Response): void => {
  const session = getAdminSession(req)
  if (!session) {
    res.status(401).json({ success: false, error: '尚未登录或会话已过期' })
    return
  }
  res.status(200).json({ success: true, data: sessionPayload(session) })
})

router.post('/login', (req: Request, res: Response): void => {
  const key = clientKey(req)
  const now = Date.now()
  const attempt = attempts.get(key) ?? { count: 0, windowStartedAt: now, blockedUntil: 0 }
  if (attempt.blockedUntil > now) {
    res.status(429).json({ success: false, error: '登录尝试过多，请稍后再试' })
    return
  }
  if (now - attempt.windowStartedAt > attemptWindowMs) Object.assign(attempt, { count: 0, windowStartedAt: now, blockedUntil: 0 })
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const verification = verifyAdminCredentials(username, password)
  if (!verification.valid) {
    attempt.count += 1
    if (attempt.count >= 5) attempt.blockedUntil = now + blockDurationMs
    attempts.set(key, attempt)
    res.status(401).json({ success: false, error: '用户名或密码不正确' })
    return
  }
  attempts.delete(key)
  const session = createAdminSession(username, res)
  res.status(200).json({ success: true, data: { ...sessionPayload(session), demo: verification.demo } })
})

router.post('/logout', (req: Request, res: Response): void => {
  if (!requireAdminSession(req, res, true)) return
  destroyAdminSession(req, res)
  res.status(200).json({ success: true, data: { loggedOut: true } })
})

export default router
