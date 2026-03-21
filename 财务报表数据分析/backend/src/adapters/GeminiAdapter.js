import { GoogleGenerativeAI } from '@google/generative-ai'
import BaseAdapter from './BaseAdapter.js'

/**
 * Google Gemini模型适配器
 */
class GeminiAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('gemini', apiKey, options)
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = options.model || 'gemini-1.5-pro'
  }

  async validateKey() {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model })
      const result = await model.generateContent('Hi')
      return { success: true, models: [this.model] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async extract(images, context) {
    const prompt = this.buildExtractPrompt(context)
    const model = this.genAI.getGenerativeModel({ model: this.model })

    const parts = []

    // 添加图片
    for (const image of images) {
      if (image.type === 'base64') {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: image.data
          }
        })
      }
    }

    parts.push({ text: prompt })

    const result = await model.generateContent(parts)
    const text = result.response.text()
    return this.parseResponse(text)
  }

  async validate(resultA, resultB, context) {
    const prompt = this.buildValidatePrompt(resultA, resultB)
    const model = this.genAI.getGenerativeModel({ model: this.model })

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return this.parseResponse(text)
  }

  getFeatures() {
    return ['vision', 'long-context']
  }
}

export default GeminiAdapter
