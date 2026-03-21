import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

/**
 * 智谱AI GLM模型适配器
 */
class GLMAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('glm', apiKey, options)
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4'
    this.model = options.model || 'glm-4'
  }

  async validateKey() {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      return { success: true, models: [this.model] }
    } catch (error) {
      return { success: false, error: error.response?.data?.error?.message || error.message }
    }
  }

  async extract(images, context) {
    const prompt = this.buildExtractPrompt(context)
    const content = []

    // GLM-4V支持图片
    for (const image of images.slice(0, 10)) {
      if (image.type === 'base64') {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${image.data}` }
        })
      }
    }

    content.push({ type: 'text', text: prompt })

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [{ role: 'user', content }],
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    )

    const text = response.data.choices[0].message.content
    return this.parseResponse(text)
  }

  async validate(resultA, resultB, context) {
    const prompt = this.buildValidatePrompt(resultA, resultB)

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const text = response.data.choices[0].message.content
    return this.parseResponse(text)
  }

  getFeatures() {
    return ['vision', 'long-context']
  }
}

export default GLMAdapter
