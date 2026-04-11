import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import ExtractionService from '../services/ExtractionService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 检测运行环境
const isVercel = !!process.env.VERCEL
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../../uploads')

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('只支持PDF文件'), false)
    }
  }
})

// 数据提取接口
// V1.7: 返回debugLog字段用于调试
// V2.6: 支持JSON格式的文本提取（大文件客户端预处理）
router.post('/', async (req, res, next) => {
  try {
    // 检查是否为JSON请求（客户端已提取文本的大文件）
    if (req.is('application/json') && req.body.textContent) {
      return handleTextExtraction(req, res)
    }

    // 否则走multer文件上传流程
    upload.single('pdf')(req, res, (err) => {
      if (err) return next(err)
      handleFileUploadExtraction(req, res, next)
    })
  } catch (error) {
    next(error)
  }
})

// 处理文件上传提取
async function handleFileUploadExtraction(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '请上传PDF文件'
        }
      })
    }

    const { models, displayUnit } = req.body

    if (!models) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_MODELS',
          message: '请提供模型配置'
        }
      })
    }

    const parsedModels = typeof models === 'string' ? JSON.parse(models) : models

    const extractionService = new ExtractionService()
    const { data, debugLog } = await extractionService.extract(
      req.file.path,
      parsedModels,
      displayUnit || 'wan'
    )

    // 调试日志：检查 modelResults 结构
    console.log(`[ExtractRoute] Result keys: ${Object.keys(data).join(', ')}`)
    console.log(`[ExtractRoute] modelResults exists: ${!!data.modelResults}`)
    console.log(`[ExtractRoute] debugLog.modelCalls: ${debugLog?.modelCalls?.length || 0}`)

    res.json({
      success: true,
      data,
      debugLog
    })
  } catch (error) {
    next(error)
  }
}

// 处理文本提取（大文件客户端预处理后）
async function handleTextExtraction(req, res) {
  const { textContent, pages, pageCount, fileName, models, displayUnit } = req.body

  if (!textContent) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_TEXT',
        message: '请提供文本内容'
      }
    })
  }

  if (!models || models.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_MODELS',
        message: '请提供模型配置'
      }
    })
  }

  console.log(`[ExtractRoute] Text-based extraction: file=${fileName}, pages=${pageCount}, textLen=${textContent.length}`)

  const extractionService = new ExtractionService()
  const { data, debugLog } = await extractionService.extractFromText(
    textContent,
    pages,
    pageCount,
    fileName,
    models,
    displayUnit || 'wan'
  )

  console.log(`[ExtractRoute] Text extraction result keys: ${Object.keys(data).join(', ')}`)

  res.json({
    success: true,
    data,
    debugLog
  })
}

// V2.13: 独立的非财务信息提取接口（解决504超时问题）
router.post('/non-financial', async (req, res, next) => {
  try {
    const { textContent, pages, pageCount, fileName, models } = req.body

    if (!pages || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PAGES',
          message: '请提供页面数据'
        }
      })
    }

    if (!models || models.length < 3) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_MODELS',
          message: '非财务信息提取需要至少3个模型配置'
        }
      })
    }

    console.log(`[ExtractRoute] Non-financial extraction: file=${fileName}, pages=${pageCount}`)

    const extractionService = new ExtractionService()
    const result = await extractionService.extractNonFinancialFromText(
      pages,
      textContent || '',
      pageCount,
      fileName,
      models
    )

    res.json({
      success: true,
      data: {
        nonFinancialInfo: result.nonFinancialInfo,
        nonFinancialInfoEnhanced: result.nonFinancialInfoEnhanced
      },
      debugLog: result.debugLog
    })
  } catch (error) {
    next(error)
  }
})

// 获取提取状态（用于长任务轮询）
router.get('/status/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params
    // 这里可以扩展为异步任务状态查询
    res.json({
      success: true,
      data: {
        taskId,
        status: 'completed',
        progress: 100
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
