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
import { initDatabase } from '../database/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(rateLimiter)

// 静态文件服务（用于测试PDF）
app.use('/uploads', express.static(join(__dirname, '../uploads')))

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
    version: '2.5.0',
    timestamp: new Date().toISOString()
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

const PORT = process.env.PORT || 3000

// 启动服务器并初始化数据库
async function startServer() {
  try {
    // 初始化数据库
    console.log('🔄 正在初始化数据库...')
    await initDatabase()
    console.log('✅ 数据库初始化完成')

    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
      console.log(`📚 API 文档: http://localhost:${PORT}/api/health`)
    })
  } catch (err) {
    console.error('❌ 启动失败:', err)
    process.exit(1)
  }
}

startServer()

export default app
