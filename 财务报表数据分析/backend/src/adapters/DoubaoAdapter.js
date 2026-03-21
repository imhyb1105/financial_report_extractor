import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

/**
 * 豆包(火山引擎)模型适配器
 * API文档: https://www.volcengine.com/docs/82379
 */
class DoubaoAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('doubao', apiKey, options)
    this.baseURL = 'https://ark.cn-beijing.volces.com/api/v3'
    this.model = options.model || 'doubao-seed-2-0-pro-260215'
  }

  /**
   * 验证API Key
   */
  async validateKey() {
    try {
      const response = await axios.post(
        `${this.baseURL}/responses`,
        {
          model: this.model,
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: '你好' }]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      return {
        success: true,
        models: [this.model]
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      }
    }
  }

  /**
   * 提取财务数据
   * @param {Array} pages - 页面数组，支持多种格式
   * @param {Object} context - 提取上下文
   */
  async extract(pages, context) {
    const prompt = this.buildExtractPrompt(context)
    const content = []

    // 合并所有文本内容
    let fullText = ''
    const images = []

    for (const page of pages) {
      if (page.type === 'text' && page.content) {
        fullText += `\n\n--- 第 ${page.pageNumber} 页 ---\n${page.content}`
      } else if (page.type === 'url') {
        images.push({
          type: 'input_image',
          image_url: page.url
        })
      } else if (page.type === 'base64') {
        images.push({
          type: 'input_image',
          image_url: `data:image/png;base64,${page.data}`
        })
      }
    }

    // 如果有图片，先添加图片（最多10张）
    for (const img of images.slice(0, 10)) {
      content.push(img)
    }

    // 添加文本提示和PDF内容
    const fullPrompt = `${prompt}

## PDF内容（共${pages.length}页）

${fullText}

请根据以上PDF内容，提取所需的财务数据。如果某些数据在PDF中找不到，请在对应字段标记为 null 并在 confidence 中说明原因。`

    content.push({
      type: 'input_text',
      text: fullPrompt
    })

    console.log(`[DoubaoAdapter] Sending request with ${pages.length} pages, ${fullText.length} characters`)

    try {
      const response = await axios.post(
        `${this.baseURL}/responses`,
        {
          model: this.model,
          input: [
            {
              role: 'user',
              content
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3分钟超时
        }
      )

      const text = response.data?.output?.text || response.data?.choices?.[0]?.message?.content || ''
      console.log(`[DoubaoAdapter] Received response: ${text.substring(0, 200)}...`)

      return this.parseResponse(text)
    } catch (error) {
      console.error('[DoubaoAdapter] Extract error:', error.message)
      if (error.response) {
        console.error('[DoubaoAdapter] Response data:', JSON.stringify(error.response.data, null, 2))
      }
      throw new Error(`豆包模型提取失败: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * 验证/裁决提取结果
   */
  async validate(resultA, resultB, context) {
    const prompt = this.buildValidatePrompt(resultA, resultB)

    try {
      const response = await axios.post(
        `${this.baseURL}/responses`,
        {
          model: this.model,
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: prompt }]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      const text = response.data?.output?.text || response.data?.choices?.[0]?.message?.content || ''
      return this.parseResponse(text)
    } catch (error) {
      console.error('[DoubaoAdapter] Validate error:', error.message)
      throw new Error(`豆包模型验证失败: ${error.response?.data?.message || error.message}`)
    }
  }

  getFeatures() {
    return ['vision', 'multimodal', 'long-context']
  }
}

export default DoubaoAdapter
