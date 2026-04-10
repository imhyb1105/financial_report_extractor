import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

/**
 * MiniMax模型适配器
 * V2.8: 更新模型列表，添加 GroupId 支持
 * V2.9: 支持 Token Plan Key (JWT格式)
 */
class MiniMaxAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('minimax', apiKey, options)
    this.baseURL = 'https://api.minimax.chat/v1'
    // V2.9: 默认使用最新的 M2.7 模型
    this.model = options.model || 'minimax-m2.7'

    // V2.9: 支持三种 API Key 格式
    // 1. Token Plan Key (JWT格式): eyJhbGci...
    // 2. 传统格式: group_id:api_key
    // 3. 纯 api_key (需要额外提供 groupId)

    if (apiKey.startsWith('eyJ') && apiKey.includes('.')) {
      // JWT Token Plan Key 格式
      this.apiKey = apiKey
      this.isJwtToken = true
      // 从 JWT payload 中提取 GroupID
      try {
        const payload = JSON.parse(Buffer.from(apiKey.split('.')[1], 'base64').toString())
        this.groupId = payload.GroupID || payload.groupId || payload.sub || ''
      } catch (e) {
        this.groupId = ''
      }
    } else {
      this.isJwtToken = false
      const parts = apiKey.split(':')
      if (parts.length === 2) {
        this.groupId = parts[0]
        this.apiKey = parts[1]
      } else {
        this.groupId = options.groupId || ''
        this.apiKey = apiKey
      }
    }
  }

  async validateKey() {
    try {
      // V2.9: JWT Token Plan Key 格式不需要显式的 groupId 检查
      if (!this.groupId && !this.isJwtToken) {
        return {
          success: false,
          error: 'MiniMax API Key 格式应为 "group_id:api_key" 或 JWT Token，请在MiniMax开放平台获取'
        }
      }

      // 构建请求 URL
      const url = this.groupId
        ? `${this.baseURL}/chat/completions?GroupId=${this.groupId}`
        : `${this.baseURL}/chat/completions`

      const response = await axios.post(
        url,
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
      const errorMsg = error.response?.data?.error?.message || error.message
      // 更友好的错误提示
      if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        return { success: false, error: 'API Key 无效或 GroupId 不正确' }
      }
      return { success: false, error: errorMsg }
    }
  }

  async extract(images, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    const prompt = context?.prompt || this.buildExtractPrompt(context)

    // 收集文本和图片
    let fullText = ''
    const imageContents = []

    for (const page of images) {
      if (page.type === 'text' && page.content) {
        fullText += `\n\n--- 第 ${page.pageNumber} 页 ---\n${page.content}`
      } else if (page.type === 'base64') {
        imageContents.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${page.data}` }
        })
      }
    }

    const fullPrompt = `${prompt}\n\n---\n# 📄 PDF原文内容\n${fullText}`

    const content = []
    // MiniMax 视觉模型支持图片
    for (const img of imageContents.slice(0, 10)) {
      content.push(img)
    }
    content.push({ type: 'text', text: fullPrompt })

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'extractor', {
        prompt: fullPrompt,
        pdfContentLength: fullText.length,
        imageCount: imageContents.length,
        temperature: 0.1,
        model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions?GroupId=${this.groupId}`,
        {
          model: this.model,
          messages: [{ role: 'user', content }],
          temperature: 0.1,
          max_tokens: 8192
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      const parsedResult = this.parseResponse(text)

      if (aiLogService && logId) {
        aiLogService.logResponse(logId, {
          rawText: text,
          parsedData: parsedResult,
          tokens: response.data?.usage || null,
          finishReason: response.data?.choices?.[0]?.finish_reason || null
        })
      }

      parsedResult.tokens = response.data?.usage || null
      return parsedResult
    } catch (error) {
      console.error('[MiniMaxAdapter] Extract error:', error.message)
      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }
      throw new Error(`MiniMax模型提取失败: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async validate(resultA, resultB, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    const prompt = this.buildValidatePrompt(resultA, resultB)

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'validator', {
        prompt: prompt,
        temperature: 0.1,
        model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions?GroupId=${this.groupId}`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 4096
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      const parsedResult = this.parseResponse(text)
      const mergedResult = this.mergeValidationResults(resultA, resultB, parsedResult)

      if (aiLogService && logId) {
        aiLogService.logResponse(logId, {
          rawText: text,
          parsedData: parsedResult,
          tokens: response.data?.usage || null,
          finishReason: response.data?.choices?.[0]?.finish_reason || null
        })
      }

      return mergedResult
    } catch (error) {
      console.error('[MiniMaxAdapter] Validate error:', error.message)
      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }
      throw new Error(`MiniMax模型验证失败: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * V2.7: 合并验证结果
   */
  mergeValidationResults(resultA, resultB, validation) {
    if (validation.error) {
      return {
        finalResult: resultA,
        confidence: 1,
        comparisons: [],
        notes: validation.error
      }
    }

    const decisions = validation.decisions || []
    const companyDecision = validation.companyInfoDecision || { choose: 'A' }
    const confidence = validation.confidence || 3
    const notes = validation.notes || ''

    let finalCompanyInfo = resultA.companyInfo || {}
    if (companyDecision.choose === 'B' && resultB.companyInfo) {
      finalCompanyInfo = resultB.companyInfo
    }

    const metricsA = resultA.financialMetrics || []
    const metricsB = resultB.financialMetrics || []
    const finalMetrics = []
    const comparisons = []

    const decisionMap = {}
    for (const d of decisions) {
      decisionMap[d.metric] = d
    }

    const allMetricNames = new Set([
      ...metricsA.map(m => m.name),
      ...metricsB.map(m => m.name)
    ])

    for (const name of allMetricNames) {
      const metricA = metricsA.find(m => m.name === name)
      const metricB = metricsB.find(m => m.name === name)
      const decision = decisionMap[name]

      let chosenMetric = metricA
      let reason = decision?.reason || ''

      if (decision) {
        if (decision.choose === 'B' && metricB) {
          chosenMetric = metricB
        } else if (decision.choose === 'same') {
          chosenMetric = metricA || metricB
          reason = reason || '两模型一致'
        }
      } else {
        if (!metricA && metricB) {
          chosenMetric = metricB
        } else if (metricA && metricB) {
          if (metricA.value === metricB.value) {
            reason = '两模型一致'
          } else {
            reason = '默认采用模型A'
          }
        }
      }

      if (chosenMetric) {
        finalMetrics.push(chosenMetric)
      }

      comparisons.push({
        metric: name,
        valueA: metricA?.value ?? null,
        valueB: metricB?.value ?? null,
        final: chosenMetric?.value ?? null,
        reason: reason
      })
    }

    const finalNonFinancialInfo = companyDecision.choose === 'B'
      ? (resultB.nonFinancialInfo || resultA.nonFinancialInfo)
      : (resultA.nonFinancialInfo || resultB.nonFinancialInfo)

    return {
      finalResult: {
        companyInfo: finalCompanyInfo,
        financialMetrics: finalMetrics,
        nonFinancialInfo: finalNonFinancialInfo
      },
      confidence: confidence,
      comparisons: comparisons,
      notes: notes
    }
  }

  /**
   * V2.9: 非财务信息总结合并
   */
  async summarizeNonFinancial(prompt, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'non-fin-summarizer', {
        prompt: prompt, temperature: 0.1, model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions?GroupId=${this.groupId}`,
        { model: this.model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 8192 },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 180000 }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      const parsedResult = this.parseResponse(text)

      if (aiLogService && logId) {
        aiLogService.logResponse(logId, {
          rawText: text, parsedData: parsedResult,
          tokens: response.data?.usage || null,
          finishReason: response.data?.choices?.[0]?.finish_reason || null
        })
      }

      return parsedResult
    } catch (error) {
      console.error('[MiniMaxAdapter] Non-financial summarization error:', error.message)
      if (aiLogService && logId) aiLogService.logError(logId, error)
      return null
    }
  }

  getFeatures() {
    return ['vision', 'long-context']
  }
}

export default MiniMaxAdapter
