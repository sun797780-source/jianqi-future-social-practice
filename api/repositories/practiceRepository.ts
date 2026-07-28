import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

export type PracticePledge = {
  id: string
  action: string
  audienceId?: string
  nickname?: string
  createdAt: string
  source: 'demo'
}

export type Evidence = {
  id: string
  title: string
  summary: string
  type: 'fieldwork' | 'interview' | 'data' | 'action'
  audienceId: string
  source: string
  status: 'demo' | 'verified'
  workflowStatus: 'draft' | 'published' | 'archived'
  updatedAt: string
  updatedBy: string
  position: { left: string; top: string }
}

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

type StoredPledge = PracticePledge & { idempotencyKey: string }

export type AuditEntry = {
  id: string
  action: 'evidence.update' | 'room.status'
  targetId: string
  previousStatus: string
  nextStatus: string
  operator: string
  createdAt: string
}

type PracticeStore = {
  schemaVersion: 4
  source: 'demo'
  seededAt: string
  evidence: Evidence[]
  rooms: InteractionRoom[]
  pledges: StoredPledge[]
  audit: AuditEntry[]
  roomVotes: Array<{ roomId: string; participantHash: string; optionIndex: number; createdAt: string }>
  communitySurveys: CommunitySurvey[]
  communitySurveyResponses: Array<{ surveyId: string; participantHash: string; answers: number[]; suggestion?: string; createdAt: string }>
}

export type EvidenceUpdate = Pick<Evidence, 'title' | 'summary' | 'source' | 'workflowStatus' | 'updatedBy'>

export class PracticeStorageError extends Error {
  constructor(cause?: unknown) {
    super('实践数据存储暂时不可用')
    this.name = 'PracticeStorageError'
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause
  }
}

const seedTimestamp = '2026-01-01T00:00:00.000Z'
const legacyAudienceIds: Record<string, string> = { ancient: 'rural', revolution: 'community', modern: 'school', future: 'community' }

function createCommunityRoom(): InteractionRoom {
  return {
    id: 'COMMUNITY-01',
    status: 'demo',
    question: '你最愿意和社区一起从哪项节约行动开始？',
    options: ['按需取餐与减少食物浪费', '随手关灯、关水和节约能源', '旧物修补、转赠或循环使用', '和家人一起制定一周约定'],
    votes: [0, 0, 0, 0],
    updatedAt: seedTimestamp,
    lifecycle: 'live',
    eventId: 1,
  }
}

function createCommunitySurvey(): CommunitySurvey {
  return {
    id: 'COMMUNITY-01',
    status: 'demo',
    lifecycle: 'live',
    questions: [
      {
        id: 'priority',
        dimension: '治理优先级',
        title: '如果社区只能先集中解决一类浪费，您认为哪一项最值得优先治理？',
        description: '请选择对资源消耗、居民生活和长期改善影响最大的一项。',
        options: ['公共区域照明、空调等设备的低效空转', '家庭食材重复购买、储存不当与过期损耗', '仍可维修或转赠的物品被提前淘汰', '社区活动中一次性用品与临时物资消耗'],
      },
      {
        id: 'mechanism',
        dimension: '协同机制',
        title: '哪种社区协同机制最可能让节约行动长期运转，而不是只热闹几天？',
        description: '重点考虑责任是否清楚、居民是否愿意参与、结果是否能被看见。',
        options: ['建立公开数据看板，每月公布变化并共同复盘', '设立楼栋节约联络员，负责发现问题和协调处理', '建设旧物、工具与闲置资源共享平台', '形成居民、物业和社区工作人员联合巡检机制'],
      },
      {
        id: 'motivation',
        dimension: '参与动力',
        title: '在不增加居民负担的前提下，哪种方式最能提高持续参与意愿？',
        description: '请选择您认为公平、可持续且不会流于形式的激励方式。',
        options: ['用节约积分兑换公共服务或便民权益', '展示真实减量成果，让参与者看到行动价值', '以家庭或楼栋为单位形成自愿互助约定', '为有效建议提供小额社区微项目支持'],
      },
      {
        id: 'feedback',
        dimension: '反馈闭环',
        title: '社区收集到这些意见后，怎样反馈最能建立信任？',
        description: '好的反馈需要说明做了什么、为什么这样做，以及下一步如何检验。',
        options: ['一周内公布问题清单、责任人和预计处理时间', '每月对比改进前后数据并解释未完成事项', '邀请居民代表参与方案讨论和阶段验收', '对暂时无法解决的问题公开原因与替代方案'],
      },
    ],
    counts: Array.from({ length: 4 }, () => [0, 0, 0, 0]),
    responseCount: 0,
    suggestions: [],
    updatedAt: seedTimestamp,
    eventId: 1,
  }
}

function ensureCommunitySurvey(store: PracticeStore): boolean {
  let migrated = false
  if (!Array.isArray(store.communitySurveys)) {
    store.communitySurveys = []
    migrated = true
  }
  if (!Array.isArray(store.communitySurveyResponses)) {
    store.communitySurveyResponses = []
    migrated = true
  }
  if (!store.communitySurveys.some((survey) => survey.id === 'COMMUNITY-01')) {
    store.communitySurveys.push(createCommunitySurvey())
    migrated = true
  }
  for (const survey of store.communitySurveys) {
    if (!Array.isArray(survey.suggestions)) {
      survey.suggestions = []
      migrated = true
    }
  }
  return migrated
}

function createSeedStore(): PracticeStore {
  return {
    schemaVersion: 4,
    source: 'demo',
    seededAt: seedTimestamp,
    evidence: [
      { id: 'kindergarten-01', title: '一粒米的旅行', summary: '用观察卡认识粮食从田地到餐桌的过程。', type: 'fieldwork', audienceId: 'kindergarten', source: '项目原型内容', status: 'demo', workflowStatus: 'published', updatedAt: seedTimestamp, updatedBy: 'system-demo', position: { left: '13%', top: '36%' } },
      { id: 'school-01', title: '校园资源侦探', summary: '记录教室、食堂和水池旁的一处节约行动。', type: 'data', audienceId: 'school', source: '项目原型内容', status: 'demo', workflowStatus: 'published', updatedAt: seedTimestamp, updatedBy: 'system-demo', position: { left: '38%', top: '62%' } },
      { id: 'community-01', title: '旧物新生记录', summary: '收集一件旧物被修补、转赠或再利用的过程。', type: 'interview', audienceId: 'community', source: '项目原型内容', status: 'demo', workflowStatus: 'published', updatedAt: seedTimestamp, updatedBy: 'system-demo', position: { left: '64%', top: '43%' } },
      { id: 'rural-01', title: '丰收守护观察', summary: '了解收获、储存和用水中减少损耗的一个办法。', type: 'action', audienceId: 'rural', source: '项目原型内容', status: 'demo', workflowStatus: 'published', updatedAt: seedTimestamp, updatedBy: 'system-demo', position: { left: '84%', top: '67%' } },
    ],
    rooms: [{ id: 'JIANQI-01', status: 'demo', question: '你最愿意从哪一项节约行动开始？', options: ['光盘行动', '随手节能', '惜水一刻', '循环使用'], votes: [12, 9, 7, 10], updatedAt: seedTimestamp, lifecycle: 'live', eventId: 1 }, createCommunityRoom()],
    pledges: [],
    audit: [],
    roomVotes: [],
    communitySurveys: [createCommunitySurvey()],
    communitySurveyResponses: [],
  }
}

function validateStore(value: unknown): { store: PracticeStore; migrated: boolean } {
  if (!value || typeof value !== 'object') throw new Error('实践数据文件格式无效')
  const candidate = value as { schemaVersion?: number; source?: unknown; seededAt?: unknown; evidence?: unknown; rooms?: unknown; pledges?: unknown; audit?: unknown; roomVotes?: unknown; communitySurveys?: unknown; communitySurveyResponses?: unknown }
  if (candidate.source !== 'demo' || !Array.isArray(candidate.evidence) || !Array.isArray(candidate.rooms) || !Array.isArray(candidate.pledges)) {
    throw new Error('实践数据文件版本不受支持')
  }
  if (candidate.schemaVersion === 1 || candidate.schemaVersion === 2) {
    const rooms = (candidate.rooms as InteractionRoom[]).map((room) => ({ ...room, lifecycle: room.lifecycle || 'live', eventId: room.eventId || 1 }))
    const store = { ...candidate, schemaVersion: 4, rooms, audit: Array.isArray(candidate.audit) ? candidate.audit : [], roomVotes: [], communitySurveys: [], communitySurveyResponses: [], evidence: (candidate.evidence as Array<Evidence & { eraId?: string }>).map((item) => ({ ...item, audienceId: item.audienceId || legacyAudienceIds[item.eraId || ''] || 'community' })) } as PracticeStore
    ensureCommunitySurvey(store)
    return { store, migrated: true }
  }
  if (candidate.schemaVersion === 3) {
    const legacy = candidate as unknown as { evidence: Array<Omit<Evidence, 'audienceId'> & { audienceId?: string; eraId?: string }>; pledges: Array<Omit<StoredPledge, 'audienceId'> & { audienceId?: string; eraId?: string }>; rooms: InteractionRoom[]; audit: AuditEntry[]; roomVotes: PracticeStore['roomVotes']; source: 'demo'; seededAt: string }
    const store = { ...legacy, schemaVersion: 4, communitySurveys: [], communitySurveyResponses: [], evidence: legacy.evidence.map((item) => ({ ...item, audienceId: item.audienceId || legacyAudienceIds[item.eraId || ''] || 'community' })), pledges: legacy.pledges.map((item) => ({ ...item, audienceId: item.audienceId || legacyAudienceIds[item.eraId || ''] || 'community' })) } as PracticeStore
    ensureCommunitySurvey(store)
    return { store, migrated: true }
  }
  if (candidate.schemaVersion !== 4 || !Array.isArray(candidate.audit) || !Array.isArray(candidate.roomVotes)) throw new Error('实践数据文件版本不受支持')
  const store = candidate as PracticeStore
  const surveyMigrated = ensureCommunitySurvey(store)
  if (!store.rooms.some((room) => room.id === 'COMMUNITY-01')) {
    store.rooms.push(createCommunityRoom())
    return { store, migrated: true }
  }
  return { store, migrated: surveyMigrated }
}

function publicPledge(pledge: StoredPledge): PracticePledge {
  const result: Partial<StoredPledge> = { ...pledge }
  delete result.idempotencyKey
  return result as PracticePledge
}

class PracticeRepository {
  private readonly filePath = path.resolve(process.env.PRACTICE_DATA_PATH || path.join(process.cwd(), 'api', 'data', 'practice-store.json'))
  // Vercel functions have an ephemeral/read-only deployment filesystem. Keep
  // the demo store in the warm function instance there instead of making the
  // public survey fail with a 503 when the JSON snapshot cannot be written.
  private readonly memoryOnly = Boolean(process.env.VERCEL)
  private storePromise?: Promise<PracticeStore>
  private writeQueue: Promise<void> = Promise.resolve()

  private async load(): Promise<PracticeStore> {
    if (!this.storePromise) this.storePromise = this.readOrSeed()
    return this.storePromise
  }

  private async readOrSeed(): Promise<PracticeStore> {
    try {
      const result = validateStore(JSON.parse(await readFile(this.filePath, 'utf8')))
      if (result.migrated && !this.memoryOnly) await this.persist(result.store)
      return result.store
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const seed = createSeedStore()
        if (this.memoryOnly) return seed
        try {
          await this.persist(seed)
          return seed
        } catch (persistError) {
          throw new PracticeStorageError(persistError)
        }
      }
      if (this.memoryOnly) return createSeedStore()
      throw new PracticeStorageError(error)
    }
  }

  private async persist(store: PracticeStore): Promise<void> {
    if (this.memoryOnly) return
    const directory = path.dirname(this.filePath)
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`
    await mkdir(directory, { recursive: true })
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.filePath)
  }

  private async mutate<T>(mutation: (store: PracticeStore) => T): Promise<T> {
    let result!: T
    const operation = this.writeQueue.then(async () => {
      const store = await this.load()
      result = mutation(store)
      await this.persist(store)
    })
    this.writeQueue = operation.catch(() => undefined)
    try {
      await operation
    } catch (error) {
      throw error instanceof PracticeStorageError ? error : new PracticeStorageError(error)
    }
    return result
  }

  async listEvidence(includeUnpublished = false): Promise<Evidence[]> {
    const store = await this.load()
    const items = includeUnpublished ? store.evidence : store.evidence.filter((item) => item.workflowStatus === 'published')
    return structuredClone(items)
  }

  async updateEvidence(id: string, input: EvidenceUpdate): Promise<Evidence | undefined> {
    return this.mutate((store) => {
      const item = store.evidence.find((entry) => entry.id === id)
      if (!item) return undefined
      const previousStatus = item.workflowStatus
      const createdAt = new Date().toISOString()
      Object.assign(item, input, { updatedAt: createdAt })
      store.audit.unshift({ id: `audit-${Date.now()}-${store.audit.length + 1}`, action: 'evidence.update', targetId: id, previousStatus, nextStatus: item.workflowStatus, operator: input.updatedBy, createdAt })
      if (store.audit.length > 500) store.audit.length = 500
      return structuredClone(item)
    })
  }

  async listAudit(limit = 30): Promise<AuditEntry[]> {
    const store = await this.load()
    return structuredClone(store.audit.slice(0, Math.max(1, Math.min(limit, 100))))
  }

  async getRoom(id: string): Promise<InteractionRoom | undefined> {
    const room = (await this.load()).rooms.find((item) => item.id === id.toUpperCase())
    return room ? structuredClone(room) : undefined
  }

  async vote(id: string, optionIndex: number, participantId: string): Promise<{ room: InteractionRoom; deduplicated: boolean } | undefined> {
    return this.mutate((store) => {
      const room = store.rooms.find((item) => item.id === id.toUpperCase())
      if (!room) return undefined
      const participantHash = createHash('sha256').update(`${room.id}:${participantId}`).digest('hex')
      const existing = store.roomVotes.find((item) => item.roomId === room.id && item.participantHash === participantHash)
      if (existing) return { room: structuredClone(room), deduplicated: true }
      room.votes[optionIndex] += 1
      room.updatedAt = new Date().toISOString()
      room.eventId += 1
      store.roomVotes.push({ roomId: room.id, participantHash, optionIndex, createdAt: room.updatedAt })
      return { room: structuredClone(room), deduplicated: false }
    })
  }

  async getCommunitySurvey(id: string): Promise<CommunitySurvey | undefined> {
    const survey = (await this.load()).communitySurveys.find((item) => item.id === id.toUpperCase())
    return survey ? structuredClone(survey) : undefined
  }

  async submitCommunitySurvey(id: string, answers: number[], participantId: string, suggestion?: string): Promise<{ survey: CommunitySurvey; deduplicated: boolean } | undefined> {
    return this.mutate((store) => {
      const survey = store.communitySurveys.find((item) => item.id === id.toUpperCase())
      if (!survey) return undefined
      const participantHash = createHash('sha256').update(`${survey.id}:survey:${participantId}`).digest('hex')
      const existing = store.communitySurveyResponses.find((item) => item.surveyId === survey.id && item.participantHash === participantHash)
      if (existing) return { survey: structuredClone(survey), deduplicated: true }
      answers.forEach((answer, questionIndex) => {
        survey.counts[questionIndex][answer] += 1
      })
      survey.responseCount += 1
      survey.updatedAt = new Date().toISOString()
      survey.eventId += 1
      if (suggestion) {
        survey.suggestions.push({ text: suggestion, createdAt: survey.updatedAt })
        if (survey.suggestions.length > 50) survey.suggestions.splice(0, survey.suggestions.length - 50)
      }
      store.communitySurveyResponses.push({ surveyId: survey.id, participantHash, answers: [...answers], suggestion, createdAt: survey.updatedAt })
      return { survey: structuredClone(survey), deduplicated: false }
    })
  }

  async setRoomLifecycle(id: string, lifecycle: InteractionRoom['lifecycle'], operator: string): Promise<InteractionRoom | undefined> {
    return this.mutate((store) => {
      const room = store.rooms.find((item) => item.id === id.toUpperCase())
      if (!room) return undefined
      const previousStatus = room.lifecycle
      room.lifecycle = lifecycle
      room.eventId += 1
      room.updatedAt = new Date().toISOString()
      store.audit.unshift({ id: `audit-${Date.now()}-${store.audit.length + 1}`, action: 'room.status', targetId: room.id, previousStatus, nextStatus: lifecycle, operator, createdAt: room.updatedAt })
      if (store.audit.length > 500) store.audit.length = 500
      return structuredClone(room)
    })
  }

  async getPledgeByKey(idempotencyKey: string): Promise<PracticePledge | undefined> {
    const pledge = (await this.load()).pledges.find((item) => item.idempotencyKey === idempotencyKey)
    return pledge ? publicPledge(pledge) : undefined
  }

  async createPledge(idempotencyKey: string, input: Pick<PracticePledge, 'action' | 'audienceId' | 'nickname'>): Promise<PracticePledge> {
    return this.mutate((store) => {
      const existing = store.pledges.find((item) => item.idempotencyKey === idempotencyKey)
      if (existing) return publicPledge(existing)
      const pledge: StoredPledge = { id: `pledge-${Date.now()}-${store.pledges.length + 1}`, ...input, createdAt: new Date().toISOString(), source: 'demo', idempotencyKey }
      store.pledges.push(pledge)
      return publicPledge(pledge)
    })
  }

  async pledgeCount(): Promise<number> {
    return (await this.load()).pledges.length
  }

  async health(): Promise<{ storage: 'ok'; schemaVersion: 4; source: 'demo' }> {
    const store = await this.load()
    return { storage: 'ok', schemaVersion: store.schemaVersion, source: store.source }
  }
}

export const practiceRepository = new PracticeRepository()
