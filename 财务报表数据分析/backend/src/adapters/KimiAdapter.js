import OpenAI from 'openai'
import BaseAdapter from './BaseAdapter.js'

/**
 * Kimi(Moonshot)模型适配器
 * 兼容OpenAI API格式
 */
class KimiAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('kimi', apiKey, options)
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.moonshot.cn/v1'
    })
    this.model = options.model || 'kimi-k2.5'
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
    // Kimi主要是长文本模型，图片能力有限
    const prompt = this.buildExtractPrompt(context)

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
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
    return ['long-context']
  }
}

export default KimiAdapter
