import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import { networkInterfaces } from 'node:os'
import { practiceRepository, type CommunitySurvey, type EvidenceUpdate, type InteractionRoom } from '../repositories/practiceRepository.js'
import { requireAdminSession } from '../lib/adminSession.js'

const router = Router()
const roomSubscribers = new Map<string, Set<Response>>()
const surveySubscribers = new Map<string, Set<Response>>()

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}

function isNonEmptyString(value: unknown, max = 80): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
}

function cleanSingleLineText(value: string): string {
  return Array.from(value).filter((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 && code !== 127
  }).join('').replace(/\s+/g, ' ').trim()
}

function publicEvidence<T extends { updatedBy?: string; workflowStatus?: string }>(item: T) {
  const result = { ...item }
  delete result.updatedBy
  delete result.workflowStatus
  return result
}

function sendRoomEvent(res: Response, room: InteractionRoom): void {
  res.write(`id: ${room.eventId}\n`)
  res.write('event: room\n')
  res.write(`data: ${JSON.stringify(room)}\n\n`)
}

function broadcastRoom(room: InteractionRoom): void {
  for (const subscriber of roomSubscribers.get(room.id) ?? []) sendRoomEvent(subscriber, room)
}

function sendSurveyEvent(res: Response, survey: CommunitySurvey): void {
  res.write(`id: ${survey.eventId}\n`)
  res.write('event: survey\n')
  res.write(`data: ${JSON.stringify(survey)}\n\n`)
}

function broadcastSurvey(survey: CommunitySurvey): void {
  for (const subscriber of surveySubscribers.get(survey.id) ?? []) sendSurveyEvent(subscriber, survey)
}

router.get('/access-url', (req: Request, res: Response): void => {
  const configuredOrigin = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (configuredOrigin) {
    res.status(200).json({ success: true, data: { origin: configuredOrigin, source: 'configured' } })
    return
  }
  const portValue = Number(req.query.port)
  const requestedPort = Number.isInteger(portValue) && portValue > 0 && portValue <= 65535 ? String(portValue) : ''
  // Link-local addresses (169.254.x.x) are not stable phone-accessible LAN
  // addresses. They can appear first when Windows has no active network and
  // were previously ending up in the QR code. Prefer a private LAN address;
  // otherwise keep the host used to open the management page.
  const addresses = Object.values(networkInterfaces()).flat().filter((address) => {
    const value = address?.address ?? ''
    return address?.family === 'IPv4' && !address.internal && !value.startsWith('169.254.')
  })
  const preferred = addresses.find((address) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address?.address ?? ''))
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
  const forwardedHost = req.get('x-forwarded-host') ?? req.get('host') ?? req.hostname
  const hostPort = forwardedHost.match(/:(\d+)$/)?.[1] ?? ''
  const port = requestedPort || hostPort
  const suffix = port && !((protocol === 'http' && port === '80') || (protocol === 'https' && port === '443')) ? `:${port}` : ''
  const origin = preferred ? `${protocol}://${preferred.address}${suffix}` : `${protocol}://${req.hostname}${suffix}`
  res.status(200).json({ success: true, data: { origin, source: preferred ? 'local-network' : 'request-host' } })
})

router.get('/impact', asyncRoute(async (_req: Request, res: Response): Promise<void> => {
  const [evidence, pledgeCount] = await Promise.all([practiceRepository.listEvidence(), practiceRepository.pledgeCount()])
  res.status(200).json({
    success: true,
    data: {
      status: 'demo',
      metrics: [
        { label: '累计参与', value: 12680, unit: '人次' },
        { label: '文明行动', value: 38942 + pledgeCount, unit: '次' },
        { label: '实践场次', value: 126, unit: '场' },
      ],
      weeklyTrend: [42, 68, 53, 79, 62, 91, 76, 88],
      evidence: evidence.map(publicEvidence),
      updatedAt: new Date().toISOString(),
    },
  })
}))

router.get('/evidence', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const audienceId = typeof req.query.audienceId === 'string' ? req.query.audienceId : undefined
  const evidence = await practiceRepository.listEvidence()
  const result = (audienceId ? evidence.filter((item) => item.audienceId === audienceId) : evidence).map(publicEvidence)
  res.status(200).json({ success: true, data: { status: 'demo', items: result } })
}))

router.get('/admin/evidence', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  if (!requireAdminSession(req, res)) return
  res.status(200).json({ success: true, data: { status: 'demo', items: await practiceRepository.listEvidence(true) } })
}))

router.get('/admin/audit', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  if (!requireAdminSession(req, res)) return
  res.status(200).json({ success: true, data: { status: 'demo', items: await practiceRepository.listAudit() } })
}))

router.put('/admin/evidence/:evidenceId', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const session = requireAdminSession(req, res, true)
  if (!session) return
  const { title, summary, source, workflowStatus } = req.body ?? {}
  if (!isNonEmptyString(title, 80) || !isNonEmptyString(summary, 300) || !isNonEmptyString(source, 120)) {
    res.status(400).json({ success: false, error: '标题、摘要和来源均不能为空' })
    return
  }
  if (workflowStatus !== 'draft' && workflowStatus !== 'published' && workflowStatus !== 'archived') {
    res.status(400).json({ success: false, error: '发布状态无效' })
    return
  }
  const input: EvidenceUpdate = { title: title.trim(), summary: summary.trim(), source: source.trim(), workflowStatus, updatedBy: session.username }
  const item = await practiceRepository.updateEvidence(req.params.evidenceId, input)
  if (!item) {
    res.status(404).json({ success: false, error: '证据条目不存在' })
    return
  }
  res.status(200).json({ success: true, data: item })
}))

router.put('/admin/rooms/:roomId/status', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const session = requireAdminSession(req, res, true)
  if (!session) return
  const lifecycle = req.body?.lifecycle
  if (lifecycle !== 'waiting' && lifecycle !== 'live' && lifecycle !== 'paused' && lifecycle !== 'closed') {
    res.status(400).json({ success: false, error: '房间状态无效' })
    return
  }
  const room = await practiceRepository.setRoomLifecycle(req.params.roomId, lifecycle, session.username)
  if (!room) {
    res.status(404).json({ success: false, error: '互动房间不存在' })
    return
  }
  broadcastRoom(room)
  res.status(200).json({ success: true, data: room })
}))

router.get('/community-surveys/:surveyId/events', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const survey = await practiceRepository.getCommunitySurvey(req.params.surveyId)
  if (!survey) {
    res.status(404).json({ success: false, error: '社区调研房间不存在' })
    return
  }
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  const subscribers = surveySubscribers.get(survey.id) ?? new Set<Response>()
  subscribers.add(res)
  surveySubscribers.set(survey.id, subscribers)
  sendSurveyEvent(res, survey)
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000)
  req.on('close', () => {
    clearInterval(heartbeat)
    subscribers.delete(res)
    if (!subscribers.size) surveySubscribers.delete(survey.id)
  })
}))

router.get('/community-surveys/:surveyId', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const survey = await practiceRepository.getCommunitySurvey(req.params.surveyId)
  if (!survey) {
    res.status(404).json({ success: false, error: '社区调研房间不存在' })
    return
  }
  res.status(200).json({ success: true, data: survey })
}))

router.post('/community-surveys/:surveyId/responses', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const survey = await practiceRepository.getCommunitySurvey(req.params.surveyId)
  if (!survey) {
    res.status(404).json({ success: false, error: '社区调研房间不存在' })
    return
  }
  if (survey.lifecycle !== 'live') {
    res.status(409).json({ success: false, error: survey.lifecycle === 'closed' ? '本次社区调研已结束' : '本次社区调研暂未开放' })
    return
  }
  const answers = req.body?.answers
  const validAnswers = Array.isArray(answers)
    && answers.length === survey.questions.length
    && answers.every((answer, index) => Number.isInteger(answer) && answer >= 0 && answer < survey.questions[index].options.length)
  if (!validAnswers) {
    res.status(400).json({ success: false, error: '请完成全部题目后再提交' })
    return
  }
  const suggestionValue = req.body?.suggestion
  if (suggestionValue !== undefined && suggestionValue !== null && typeof suggestionValue !== 'string') {
    res.status(400).json({ success: false, error: '选填建议格式无效' })
    return
  }
  const suggestion = typeof suggestionValue === 'string' ? cleanSingleLineText(suggestionValue) : ''
  if (suggestion.length > 200) {
    res.status(400).json({ success: false, error: '选填建议不能超过 200 个字' })
    return
  }
  const participantId = req.get('X-Participant-Id')?.trim()
  if (!participantId || participantId.length < 8 || participantId.length > 80) {
    res.status(400).json({ success: false, error: '匿名参与标识无效' })
    return
  }
  const result = await practiceRepository.submitCommunitySurvey(survey.id, answers, participantId, suggestion || undefined)
  if (!result) {
    res.status(404).json({ success: false, error: '社区调研房间不存在' })
    return
  }
  if (!result.deduplicated) broadcastSurvey(result.survey)
  res.status(result.deduplicated ? 200 : 201).json({ success: true, data: result })
}))

router.get('/rooms/:roomId/events', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const room = await practiceRepository.getRoom(req.params.roomId)
  if (!room) {
    res.status(404).json({ success: false, error: '互动房间不存在' })
    return
  }
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  const subscribers = roomSubscribers.get(room.id) ?? new Set<Response>()
  subscribers.add(res)
  roomSubscribers.set(room.id, subscribers)
  sendRoomEvent(res, room)
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000)
  req.on('close', () => {
    clearInterval(heartbeat)
    subscribers.delete(res)
    if (!subscribers.size) roomSubscribers.delete(room.id)
  })
}))

router.get('/rooms/:roomId', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const room = await practiceRepository.getRoom(req.params.roomId)
  if (!room) {
    res.status(404).json({ success: false, error: '互动房间不存在' })
    return
  }
  res.status(200).json({ success: true, data: room })
}))

router.post('/rooms/:roomId/votes', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const room = await practiceRepository.getRoom(req.params.roomId)
  if (!room) {
    res.status(404).json({ success: false, error: '互动房间不存在' })
    return
  }
  const optionIndex = req.body?.optionIndex
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= room.options.length) {
    res.status(400).json({ success: false, error: '投票选项无效' })
    return
  }
  if (room.lifecycle !== 'live') {
    res.status(409).json({ success: false, error: room.lifecycle === 'closed' ? '互动房间已结束' : '互动房间当前暂停投票' })
    return
  }
  const participantId = req.get('X-Participant-Id')?.trim()
  if (!participantId || participantId.length < 8 || participantId.length > 80) {
    res.status(400).json({ success: false, error: '匿名参与标识无效' })
    return
  }
  const result = await practiceRepository.vote(room.id, optionIndex, participantId)
  if (!result) {
    res.status(404).json({ success: false, error: '互动房间不存在' })
    return
  }
  if (!result.deduplicated) broadcastRoom(result.room)
  res.status(result.deduplicated ? 200 : 201).json({ success: true, data: result })
}))

router.post('/pledges', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  const idempotencyKey = req.get('Idempotency-Key')?.trim()
  if (!isNonEmptyString(idempotencyKey, 120)) {
    res.status(400).json({ success: false, error: '缺少有效的幂等键' })
    return
  }
  const existing = await practiceRepository.getPledgeByKey(idempotencyKey)
  if (existing) {
    res.status(200).json({ success: true, data: existing, deduplicated: true })
    return
  }
  const action = req.body?.action
  const audienceId = req.body?.audienceId
  const nickname = req.body?.nickname
  if (!isNonEmptyString(action, 40)) {
    res.status(400).json({ success: false, error: '行动名称不能为空且不能超过 40 个字' })
    return
  }
  if (audienceId !== undefined && !isNonEmptyString(audienceId, 40)) {
    res.status(400).json({ success: false, error: '实践场景标识无效' })
    return
  }
  if (nickname !== undefined && !isNonEmptyString(nickname, 20)) {
    res.status(400).json({ success: false, error: '昵称不能超过 20 个字' })
    return
  }
  const pledge = await practiceRepository.createPledge(idempotencyKey, { action: action.trim(), audienceId: audienceId?.trim(), nickname: nickname?.trim() })
  res.status(201).json({ success: true, data: pledge })
}))

export default router
