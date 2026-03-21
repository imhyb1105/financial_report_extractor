import Anthropic from '@anthropic-ai/sdk'
import BaseAdapter from './BaseAdapter.js'

/**
 * Claude模型适配器
 */
class ClaudeAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('claude', apiKey, options)
    this.client = new Anthropic({ apiKey })
    this.model = options.model || 'claude-3-5-sonnet-20241022'
  }

  async validateKey() {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
      return { success: true, models: [this.model] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async extract(images, context) {
    const prompt = this.buildExtractPrompt(context)
    const content = []

    // 添加图片
    for (const image of images.slice(0, 20)) { // Claude限制最多图片数
      if (image.type === 'base64') {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: image.data
          }
        })
      } else if (image.type === 'url') {
        // Claude不支持URL，需要下载后转base64
        // 这里简化处理，实际需要下载
        continue
      }
    }

    content.push({ type: 'text', text: prompt })

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content }]
    })

    const text = response.content[0].text
    return this.parseResponse(text)
  }

  async validate(resultA, resultB, context) {
    const prompt = this.buildValidatePrompt(resultA, resultB)

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].text
    return this.parseResponse(text)
  }

  getFeatures() {
    return ['vision', 'long-context']
  }
}

export default ClaudeAdapter
