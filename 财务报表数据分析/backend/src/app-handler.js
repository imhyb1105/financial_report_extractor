/**
 * Vercel Serverless Function 入口
 * 导出 Express app 但不启动服务器
 */

import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import errorHandler from './middleware/errorHandler.js'
import rateLimiter from './middleware/rateLimiter.js'
import extractRouter from './routes/extract.js'
import validateRouter from './routes/validate.js'
import modelsRouter from './routes/models.js'
import feedbackRouter from './routes/feedback.js'
import adminRouter from './routes/admin.js'
import pdfSourceRouter from './routes/pdfSource.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(rateLimiter)

// 静态文件服务（用于测试PDF）- Vercel 上可能不可用
// app.use('/uploads', express.static(join(__dirname, '../uploads')))

// 路由
app.use('/api/extract', extractRouter)
app.use('/api/validate', validateRouter)
app.use('/api/models', modelsRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/admin', adminRouter)
app.use('/api/pdf-source', pdfSourceRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.12.0',
    timestamp: new Date().toISOString(),
    provider: 'vercel'
  })
})

// 错误处理
app.use(errorHandler)

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在'
    }
  })
})

export default app
