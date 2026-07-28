/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'
import practiceRoutes from './routes/practice.js'
import { PracticeStorageError, practiceRepository } from './repositories/practiceRepository.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID()
  const requestPath = req.path
  const startedAt = performance.now()
  res.locals.requestId = requestId
  res.locals.requestPath = requestPath
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    if (requestPath === '/api/health') return
    console.log(JSON.stringify({
      event: 'http.request',
      requestId,
      method: req.method,
      path: requestPath,
      status: res.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    }))
  })
  next()
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/practice', practiceRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const practice = await practiceRepository.health()
      res.status(200).json({
        success: true,
        message: 'ok',
        data: {
          service: {
            status: 'ok',
            uptimeSeconds: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
            demoFallbackAvailable: true,
          },
          dependencies: {
            practice,
            ai: {
              configured: Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY),
              provider: process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai'),
            },
            admin: { configured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) || process.env.NODE_ENV !== 'production' },
          },
        },
      })
    } catch (error) {
      if (error instanceof PracticeStorageError) {
        res.status(503).json({ success: false, error: '实践数据暂时不可用' })
        return
      }
      throw error
    }
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  void next
  const status = error instanceof PracticeStorageError ? 503 : 500
  console.error(JSON.stringify({
    event: 'http.error',
    requestId: res.locals.requestId,
    method: req.method,
    path: res.locals.requestPath,
    status,
    errorName: error.name || 'Error',
  }))
  if (error instanceof PracticeStorageError) {
    res.status(503).json({
      success: false,
      error: '实践数据暂时不可用，请稍后重试',
    })
    return
  }
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
    requestId: res.locals.requestId,
  })
})

export default app
