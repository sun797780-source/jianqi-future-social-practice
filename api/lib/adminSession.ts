import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'

export type AdminRole = 'admin'

export type AdminSession = {
  token: string
  username: string
  role: AdminRole
  csrfToken: string
  expiresAt: number
}

const cookieName = 'jianqi_admin_session'
const sessionDurationMs = 2 * 60 * 60 * 1000
const sessions = new Map<string, AdminSession>()

function cookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.get('cookie')
  if (!cookieHeader) return undefined
  for (const entry of cookieHeader.split(';')) {
    const [key, ...value] = entry.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return undefined
}

function credentials() {
  const production = process.env.NODE_ENV === 'production'
  const username = process.env.ADMIN_USERNAME || (production ? '' : 'admin')
  const password = process.env.ADMIN_PASSWORD || (production ? '' : 'jianqi-demo')
  return { username, password, configured: Boolean(username && password), demo: !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD }
}

export function verifyAdminCredentials(username: string, password: string): { valid: boolean; demo: boolean } {
  const expected = credentials()
  if (!expected.configured || username.length > 80 || password.length > 160) return { valid: false, demo: expected.demo }
  const salt = 'jianqi-admin-login-v1'
  const suppliedHash = scryptSync(password, salt, 32)
  const expectedHash = scryptSync(expected.password, salt, 32)
  const usernameValid = username === expected.username
  return { valid: usernameValid && timingSafeEqual(suppliedHash, expectedHash), demo: expected.demo }
}

export function createAdminSession(username: string, res: Response): AdminSession {
  const token = randomBytes(32).toString('base64url')
  const session: AdminSession = { token, username, role: 'admin', csrfToken: randomBytes(24).toString('base64url'), expiresAt: Date.now() + sessionDurationMs }
  sessions.set(token, session)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${Math.floor(sessionDurationMs / 1000)}${secure}`)
  return session
}

export function getAdminSession(req: Request): AdminSession | undefined {
  const token = cookieValue(req, cookieName)
  if (!token) return undefined
  const session = sessions.get(token)
  if (!session) return undefined
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return undefined
  }
  return session
}

export function destroyAdminSession(req: Request, res: Response): void {
  const token = cookieValue(req, cookieName)
  if (token) sessions.delete(token)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`)
}

export function requireAdminSession(req: Request, res: Response, requireCsrf = false): AdminSession | undefined {
  const session = getAdminSession(req)
  if (!session) {
    res.status(401).json({ success: false, error: '管理员会话无效或已过期' })
    return undefined
  }
  if (requireCsrf && req.get('X-CSRF-Token') !== session.csrfToken) {
    res.status(403).json({ success: false, error: '安全校验失败，请刷新后台后重试' })
    return undefined
  }
  return session
}

export function sessionPayload(session: AdminSession) {
  return { username: session.username, role: session.role, csrfToken: session.csrfToken, expiresAt: new Date(session.expiresAt).toISOString() }
}
