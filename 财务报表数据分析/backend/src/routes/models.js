import express from 'express'

const router = express.Router()

// 支持的模型列表
// V3.0: 更新各模型提供商的最新模型 (2026-04-03)
const SUPPORTED_MODELS = [
  {
    provider: 'claude',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-6-20250414', name: 'Claude 4.6 Sonnet (最新)' },
      { id: 'claude-opus-4-6-20250414', name: 'Claude 4.6 Opus (旗舰)' },
      { id: 'claude-4-6-20250414', name: 'Claude 4.6' }
    ],
    features: ['vision', 'long-context', 'reasoning']
  },
  {
    provider: 'openai',
    name: 'OpenAI GPT',
    models: [
      { id: 'gpt-5.4-codex', name: 'GPT-5.4-Codex (最新)' },
      { id: 'gpt-5.3-codex', name: 'GPT-5.3-Codex' }
    ],
    features: ['vision', 'function-calling', 'reasoning']
  },
  {
    provider: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (最新)' },
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro' },
      { id: 'veo-3.1', name: 'Veo 3.1' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2 (最新)' },
      { id: 'deepseek-ocr2', name: 'DeepSeek-OCR2' }
    ],
    features: ['vision', 'reasoning']
  },
  {
    provider: 'kimi',
    name: 'Moonshot Kimi',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5 万亿参数 (最新)' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'glm',
    name: '智谱AI GLM',
    models: [
      { id: 'glm-5-turbo', name: 'GLM-5-Turbo (最新)' },
      { id: 'glm-5', name: 'GLM-5' },
      { id: 'glm-4.7', name: 'GLM-4.7' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'minimax',
    name: 'MiniMax',
    models: [
      { id: 'minimax-m2.7', name: 'MiniMax M2.7 (最新旗舰)' },
      { id: 'minimax-m2.5', name: 'MiniMax M2.5' }
    ],
    features: ['vision', 'long-context'],
    note: '支持 JWT Token Plan Key 或 group_id:api_key 格式'
  },
  {
    provider: 'doubao',
    name: '豆包(字节跳动)',
    models: [
      { id: 'doubao-seed-2.0', name: 'Doubao-Seed-2.0 (最新)' },
      { id: 'seedance-2.0', name: 'Seedance 2.0' },
      { id: 'seedream-5.0-lite', name: 'Seedream 5.0 Lite' }
    ],
    features: ['vision', 'multimodal', 'long-context']
  }
]

// 获取支持的模型列表
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      models: SUPPORTED_MODELS,
      total: SUPPORTED_MODELS.length
    }
  })
})

export default router
