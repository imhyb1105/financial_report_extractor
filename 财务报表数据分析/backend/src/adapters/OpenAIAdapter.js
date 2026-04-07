import OpenAI from 'openai'
import BaseAdapter from './BaseAdapter.js'

/**
 * OpenAI模型适配器
 */
class OpenAIAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('openai', apiKey, options)
    this.client = new OpenAI({ apiKey })
    this.model = options.model || 'gpt-5.4-codex'
  }

  async validateKey() {
    try {
      const models = await this.client.models.list()
      return { success: true, models: models.data.map(m => m.id).slice(0, 10) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async extract(images, context) {
    const prompt = this.buildExtractPrompt(context)
    const content = []

    // 添加图片
    for (const image of images.slice(0, 10)) {
      if (image.type === 'url') {
        content.push({
          type: 'image_url',
          image_url: { url: image.url }
        })
      } else if (image.type === 'base64') {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${image.data}` }
        })
      }
    }

    content.push({ type: 'text', text: prompt })

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content }],
      max_tokens: 4096
    })

    const text = response.choices[0].message.content
    return this.parseResponse(text)
  }

  async validate(resultA, resultB, context) {
    const prompt = this.buildValidatePrompt(resultA, resultB)

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    })

    const text = response.choices[0].message.content
    return this.parseResponse(text)
  }

  getFeatures() {
    return ['vision', 'function-calling']
  }
}

export default OpenAIAdapter
