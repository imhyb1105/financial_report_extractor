import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

/**
 * 智谱AI GLM模型适配器
 * V2.7: 修复GLM-5图片格式错误（GLM-5是纯文本模型，不支持图片输入）
 */
class GLMAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('glm', apiKey, options)
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4'
    this.model = options.model || 'glm-5'
  }

  /**
   * 判断当前模型是否支持视觉（图片）输入
   * GLM-4V / GLM-4.5V / GLM-4.6V 系列支持，GLM-4 / GLM-5 系列不支持
   */
  supportsVision() {
    return /V$/i.test(this.model)
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

  /**
   * 提取财务数据
   * @param {Array} pages - 页面数组（text/base64/url格式）
   * @param {Object} context - 提取上下文
   */
  async extract(pages, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    // 使用BaseAdapter的Prompt
    const prompt = this.buildExtractPrompt(context)

    // 收集文本内容和图片
    let fullText = ''
    const images = []

    for (const page of pages) {
      if (page.type === 'text' && page.content) {
        fullText += `\n\n--- 第 ${page.pageNumber} 页 ---\n${page.content}`
      } else if (page.type === 'url') {
        images.push({
          type: 'image_url',
          image_url: { url: page.url }
        })
      } else if (page.type === 'base64') {
        images.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${page.data}` }
        })
      }
    }

    // 从PDF首行提取公司名称，强制注入prompt
    const firstLine = fullText.trim().split('\n')[0]?.trim() || ''
    const companyHint = firstLine.match(/(.{2,40}(?:股份有限公司|有限责任公司|集团有限公司))/)?.[1]
    const companyNameInjection = companyHint
      ? `\n\n# 🚨 强制确认：此PDF中的公司是"${companyHint}"，你必须使用这个公司名称，禁止使用其他公司的数据！\n`
      : ''

    // 构建完整提示
    const fullPrompt = `${prompt}

---

${companyNameInjection}
# 📄 PDF原文内容（共${pages.length}页）

${fullText}

---

# 🔍 提取验证要求

## 步骤1：定位公司信息
1. 在上方PDF原文中搜索公司名称（通常在第一页第一行）
2. 搜索"证券代码"或"股票代码"获取实际代码
3. 搜索"季度报告"或"年度报告"获取报告期间

## 步骤2：提取财务数据
对于每个指标，你必须：
1. 在PDF原文中**搜索**该指标名称
2. 找到该指标对应的数值（同一行或相邻位置）
3. **复制**该数值，不要修改或推断

## 步骤3：验证
- 每个数值必须能在PDF原文中找到对应的数字
- 如果找不到，value设置为null
- 不要使用任何你记忆中的数据

# ⚠️ 最终检查
请再次确认：你填写的每个值都能在上方PDF原文中找到对应吗？
如果不能，请将 value 设置为 null`

    // 构建消息内容
    const content = []

    // 仅在模型支持视觉时添加图片（GLM-5是纯文本模型，不支持图片输入）
    if (this.supportsVision()) {
      for (const img of images.slice(0, 10)) {
        content.push(img)
      }
    } else if (images.length > 0) {
      console.log(`[GLMAdapter] ${this.model} 不支持图片输入，跳过 ${images.length} 张图片`)
    }

    // 添加文本
    content.push({ type: 'text', text: fullPrompt })

    console.log(`[GLMAdapter] Sending request with ${pages.length} pages, ${fullText.length} characters, ${images.length} images (vision: ${this.supportsVision()})`)

    // 记录请求日志
    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'extractor', {
        prompt: fullPrompt,
        pdfContent: fullText,
        temperature: 0.1,
        images: images,
        model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
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
      console.log(`[GLMAdapter] Extracted text length: ${text.length}`)

      let parsedResult = this.parseResponse(text)

      // V2.6: 如果解析失败且模型返回了足够长的内容，重试一次
      if (parsedResult.error && text.length > 1000) {
        console.warn(`[GLMAdapter] Parse failed (text length ${text.length}), retrying with lower temperature...`)
        const retryResponse = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.model,
            messages: [{ role: 'user', content }],
            temperature: 0.01,
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
        const retryText = retryResponse.data?.choices?.[0]?.message?.content || ''
        console.log(`[GLMAdapter] Retry text length: ${retryText.length}`)
        const retryParsed = this.parseResponse(retryText)
        if (!retryParsed.error && retryParsed.financialMetrics?.length > 0) {
          console.log(`[GLMAdapter] Retry succeeded with ${retryParsed.financialMetrics.length} metrics`)
          parsedResult = retryParsed
          if (aiLogService && logId) {
            aiLogService.logResponse(logId, {
              rawText: retryText,
              parsedData: parsedResult,
              tokens: retryResponse.data?.usage || null,
              finishReason: retryResponse.data?.choices?.[0]?.finish_reason || null,
              isRetry: true
            })
          }
        } else {
          console.warn(`[GLMAdapter] Retry also failed`)
        }
      }

      // 记录响应日志（仅在非重试成功时记录原始响应）
      if (aiLogService && logId) {
        const alreadyLogged = parsedResult._retryLogged
        if (!alreadyLogged) {
          aiLogService.logResponse(logId, {
            rawText: text,
            parsedData: parsedResult,
            tokens: response.data?.usage || null,
            finishReason: response.data?.choices?.[0]?.finish_reason || null
          })
        }
      }

      // V2.7: 返回token使用量
      parsedResult.tokens = response.data?.usage || null
      return parsedResult
    } catch (error) {
      console.error('[GLMAdapter] Extract error:', error.message)

      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }

      throw new Error(`GLM模型提取失败: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 验证/裁决提取结果
   */
  async validate(resultA, resultB, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    const prompt = this.buildValidatePrompt(resultA, resultB)

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'validator', {
        prompt: prompt,
        resultASummary: {
          companyInfo: resultA.companyInfo,
          metricsCount: resultA.financialMetrics?.length || 0
        },
        resultBSummary: {
          companyInfo: resultB.companyInfo,
          metricsCount: resultB.financialMetrics?.length || 0
        },
        temperature: 0.1,
        model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 32768 // V2.8: GLM-5 deep thinking可能消耗大量reasoning_tokens，需要更大输出空间
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // V2.8: 增加到3分钟，deep thinking可能需要更长时间
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      const parsedResult = this.parseResponse(text)

      // 合并验证结果（与DoubaoAdapter逻辑一致）
      const mergedResult = this.mergeValidationResults(resultA, resultB, parsedResult)

      if (aiLogService && logId) {
        aiLogService.logResponse(logId, {
          rawText: text,
          parsedData: parsedResult,
          mergedResult: mergedResult,
          tokens: response.data?.usage || null,
          finishReason: response.data?.choices?.[0]?.finish_reason || null
        })
      }

      return mergedResult
    } catch (error) {
      console.error('[GLMAdapter] Validate error:', error.message)

      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }

      throw new Error(`GLM模型验证失败: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 合并验证结果（与DoubaoAdapter一致）
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

  getFeatures() {
    const features = ['long-context']
    if (this.supportsVision()) features.push('vision')
    return features
  }

  /**
   * V2.7: 提取非财务信息（使用专用prompt，只关注非财务内容）
   */
  async extractNonFinancial(pages, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    // 使用专用prompt
    const prompt = context.prompt || this.buildNonFinancialOnlyPrompt()

    // 收集文本和图片
    let fullText = ''
    const images = []
    for (const page of pages) {
      if (page.type === 'text' && page.content) {
        fullText += `\n\n--- 第 ${page.pageNumber} 页 ---\n${page.content}`
      } else if (page.type === 'url') {
        images.push({ type: 'image_url', image_url: { url: page.url } })
      } else if (page.type === 'base64') {
        images.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${page.data}` } })
      }
    }

    const fullPrompt = `${prompt}\n\n---\n# 📄 PDF原文内容（共${pages.length}页）\n\n${fullText}`

    const content = []
    // 仅在模型支持视觉时添加图片
    if (this.supportsVision()) {
      for (const img of images.slice(0, 10)) content.push(img)
    }
    content.push({ type: 'text', text: fullPrompt })

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'non-fin-extractor', {
        prompt: fullPrompt,
        temperature: 0.1,
        model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        { model: this.model, messages: [{ role: 'user', content }], temperature: 0.1, max_tokens: 16384 }, // V2.8: GLM-5 deep thinking需要更大输出空间
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 180000 } // V2.8: 增加超时
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

      // 提取非财务信息部分
      return parsedResult.nonFinancialInfo || parsedResult
    } catch (error) {
      console.error('[GLMAdapter] Non-financial extraction error:', error.message)
      if (aiLogService && logId) aiLogService.logError(logId, error)
      return null
    }
  }

  /**
   * V2.7: 总结合并非财务信息
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
        `${this.baseURL}/chat/completions`,
        { model: this.model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 16384 }, // V2.8: GLM-5 deep thinking需要更大输出空间
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 180000 } // V2.8: 增加超时
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
      console.error('[GLMAdapter] Non-financial summarization error:', error.message)
      if (aiLogService && logId) aiLogService.logError(logId, error)
      return null
    }
  }
}

export default GLMAdapter
