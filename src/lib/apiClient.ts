export type ApiStatus = 'loading' | 'success' | 'demo' | 'error'

export type InteractionRoom = {
  id: string
  status: 'demo'
  question: string
  options: string[]
  votes: number[]
  updatedAt: string
  lifecycle: 'waiting' | 'live' | 'paused' | 'closed'
  eventId: number
}

export type InteractionVoteResult = { room: InteractionRoom; deduplicated: boolean }

export type CommunitySurveyQuestion = {
  id: string
  dimension: string
  title: string
  description: string
  options: string[]
}

export type CommunitySurvey = {
  id: string
  status: 'demo'
  lifecycle: 'waiting' | 'live' | 'paused' | 'closed'
  questions: CommunitySurveyQuestion[]
  counts: number[][]
  responseCount: number
  suggestions: Array<{ text: string; createdAt: string }>
  updatedAt: string
  eventId: number
}

export type CommunitySurveyResult = { survey: CommunitySurvey; deduplicated: boolean }

export type ImpactPayload = {
  status: 'demo' | 'verified'
  metrics: Array<{ label: string; value: number; unit: string }>
  weeklyTrend: number[]
  evidence: Array<{
    id: string
    title: string
    summary: string
    type: string
    audienceId: string
    source: string
    status: 'demo' | 'verified'
    position: { left: string; top: string }
  }>
  updatedAt: string
}

export type AdminEvidence = ImpactPayload['evidence'][number] & {
  workflowStatus: 'draft' | 'published' | 'archived'
  updatedAt: string
  updatedBy: string
}

export type AdminSession = {
  username: string
  role: 'admin'
  csrfToken: string
  expiresAt: string
  demo?: boolean
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string }

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

const demoImpact: ImpactPayload = {
  status: 'demo',
  metrics: [
    { label: '累计参与', value: 12680, unit: '人次' },
    { label: '文明行动', value: 38942, unit: '次' },
    { label: '实践场次', value: 126, unit: '场' },
  ],
  weeklyTrend: [42, 68, 53, 79, 62, 91, 76, 88],
  evidence: [
    { id: 'demo-01', title: '校园节约观察', summary: '记录校园一天中的用电、用水和餐食节约行为。', type: 'data', audienceId: 'school', source: '项目原型内容', status: 'demo', position: { left: '63%', top: '58%' } },
    { id: 'demo-02', title: '丰收守护观察', summary: '了解收获、储存和用水中减少损耗的一个办法。', type: 'action', audienceId: 'rural', source: '项目原型内容', status: 'demo', position: { left: '84%', top: '68%' } },
  ],
  updatedAt: new Date(0).toISOString(),
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 7000)
  const startedAt = performance.now()
  const metricName = path.startsWith('/api/practice/rooms/') ? 'jianqi:api:room' : path.startsWith('/api/practice/') ? 'jianqi:api:practice' : path.startsWith('/api/auth/') ? 'jianqi:api:auth' : 'jianqi:api:other'
  try {
    const response = await fetch(path, { ...init, credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', ...init?.headers } })
    const payload = await response.json() as ApiResponse<T>
    if (!response.ok || !payload.success || !payload.data) throw new ApiRequestError(payload.error || '请求失败', response.status)
    return payload.data
  } finally {
    window.clearTimeout(timeout)
    performance.clearMeasures(metricName)
    performance.measure(metricName, { start: startedAt, duration: performance.now() - startedAt })
  }
}

export async function getImpact(): Promise<{ data: ImpactPayload; status: ApiStatus }> {
  try {
    const data = await request<ImpactPayload>('/api/practice/impact')
    return { data, status: data.status === 'demo' ? 'demo' : 'success' }
  } catch {
    return { data: demoImpact, status: 'demo' }
  }
}

export async function submitPledge(action: string, audienceId?: string) {
  return request<{ id: string; action: string; source: 'demo' }>('/api/practice/pledges', {
    method: 'POST',
    headers: { 'Idempotency-Key': `jianqi-pledge-${audienceId || 'general'}-${encodeURIComponent(action)}` },
    body: JSON.stringify({ action, audienceId }),
  })
}

const demoRoom: InteractionRoom = {
  id: 'JIANQI-01', status: 'demo', question: '你最愿意从哪一项节约行动开始？', options: ['光盘行动', '随手节能', '惜水一刻', '循环使用'], votes: [12, 9, 7, 10], updatedAt: new Date(0).toISOString(), lifecycle: 'live', eventId: 1,
}

export const emptyCommunitySurvey: CommunitySurvey = {
  id: 'COMMUNITY-01',
  status: 'demo',
  lifecycle: 'live',
  questions: [
    { id: 'priority', dimension: '治理优先级', title: '如果社区只能先集中解决一类浪费，您认为哪一项最值得优先治理？', description: '请选择对资源消耗、居民生活和长期改善影响最大的一项。', options: ['公共区域照明、空调等设备的低效空转', '家庭食材重复购买、储存不当与过期损耗', '仍可维修或转赠的物品被提前淘汰', '社区活动中一次性用品与临时物资消耗'] },
    { id: 'mechanism', dimension: '协同机制', title: '哪种社区协同机制最可能让节约行动长期运转，而不是只热闹几天？', description: '重点考虑责任是否清楚、居民是否愿意参与、结果是否能被看见。', options: ['建立公开数据看板，每月公布变化并共同复盘', '设立楼栋节约联络员，负责发现问题和协调处理', '建设旧物、工具与闲置资源共享平台', '形成居民、物业和社区工作人员联合巡检机制'] },
    { id: 'motivation', dimension: '参与动力', title: '在不增加居民负担的前提下，哪种方式最能提高持续参与意愿？', description: '请选择您认为公平、可持续且不会流于形式的激励方式。', options: ['用节约积分兑换公共服务或便民权益', '展示真实减量成果，让参与者看到行动价值', '以家庭或楼栋为单位形成自愿互助约定', '为有效建议提供小额社区微项目支持'] },
    { id: 'feedback', dimension: '反馈闭环', title: '社区收集到这些意见后，怎样反馈最能建立信任？', description: '好的反馈需要说明做了什么、为什么这样做，以及下一步如何检验。', options: ['一周内公布问题清单、责任人和预计处理时间', '每月对比改进前后数据并解释未完成事项', '邀请居民代表参与方案讨论和阶段验收', '对暂时无法解决的问题公开原因与替代方案'] },
  ],
  counts: Array.from({ length: 4 }, () => [0, 0, 0, 0]),
  responseCount: 0,
  suggestions: [],
  updatedAt: new Date(0).toISOString(),
  eventId: 1,
}

export async function getInteractionRoom(roomId = 'JIANQI-01', allowDemoFallback = true) {
  try {
    return { data: await request<InteractionRoom>(`/api/practice/rooms/${roomId}`), status: 'success' as ApiStatus }
  } catch (error) {
    if (!allowDemoFallback) throw error
    return { data: demoRoom, status: 'demo' as ApiStatus }
  }
}

export async function submitInteractionVote(roomId: string, optionIndex: number) {
  let participantId = localStorage.getItem('jianqi-participant-id')
  if (!participantId) {
    participantId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('jianqi-participant-id', participantId)
  }
  return request<InteractionVoteResult>(`/api/practice/rooms/${roomId}/votes`, { method: 'POST', headers: { 'X-Participant-Id': participantId }, body: JSON.stringify({ optionIndex }) })
}

export function subscribeInteractionRoom(roomId: string, onRoom: (room: InteractionRoom) => void, onConnection: (state: 'live' | 'reconnecting') => void) {
  const source = new EventSource(`/api/practice/rooms/${roomId}/events`)
  let lastEventId = 0
  source.onopen = () => onConnection('live')
  source.onerror = () => onConnection('reconnecting')
  source.addEventListener('room', (event) => {
    const room = JSON.parse((event as MessageEvent<string>).data) as InteractionRoom
    if (room.eventId <= lastEventId) return
    lastEventId = room.eventId
    onRoom(room)
  })
  return () => source.close()
}

function getAnonymousParticipantId() {
  let participantId = localStorage.getItem('jianqi-participant-id')
  if (!participantId) {
    participantId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('jianqi-participant-id', participantId)
  }
  return participantId
}

export async function getCommunitySurvey(surveyId = 'COMMUNITY-01', allowDemoFallback = true) {
  try {
    return { data: await request<CommunitySurvey>(`/api/practice/community-surveys/${surveyId}`), status: 'success' as ApiStatus }
  } catch (error) {
    if (!allowDemoFallback) throw error
    return { data: emptyCommunitySurvey, status: 'demo' as ApiStatus }
  }
}

export async function getCommunityAccessUrl(port = window.location.port) {
  const query = port ? `?port=${encodeURIComponent(port)}` : ''
  return request<{ origin: string; source: 'configured' | 'local-network' | 'request-host' }>(`/api/practice/access-url${query}`)
}

export async function submitCommunitySurvey(surveyId: string, answers: number[], suggestion?: string) {
  return request<CommunitySurveyResult>(`/api/practice/community-surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'X-Participant-Id': getAnonymousParticipantId() },
    body: JSON.stringify({ answers, suggestion }),
  })
}

export function subscribeCommunitySurvey(surveyId: string, onSurvey: (survey: CommunitySurvey) => void, onConnection: (state: 'live' | 'reconnecting') => void) {
  const source = new EventSource(`/api/practice/community-surveys/${surveyId}/events`)
  let lastEventId = 0
  source.onopen = () => onConnection('live')
  source.onerror = () => onConnection('reconnecting')
  source.addEventListener('survey', (event) => {
    const survey = JSON.parse((event as MessageEvent<string>).data) as CommunitySurvey
    if (survey.eventId <= lastEventId) return
    lastEventId = survey.eventId
    onSurvey(survey)
  })
  return () => source.close()
}

export async function getAdminSession() {
  return request<AdminSession>('/api/auth/session')
}

export async function loginAdmin(username: string, password: string) {
  return request<AdminSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export async function logoutAdmin(csrfToken: string) {
  return request<{ loggedOut: true }>('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: '{}' })
}

export async function getAdminEvidence() {
  return request<{ status: 'demo'; items: AdminEvidence[] }>('/api/practice/admin/evidence')
}

export async function updateAdminEvidence(csrfToken: string, evidenceId: string, input: Pick<AdminEvidence, 'title' | 'summary' | 'source' | 'workflowStatus'>) {
  return request<AdminEvidence>(`/api/practice/admin/evidence/${evidenceId}`, { method: 'PUT', headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify(input) })
}
