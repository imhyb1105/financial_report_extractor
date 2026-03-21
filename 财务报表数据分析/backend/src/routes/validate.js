import express from 'express'
import AdapterFactory from '../adapters/AdapterFactory.js'

const router = express.Router()

// 验证 API Key
router.post('/', async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: '请提供provider和apiKey'
        }
      })
    }

    const adapter = AdapterFactory.createAdapter(provider, apiKey)

    if (!adapter) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `不支持的模型提供商: ${provider}`
        }
      })
    }

    const result = await adapter.validateKey()

    res.json({
      success: result.success,
      data: {
        provider,
        valid: result.success,
        models: result.models || [],
        error: result.error
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
