import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import ExtractionService from '../services/ExtractionService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
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
router.post('/', upload.single('pdf'), async (req, res, next) => {
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
    const result = await extractionService.extract(
      req.file.path,
      parsedModels,
      displayUnit || 'wan'
    )

    res.json({
      success: true,
      data: result
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
