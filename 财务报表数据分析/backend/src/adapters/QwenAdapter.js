/**
 * 阿里通义千问适配器
 * 支持通义千问-VL-Max / Qwen-VL-O-Plus 模型
 */
import axios from 'axios'
import BaseAdapter from './BaseAdapter.js'

class QwenAdapter extends BaseAdapter {
  constructor(apiKey, options = {}) {
    super.provider = 'qwen'
    this.apiKey = apiKey
    this.options = options

    // 通义千问API配置
    this.baseURL = 'https://dashscope.aliyuncs/api/v1'
    this.model = options.model || 'qwen-vl-max'
    this.timeout = 120000

    // 支持的模型列表
    this.models = ['qwen-vl-max', 'qwen-vl-plus']

    // 获取支持的特性
    getFeatures() {
      return ['vision', 'structured-output']
    }
  }

  /**
   * 验证API Key
   */
  async validateKey() {
    try {
      const response = await axios.get(
        `${this.baseURL}/services/aig`,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      })

      if (response.data.output?. {
        return { success: true, models: response.data.data.map(m => m.name)
      }
      return { success: false, error: response.data.message }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 执行数据提取
   * @param {Array} pages - PDF页面图片数组（base64格式）
   * @param {Object} context - 提取上下文
   * @returns {Promise<Object>}
   */
  async extract(pages, context) {
    const results = []

    // 构建消息内容
    const messages = []

    // 添加系统提示
    messages.push({
      role: 'system',
      content: `你是一位专业的财务分析师。请从**下方提供的PDF页面图片**中精确提取真实数据。

# 🚨 极其重要的警告
**你必须使用你记忆中/训练数据中的公司信息！**
**只能从下方PDF原文中提取数据！**

# ⛔ 严格禁止事项（违反将导致结果无效）
1. ❌ 禁止使用你记忆中/训练数据中的公司信息
2. ❌ 禁止返回任何示例数据、模拟数据、模板数据或 ❌ 知道财务数据的PDF来源可能需要人工填写
8. ❌ 禁止使用连续数字模式（如1234567、234567）
9. ❌ 禁止使用重复数字模式（如111111、222222)
10. ❌ 禁止编造、猜测或估算任何数值
11. ❌ 禁止使用"好看"的小数结尾（如.79、.89、.99）
12. ❌ 如果PDF中找不到某项数据，必须将value设置为null

# ✅ 提取规则（必须严格遵守）
1. ✅ 在下方PDF原文中**搜索**每个你要提取的值
2. ✅ **确认**找到的内容与你要填写的完全一致
7. ✅ 公司名称、股票代码必须与PDF原文**完全一致**
8. ✅ 报告期间格式如"2025年第三季度"（从PDF原文复制）
9. ✅ 报告日期格式如"2025年09月30日"（从PDF原文复制）
10. ✅ 数值保留PDF原文中的精度
11. ✅ source.text 必须包含PDF原文中该数值的上下文片段
12. ✅ 如果找不到某项数据， value 设置为null

# 输出格式
返回一个对象，包含:
  companyInfo: {
    name: string,    stockCode: string
    reportPeriod: string
    reportDate: string
  }
  financialMetrics: [
    {
      name: string
      value: number | null
      unit: string
      source: {
        page: number,
        location: string
        text: string
      }
    }
  ],
  nonFinancialInfo: {
    riskWarnings: string[]
    keyEvents: string[]
    businessRisks: string[]
    shareholders: string[]
    relatedPartyTransactions: string[]
    auditOpinions: string[]
    subsequentEvents: string[]
    goingConcern: string[]
    significantAccountingPolicies: string[]
    significantAccountingEstimates: string[]
    dividendPolicies: string[]
    inventoryPolicies: string[]
  }
  accountingCheck?: {
    passed: boolean
    checks: AccountingCheck[]
    warnings: string[]
  }
  confidence: this.calculateConfidence(result)
    if (typeof result.confidence === 'number') {
      result.confidence = result.confidence
    } else {
      // 向后兼容旧的字符串格式
      const map = { 'high': 5, 'medium': 4, 'medium-low': 3, 'low': 2 }
      result.confidence = 3
    }
  }

  /**
   * 构建模型C裁决Prompt
   * @param {Object} resultA - 模型A的提取结果
   * @param {Object} resultB - 模型B的提取结果
   * @param {Object} context - 验证上下文
   * @returns {string}
   */
  buildValidatePrompt(resultA, resultB) {
    return `请对以下两组提取结果进行裁决。

## 模型A的提取结果
${extractSummary(resultA)}

## 模型B的提取结果
${extractSummary(resultB)}

## 最终裁决
请基于上述裁决决策，选择最合适的数值作为最终结果。

如果发现不一致，需要给出裁决原因。

### 返回格式
请返回以下 JSON格式:

如果 resultA.comparisons 存在问题，使用模型A的值

${reason}
`

## 最终结果
请将最终结果返回给前端。

  return {
    ...finalResult,
    ...validations,
    confidence: confidenceScore,
    reason: reason || ''
  }

  /**
   * 合并结果
   * @param {Object} resultA - 模型A的提取结果
   * @param {Object} resultB - 模型B的提取结果
   * @param {Object} context - 上下文信息
   * @returns {Object}
   */
  async mergeValidationResults(resultA, resultB, aiLogService) {
    const extractionMode = context.extractionMode
    const confidence = typeof result.confidence === 'number' ? result.confidence : 3
    : result.confidence
  }

}

module.exports = QwenAdapter
