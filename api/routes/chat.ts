import { Router, type Request, type Response } from 'express'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PageContext = {
  path?: string
  label?: string
  schoolGrade?: 'primary' | 'junior' | 'senior'
  schoolAnswer?: string
  ruralContext?: {
    crop: string
    acreage: string
    stage: string
    resourceSource: string
    details: string
  } | null
  practice?: {
    audience?: string
    title?: string
    focus?: string
    tasks?: string[]
  } | null
  communitySurvey?: {
    responseCount: number
    questions: Array<{ dimension: string; options: string[]; counts: number[] }>
    suggestions: string[]
  } | null
}

const router = Router()
const rateWindowMs = 60_000
const maxRequestsPerWindow = 20
const requestWindows = new Map<string, { startedAt: number; count: number }>()

const instructions = `
你是“小俭”，一位聪明、阳光、开朗的中文少女桌宠，也是“勤俭节约社会实践”网站的 AI 讲解员。

目标：准确回答用户的问题，帮助用户理解勤俭节约、浏览当前页面、形成可执行的小行动；也可以自然地聊学习、生活和一般知识。

回答要求：
- 默认使用简体中文，语气明亮、自然、有亲和力，不幼稚，不说教。
- 先直接回答问题，再在有帮助时补充一个简短建议或下一步。
- 通常控制在 2 至 5 句话，适合语音播报；用户要求详细时再展开。
- 对节约主题给出具体、现实、容易坚持的做法。
- 页面上下文只作为参考；不要假装看到了未提供的信息。
- 不确定的事实要明确说明，不编造数据、来源或项目功能。
- 不声称自己就是 Codex；你是这个项目中的“小俭”。
`.trim()

const schoolGradeRules: Record<NonNullable<PageContext['schoolGrade']>, string> = {
  primary: '当前是小学生课堂。只用具体、短句、生活化的解释，不引入初中或高中概念。每次回答先判断题目，再说明一个原因，最后给一个课堂里马上能做的小行动。',
  junior: '当前是初中生课堂。可以解释原因、比较做法和使用简单记录，但不要使用高中阶段的复杂模型、统计术语或抽象论证。',
  senior: '当前是高中生课堂。可以讨论变量、证据、责任和检验方式，但仍要围绕题目，不凭空编造数据或研究结论。',
}

function normalizeCommunitySurvey(value: unknown): NonNullable<PageContext['communitySurvey']> | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { responseCount?: unknown; questions?: unknown; suggestions?: unknown }
  const responseCount = Number.isInteger(candidate.responseCount) && Number(candidate.responseCount) >= 0 ? Math.min(Number(candidate.responseCount), 100_000) : 0
  const questions = Array.isArray(candidate.questions) ? candidate.questions.slice(0, 4).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const question = item as { dimension?: unknown; options?: unknown; counts?: unknown }
    if (typeof question.dimension !== 'string' || !Array.isArray(question.options) || !Array.isArray(question.counts)) return []
    const options = question.options.slice(0, 4).map((option) => typeof option === 'string' ? option.trim().slice(0, 100) : '').filter(Boolean)
    if (!options.length) return []
    const counts = options.map((_option, index) => Number.isInteger(question.counts?.[index]) && Number(question.counts[index]) >= 0 ? Math.min(Number(question.counts[index]), 100_000) : 0)
    return [{ dimension: question.dimension.trim().slice(0, 30), options, counts }]
  }) : []
  const suggestions = Array.isArray(candidate.suggestions) ? candidate.suggestions
    .filter((item): item is string => typeof item === 'string')
    .map((item) => Array.from(item).filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    }).join('').replace(/\s+/g, ' ').trim().slice(0, 200))
    .filter(Boolean)
    .slice(-20) : []
  return { responseCount, questions, suggestions }
}

function enforceSchoolAnswer(reply: string, page: PageContext) {
  if (page.schoolGrade && page.path === '/practice/school') {
    const fixedAnswer = page.schoolAnswer ? `标准答案：${page.schoolAnswer}。` : '标准答案以课堂题库标注为准。';
    return `${fixedAnswer}\n${reply}\n\n课堂核对：以上解释不能改变题库标准答案。`;
  }
  return reply;
}

function normalizeRuralContext(value: unknown): NonNullable<PageContext['ruralContext']> | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const read = (key: string, limit: number) => typeof candidate[key] === 'string' ? candidate[key].trim().slice(0, limit) : ''
  const context = { crop: read('crop', 40), acreage: read('acreage', 20), stage: read('stage', 50), resourceSource: read('resourceSource', 50), details: read('details', 500) }
  return context.crop || context.stage || context.details ? context : null
}

function normalizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<ChatMessage>
      return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string'
    })
    .slice(-10)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }))
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
    choices?: Array<{ message?: { content?: string } }>
  }
  if (response.output_text?.trim()) return response.output_text.trim()
  const compatibleReply = response.choices?.[0]?.message?.content
  if (compatibleReply?.trim()) return compatibleReply.trim()
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim()
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const clientKey = req.ip || 'unknown-client'
  const now = Date.now()
  const window = requestWindows.get(clientKey)
  if (!window || now - window.startedAt >= rateWindowMs) {
    requestWindows.set(clientKey, { startedAt: now, count: 1 })
  } else {
    window.count += 1
    if (window.count > maxRequestsPerWindow) {
      res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' })
      return
    }
  }

  const provider = (process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai')).toLowerCase()
  const apiKey = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(503).json({ success: false, code: 'AI_NOT_CONFIGURED', error: 'AI 服务尚未配置' })
    return
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) {
    res.status(400).json({ success: false, error: '问题不能为空' })
    return
  }
  if (message.length > 800) {
    res.status(400).json({ success: false, error: '问题过长，请精简后再试' })
    return
  }

  const history = normalizeHistory(req.body?.history)
  const rawPage = (req.body?.page ?? {}) as PageContext
  const page: PageContext = {
    ...rawPage,
    path: typeof rawPage.path === 'string' ? rawPage.path.slice(0, 100) : undefined,
    label: typeof rawPage.label === 'string' ? rawPage.label.slice(0, 60) : undefined,
    communitySurvey: normalizeCommunitySurvey(rawPage.communitySurvey),
    ruralContext: normalizeRuralContext(rawPage.ruralContext),
  }
  const schoolInstruction = page.schoolGrade ? `\n\n年级约束：${schoolGradeRules[page.schoolGrade]}${page.schoolAnswer ? ` 题库固定标准答案是${page.schoolAnswer}，必须以此为准，只解释理由，不得改判。` : ''}` : ''
  const communityInstruction = page.communitySurvey ? `

社区调研分析约束：
- 只能使用当前网站上下文中的 communitySurvey 数据，绝不编造参与人数、百分比、居民身份、原话、预算或节约量。
- 开头明确写出有效问卷数和选填建议数；样本少时必须说明结论仅代表当前参与者。
- 将“数据事实”“合理解释”“行动建议”清楚区分，不能把推测写成事实。
- 比较最高选项与次高选项；票数相同要说明尚未形成单一共识，不得强行判断多数。
- 居民原声只能概括已提供的 suggestions；没有建议时明确写“暂无选填建议”。
- 调研完全匿名，系统没有任何参与者的联系方式、楼栋或身份。不得建议联系某位答卷提交者，不得使用“他/她”“这位居民”“所在楼栋”，不得建议收集姓名或联系方式。
- 样本只有 1 份时，只能称“当前答卷”或“当前参与样本”，不得推断参与者心理、职业、家庭情况或社交偏好。
- 样本少于 5 份时，只描述“当前样本选择了什么”，不得使用“反映出、表明其、说明其倾向、显示出其偏好”等心理推断。选项可占当前样本 100%，但只能说尚不足以形成稳定的社区共识，不能写成“没有多数”。
- 行动方案中的人数、覆盖量和完成率只能标注为“建议目标”，不得与已经观测到的数据混写。
- 输出必须包含：核心发现、居民建议归纳、七天行动方案、评估指标与风险。七天方案要写责任主体、时间节点和检查方式。
- 全文控制在 800 至 1200 个汉字，必须完整结束，不写寒暄，不使用 Markdown 标题符号。
- 不使用空泛口号，不要求居民披露个人信息，不读出星号或 Markdown 符号。
` : ''
  const ruralInstruction = page.path === '/practice/rural' && page.ruralContext ? `

Rural resource-allocation safety rules:
- Treat ruralContext as the complete set of verified facts. Separate facts, assumptions, and items that must be checked on site.
- Do not invent weather, soil measurements, water quality, crop disease, yield, local policy, prices, savings, or available equipment.
- Do not prescribe pesticide names, fertilizer or irrigation quantities, dilution ratios, application dates, or equipment settings. Do not claim guaranteed yield or savings.
- For pests, disease, chemicals, groundwater safety, electrical work, machinery, or food safety, provide only observation and risk-isolation steps and tell the farmer to confirm with a local agricultural technician or qualified professional.
- Prioritize preserving crops and preventing avoidable loss. Recommend staged allocation, small-area verification, records, and stop conditions before expanding.
- Output exactly these sections in plain Chinese: 资源盘点、分配优先级、今天执行、7天记录、需要专业确认. Answer each distinct issue in the user's details. Never fill missing values with guesses.
- Do not output Markdown emphasis, decorative claims, or unsupported numeric targets.
` : ''
  const pageContext = JSON.stringify({
    schoolGrade: page.schoolGrade || null,
    schoolAnswer: page.schoolAnswer || null,
    schoolGradeRule: schoolInstruction || null,
    ruralContext: page.ruralContext || null,
    currentPage: page.label || page.path || '未知页面',
    practice: page.practice || null,
    communitySurvey: page.communitySurvey || null,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const isDeepSeek = provider === 'deepseek'
    const response = await fetch(
      isDeepSeek ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/responses',
      {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(isDeepSeek
        ? {
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages: [
              { role: 'system', content: `${instructions}${communityInstruction}${ruralInstruction}\n\n当前网站上下文：${pageContext}` },
              ...history,
              { role: 'user', content: message },
            ],
            temperature: page.communitySurvey || page.ruralContext ? 0.25 : 0.7,
            max_tokens: page.communitySurvey ? 1500 : page.ruralContext ? 1200 : 500,
          }
        : {
            model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
            instructions: `${instructions}${communityInstruction}${ruralInstruction}\n\n当前网站上下文：${pageContext}`,
            input: [...history, { role: 'user', content: message }],
            reasoning: { effort: 'low' },
            text: { verbosity: page.communitySurvey || page.ruralContext ? 'medium' : 'low' },
            store: false,
          }),
      signal: controller.signal,
    })

    const payload = await response.json() as unknown
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : ''
      throw new Error(detail || `${provider} API returned ${response.status}`)
    }

    const reply = enforceSchoolAnswer(extractText(payload), page)
    if (!reply) throw new Error('模型没有返回文本')
    res.status(200).json({ success: true, reply })
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat.upstream_error', requestId: res.locals.requestId, errorName: error instanceof Error ? error.name : 'unknown' }))
    res.status(502).json({ success: false, error: '小俭暂时连接不上 AI，已可使用本地回答' })
  } finally {
    clearTimeout(timeout)
  }
})

export default router
