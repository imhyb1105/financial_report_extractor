import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

/**
 * 豆包(火山引擎)模型适配器
 * API文档: https://www.volcengine.com/docs/82379
 * 使用 OpenAI 兼容的 /chat/completions 端点
 * V1.6: 增强Vision支持，改进数据提取准确性
 * V1.7: 添加AI调试日志记录
 */
class DoubaoAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super('doubao', apiKey, options)
    this.baseURL = 'https://ark.cn-beijing.volces.com/api/v3'
    this.model = options.model || 'doubao-seed-2.0'
  }

  /**
   * 验证API Key
   */
  async validateKey() {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: '你好'
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
   * V1.7: 添加AI调试日志记录
   */
  async extract(pages, context) {
    // V1.7: 获取日志服务（如果提供）
    const aiLogService = context?.aiLogService
    let logId = null

    // 使用增强版Prompt
    const prompt = this.buildEnhancedExtractPrompt(context)

    // 合并所有文本内容
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

    // 从PDF首行提取公司名称，强制注入prompt以防止AI编造
    const firstLine = fullText.trim().split('\n')[0]?.trim() || ''
    const companyHint = firstLine.match(/(.{2,40}(?:股份有限公司|有限责任公司|集团有限公司))/)?.[1]
    const companyNameInjection = companyHint
      ? `\n\n# 🚨 强制确认：此PDF中的公司是"${companyHint}"，你必须使用这个公司名称，禁止使用其他公司的数据！\n`
      : ''

    // 构建完整的提示
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

    // 根据是否有图片决定 content 格式
    let messageContent

    if (images.length > 0) {
      // 多模态：使用数组格式
      messageContent = []

      // 添加图片（最多10张）
      for (const img of images.slice(0, 10)) {
        messageContent.push(img)
      }

      // 添加文本
      messageContent.push({
        type: 'text',
        text: fullPrompt
      })
    } else {
      // 纯文本：使用字符串格式
      messageContent = fullPrompt
    }

    console.log(`[DoubaoAdapter] Sending request with ${pages.length} pages, ${fullText.length} characters, ${images.length} images`)
    console.log(`[DoubaoAdapter] Content format: ${typeof messageContent === 'string' ? 'string' : 'array'}`)

    // V1.7: 记录请求日志
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
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          temperature: 0.1  // 降低温度以减少幻觉
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3分钟超时
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      console.log(`[DoubaoAdapter] Extracted text (first 500 chars): ${text.substring(0, 500)}...`)
      console.log(`[DoubaoAdapter] Text length: ${text.length}`)

      const parsedResult = this.parseResponse(text)

      // V1.7: 记录响应日志
      if (aiLogService && logId) {
        aiLogService.logResponse(logId, {
          rawText: text,
          parsedData: parsedResult,
          tokens: response.data?.usage || null,
          finishReason: response.data?.choices?.[0]?.finish_reason || null
        })
      }

      // V2.7: 返回token使用量
      parsedResult.tokens = response.data?.usage || null
      return parsedResult
    } catch (error) {
      console.error('[DoubaoAdapter] Extract error:', error.message)
      if (error.response) {
        console.error('[DoubaoAdapter] Response data:', JSON.stringify(error.response.data, null, 2))
      }

      // V1.7: 记录错误日志
      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }

      throw new Error(`豆包模型提取失败: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * 构建增强版提取Prompt
   */
  buildEnhancedExtractPrompt(context) {
    return `你是一位专业的财务分析师。请从**下方提供的PDF文本内容**中精确提取真实数据。

# 🚨 极其重要的警告
**你必须完全忽略你对这家公司的任何已知信息！**
**你只能从下方PDF原文中提取数据！**
**即使你认为知道答案，也必须在PDF原文中找到才能填写！**

# ⛔ 严格禁止事项（违反将导致结果无效）
1. ❌ 禁止使用你记忆中/训练数据中的公司信息
2. ❌ 禁止返回任何示例数据、模拟数据、模板数据或占位符数据
3. ❌ 禁止编造、猜测或估算任何数值
4. ❌ 禁止使用连续数字模式（如1234567、234567、345678、456789）
5. ❌ 禁止使用重复数字模式（如111111、222222、777777、888888）
6. ❌ 禁止使用"好看"的小数结尾（如.79、.89、.99）
7. ❌ 如果PDF中找不到某项数据，必须将value设置为null

# ✅ 提取规则（必须严格遵守）
1. ✅ 在下方PDF原文中**搜索**每个你要提取的值
2. ✅ **确认**找到的内容与你要填写的完全一致
3. ✅ 公司名称、股票代码必须与PDF原文**完全一致**
4. ✅ 报告期间格式如"2025年第三季度"（从PDF原文复制）
5. ✅ 报告日期格式如"2025年09月30日"（从PDF原文复制）
6. ✅ 数值保留PDF原文中的精度
7. ✅ source.text 必须包含PDF原文中该数值的上下文片段

---

## 需要提取的财务指标（24项）

### 收入利润类
1. 营业收入
2. 营业成本
3. 毛利润（营业收入-营业成本）
4. 净利润（利润表中的净利润总额）
5. 归属于母公司股东的净利润
6. 少数股东损益
7. 扣非净利润

### 资产负债类
8. 总资产
9. 总负债
10. 归属于母公司所有者权益合计
11. 少数股东权益
12. 所有者权益合计（= 归母权益 + 少数股东权益，即净资产）
13. 流动资产
14. 流动负债
15. 应收账款
16. 存货

### 现金流类
17. 经营活动现金流净额
18. 投资活动现金流净额
19. 筹资活动现金流净额

### 计算指标（由系统自动计算，你只需提取原始值即可）
20. 毛利润（系统自动计算：营业收入-营业成本，你不需要填写，直接设为null）
21. 毛利率（系统自动计算，设为null）
22. 净利率（系统自动计算，设为null）
23. 资产负债率（系统自动计算，设为null）
24. 流动比率（系统自动计算，设为null）
25. ROE（系统自动计算，设为null）

⚠️ 重要：毛利润、毛利率、净利率、资产负债率、流动比率、ROE这6项由系统服务端自动计算，你必须将value设为null，不要自行计算！
⚠️ 毛利润也不要填写！系统会根据你提取的营业收入和营业成本自动计算。

---

## 输出格式要求

请严格按照以下JSON格式输出，不要添加任何其他文字：

{
  "companyInfo": {
    "name": "<从PDF原文第一行复制的公司名称>",
    "stockCode": "<从PDF原文中'证券代码'后复制的6位数字>",
    "reportPeriod": "<从PDF原文中复制的报告期间>",
    "reportDate": "<从PDF原文中复制的报告日期>"
  },
  "financialMetrics": [
    {
      "name": "<指标名称>",
      "value": <PDF原文中的实际数值，纯数字，找不到则填null>,
      "unit": "<单位代码:yuan/wan/yi>",
      "originalUnit": "<PDF中的原始单位，如'元'>",
      "confidence": "<high/medium/low>",
      "source": {
        "page": <页码数字>,
        "location": "<在PDF中的位置描述>",
        "text": "<PDF中包含该数据的原文片段>"
      }
    }
  ],
  "nonFinancialInfo": {
    "riskFactors": [
      {"content": "<风险因素内容>", "source": {"page": <页码>, "location": "<位置描述>"}},
      {"content": "<风险因素内容2>", "source": {"page": <页码>, "location": "<位置描述>"}}
    ],
    "majorEvents": [
      {"content": "<重大事项内容>", "source": {"page": <页码>, "location": "<位置描述>"}}
    ],
    "futurePlans": [
      {"content": "<未来规划内容>", "source": {"page": <页码>, "location": "<位置描述>"}}
    ],
    "dividendPlan": {"content": "<分红方案内容>", "source": {"page": <页码>, "location": "<位置描述>"}}
  }
}

## 单位说明
- yuan: 元（PDF中显示"单位：元"时使用）
- wan: 万元
- yi: 亿元

## ⚠️ 重要：权益指标说明
- 归属于母公司所有者权益合计：从资产负债表"归属于母公司所有者权益合计"行提取
- 少数股东权益：从资产负债表"少数股东权益"行提取
- 所有者权益合计：从资产负债表"所有者权益合计"行提取（如果PDF中只有归母权益，则所有者权益合计 = 归母权益 + 少数股东权益）
- 注意：所有者权益合计就是净资产，不需要重复提取

## ⚠️ 重要：非财务信息提取（必须尝试提取）
你必须主动在PDF中搜索以下章节并提取内容：

1. riskFactors（风险因素）：
   - 搜索关键词："可能面对的风险"、"风险提示"、"风险因素"、"风险警示"
   - 提取至少3条主要风险因素（如果存在）

2. majorEvents（重大事项）：
   - 搜索关键词："重要事项"、"重大事项"、"重大事件"
   - 提取报告期内的重要事件

3. futurePlans（未来规划）：
   - 搜索关键词："未来发展展望"、"未来发展规划"、"经营计划"
   - 提取公司未来计划

4. dividendPlan（分红方案）：
   - 搜索关键词："利润分配"、"股利分配"、"分红派息"
   - 提取分红方案详情

⚠️ 即使PDF中章节名称略有不同，也请尝试匹配并提取。
⚠️ 只有在PDF中确实完全没有相关章节时，才填写空数组[]

---

# 🔴 最终检查清单
在返回结果前，请确认：
1. ✅ 公司信息是否从PDF原文复制？
2. ✅ 股票代码是否在PDF原文中能找到？
3. ✅ 报告期间是否与PDF标题一致？
4. ✅ 每个数值是否都能在PDF原文中找到对应？
5. ✅ 非财务信息（riskFactors, majorEvents, futurePlans, dividendPlan）是否已尝试提取？
6. ✅ 如果非财务信息为空，是否确认PDF中确实没有相关章节？

只输出JSON，不要有任何其他文字说明。`
  }

  /**
   * 验证/裁决提取结果
   * V1.13: 添加AI调试日志记录
   * V1.14: 支持五档置信度，优化响应格式避免截断
   */
  async validate(resultA, resultB, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    const prompt = this.buildValidatePrompt(resultA, resultB)

    // V1.13: 记录请求日志
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
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2分钟超时
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ''
      const parsedResult = this.parseResponse(text)

      // V1.14: 处理新的响应格式，合并结果
      const mergedResult = this.mergeValidationResults(resultA, resultB, parsedResult)

      // V1.13: 记录响应日志
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
      console.error('[DoubaoAdapter] Validate error:', error.message)

      // V1.13: 记录错误日志
      if (aiLogService && logId) {
        aiLogService.logError(logId, error)
      }

      throw new Error(`豆包模型验证失败: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * V1.14: 根据裁决结果合并两个模型的提取结果
   * @param {Object} resultA - 模型A结果
   * @param {Object} resultB - 模型B结果
   * @param {Object} validation - 模型C的裁决结果 {confidence, decisions, companyInfoDecision, notes}
   * @returns {Object} 合并后的最终结果
   */
  mergeValidationResults(resultA, resultB, validation) {
    // 如果解析失败，返回默认结果
    if (validation.error) {
      return {
        finalResult: resultA,
        confidence: 1, // 低置信度
        comparisons: [],
        notes: validation.error
      }
    }

    const decisions = validation.decisions || []
    const companyDecision = validation.companyInfoDecision || { choose: 'A' }
    const confidence = validation.confidence || 3
    const notes = validation.notes || ''

    // 1. 合并公司信息
    let finalCompanyInfo = resultA.companyInfo || {}
    if (companyDecision.choose === 'B' && resultB.companyInfo) {
      finalCompanyInfo = resultB.companyInfo
    }

    // 2. 合并财务指标
    const metricsA = resultA.financialMetrics || []
    const metricsB = resultB.financialMetrics || []
    const finalMetrics = []
    const comparisons = []

    // 创建指标名称到决策的映射
    const decisionMap = {}
    for (const d of decisions) {
      decisionMap[d.metric] = d
    }

    // 获取所有指标名称（合并A和B）
    const allMetricNames = new Set([
      ...metricsA.map(m => m.name),
      ...metricsB.map(m => m.name)
    ])

    for (const name of allMetricNames) {
      const metricA = metricsA.find(m => m.name === name)
      const metricB = metricsB.find(m => m.name === name)
      const decision = decisionMap[name]

      let chosenMetric = metricA // 默认选A
      let reason = decision?.reason || ''

      if (decision) {
        if (decision.choose === 'B' && metricB) {
          chosenMetric = metricB
        } else if (decision.choose === 'same') {
          chosenMetric = metricA || metricB
          reason = reason || '两模型一致'
        }
      } else {
        // 没有决策，优先使用有值的
        if (!metricA && metricB) {
          chosenMetric = metricB
        } else if (metricA && metricB) {
          // 都有值但没决策，比较值
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

      // 记录对比信息
      comparisons.push({
        metric: name,
        valueA: metricA?.value ?? null,
        valueB: metricB?.value ?? null,
        final: chosenMetric?.value ?? null,
        reason: reason
      })
    }

    // 3. 合并非财务信息（优先使用被选择的模型）
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
    return ['vision', 'multimodal', 'long-context']
  }

  /**
   * V2.7: 提取非财务信息（使用专用prompt）
   */
  async extractNonFinancial(pages, context) {
    const aiLogService = context?.aiLogService
    let logId = null

    const prompt = context.prompt || this.buildNonFinancialOnlyPrompt()

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
    for (const img of images.slice(0, 10)) content.push(img)
    content.push({ type: 'text', text: fullPrompt })

    if (aiLogService) {
      logId = aiLogService.logRequest(this.model, context?.role || 'non-fin-extractor', {
        prompt: fullPrompt, temperature: 0.1, model: this.model
      })
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        { model: this.model, messages: [{ role: 'user', content: fullPrompt }], temperature: 0.1 },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }
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

      return parsedResult.nonFinancialInfo || parsedResult
    } catch (error) {
      console.error('[DoubaoAdapter] Non-financial extraction error:', error.message)
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
        { model: this.model, messages: [{ role: 'user', content: prompt }], temperature: 0.1 },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }
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
      console.error('[DoubaoAdapter] Non-financial summarization error:', error.message)
      if (aiLogService && logId) aiLogService.logError(logId, error)
      return null
    }
  }
}

export default DoubaoAdapter
