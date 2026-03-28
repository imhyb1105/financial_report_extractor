import express from 'express'

const router = express.Router()

// 支持的模型列表
const SUPPORTED_MODELS = [
  {
    provider: 'claude',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'openai',
    name: 'OpenAI GPT',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
    ],
    features: ['vision', 'function-calling']
  },
  {
    provider: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' }
    ],
    features: ['vision']
  },
  {
    provider: 'kimi',
    name: 'Moonshot Kimi',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K' },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K' }
    ],
    features: ['long-context']
  },
  {
    provider: 'glm',
    name: '智谱AI GLM',
    models: [
      { id: 'glm-5', name: 'GLM-5 (最新)' },
      { id: 'glm-4', name: 'GLM-4' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' }
    ],
    features: ['vision', 'long-context']
  },
  {
    provider: 'minimax',
    name: 'MiniMax',
    models: [
      { id: 'abab6.5-chat', name: 'ABAB 6.5 Chat' },
      { id: 'abab5.5-chat', name: 'ABAB 5.5 Chat' }
    ],
    features: ['vision']
  },
  {
    provider: 'doubao',
    name: '豆包(火山引擎)',
    models: [
      { id: 'doubao-seed-2-0-pro-260215', name: 'Doubao Seed 2.0 Pro' }
    ],
    features: ['vision', 'multimodal']
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
