import OpenAI from 'openai'
import BaseAdapter from './BaseAdapter.js'

/**
 * DeepSeek模型适配器
 * 兼容OpenAI API格式
 */
class DeepSeekAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('deepseek', apiKey, options)
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    })
    this.model = options.model || 'deepseek-chat'
  }

  async validateKey() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
      return { success: true, models: [this.model] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async extract(images, context) {
    const prompt = this.buildExtractPrompt(context)
    const content = []

    // DeepSeek Vision支持图片
    for (const image of images.slice(0, 10)) {
      if (image.type === 'base64') {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${image.data}` }
        })
      } else if (image.type === 'url') {
        content.push({
          type: 'image_url',
          image_url: { url: image.url }
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
    return ['vision']
  }
}

export default DeepSeekAdapter
