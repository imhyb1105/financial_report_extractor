/**
 * AI模型适配器基类
 * 所有模型适配器必须继承此类
 */
class BaseAdapter {
  constructor(provider, apiKey, options = {}) {
    this.provider = provider
    this.apiKey = apiKey
    this.options = options
  }

  /**
   * 验证API Key是否有效
   * @returns {Promise<{success: boolean, models?: string[], error?: string}>}
   */
  async validateKey() {
    throw new Error('validateKey() must be implemented by subclass')
  }

  /**
   * 提取财务数据
   * @param {Array} pages - PDF页面数组（文本或图片）
   * @param {Object} context - 提取上下文
   * @returns {Promise<Object>} 提取结果
   */
  async extract(pages, context) {
    throw new Error('extract() must be implemented by subclass')
  }

  /**
   * 验证/裁决提取结果
   * @param {Object} resultA - 模型A的提取结果
   * @param {Object} resultB - 模型B的提取结果
   * @param {Object} context - 验证上下文
   * @returns {Promise<Object>} 裁决结果
   */
  async validate(resultA, resultB, context) {
    throw new Error('validate() must be implemented by subclass')
  }

  /**
   * 获取模型支持的特性
   * @returns {string[]}
   */
  getFeatures() {
    return []
  }

  /**
   * 构建提取Prompt
   * @param {Object} context - 提取上下文
   * @returns {string}
   */
  buildExtractPrompt(context) {
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

## 需要提取的财务指标（21项）

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

### 计算指标（需要计算）
20. 毛利率
21. 净利率
22. 资产负债率
23. 流动比率
24. ROE

⚠️ 计算指标名称说明（name字段只填指标名称，不要包含公式）：
- 毛利率 = 毛利润 / 营业收入
- 净利率 = 净利润 / 营业收入
- 资产负债率 = 总负债 / 总资产
- 流动比率 = 流动资产 / 流动负债
- ROE = 归属于母公司股东的净利润 / 归属于母公司所有者权益合计

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

## 单位说明
- yuan: 元（PDF中显示"单位：元"时使用）
- wan: 万元
- yi: 亿元

---

# 🔴 最终检查清单
在返回结果前，请确认：
1. ✅ 公司信息是否从PDF原文第一页复制？
2. ✅ 股票代码是否在PDF原文中能找到？
3. ✅ 报告期间是否与PDF标题一致？
4. ✅ 每个数值是否都能在PDF原文中找到对应？
5. ✅ 非财务信息（riskFactors, majorEvents, futurePlans, dividendPlan）是否已尝试提取？
6. ✅ 如果非财务信息为空，是否确认PDF中确实没有相关章节？

只输出JSON，不要有任何其他文字说明。`
  }

  /**
   * 构建验证Prompt
   * V1.14: 优化输出格式，避免响应截断，支持五档置信度
   * @param {Object} resultA - 模型A结果
   * @param {Object} resultB - 模型B结果
   * @returns {string}
   */
  buildValidatePrompt(resultA, resultB) {
    // 提取关键信息，减少Prompt长度
    const extractSummary = (result, label) => {
      const companyInfo = result.companyInfo || {}
      const metrics = result.financialMetrics || []

      return `【${label}】
公司: ${companyInfo.name || '未知'}
股票代码: ${companyInfo.stockCode || '未知'}
报告期间: ${companyInfo.reportPeriod || '未知'}

财务指标 (${metrics.length}项):
${metrics.map(m => `  - ${m.name}: ${m.value} (${m.confidence || 'unknown'})`).join('\n')}`
    }

    return `你是财务审计专家。请对比两个模型的提取结果，进行裁决和评分。

${extractSummary(resultA, '模型A')}

${extractSummary(resultB, '模型B')}

## 任务

1. 对比两个模型的提取结果
2. 对于有差异的指标，裁决哪个更准确（A/B/相同）
3. 给出整体置信度评分（1-5分）

## 评分标准

5分-高置信度: 两模型完全一致，数据来源清晰
4分-中高置信度: 两模型基本一致，仅有细微差异
3分-中置信度: 存在差异但可裁决，或部分指标来源不明确
2分-中低置信度: 差异较大，需要人工核对
1分-低置信度: 数据可能有问题，强烈建议人工核对

## 输出格式（严格遵守，不要输出其他内容）

{
  "confidence": <1-5的数字>,
  "decisions": [
    {"metric": "指标名称", "choose": "A或B或same", "reason": "简短理由"}
  ],
  "companyInfoDecision": {"choose": "A或B", "reason": "理由"},
  "notes": "需要注意的事项"
}

只输出JSON，不要有任何其他文字。`
  }

  /**
   * 解析AI响应
   * V1.8: 增强容错机制，支持清理JSON中的控制字符
   * @param {string} response - AI返回的文本
   * @returns {Object} 解析后的JSON
   */
  parseResponse(response) {
    if (!response || typeof response !== 'string') {
      console.error('[BaseAdapter] Empty or invalid response')
      return this.getDefaultResult()
    }

    console.log('[BaseAdapter] Parsing response, length:', response.length)
    console.log('[BaseAdapter] Response preview (first 1000 chars):', response.substring(0, 1000))

    // 提取JSON字符串的辅助函数
    const extractJsonString = (text) => {
      // 方法1: 查找 ```json ... ``` 块
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        console.log('[BaseAdapter] Found JSON in ```json block')
        return jsonMatch[1]
      }

      // 方法2: 查找 ``` ... ``` 块
      jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        console.log('[BaseAdapter] Found JSON in ``` block')
        return jsonMatch[1]
      }

      // 方法3: 查找 { ... } 最外层对象
      const startIndex = text.indexOf('{')
      const lastIndex = text.lastIndexOf('}')
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        console.log('[BaseAdapter] Extracting JSON from index', startIndex, 'to', lastIndex)
        return text.substring(startIndex, lastIndex + 1)
      }

      // 方法4: 直接返回原文
      return text
    }

    const jsonStr = extractJsonString(response)

    // 尝试直接解析
    try {
      const parsed = JSON.parse(jsonStr)
      console.log('[BaseAdapter] Parsed successfully, companyInfo:', parsed.companyInfo)
      return parsed
    } catch (initialError) {
      console.log('[BaseAdapter] Initial parse failed:', initialError.message)
      console.log('[BaseAdapter] Attempting to sanitize JSON...')

      // V1.8: 尝试清理JSON后重新解析
      try {
        const sanitizedJson = this.sanitizeJsonString(jsonStr)
        const parsed = JSON.parse(sanitizedJson)
        console.log('[BaseAdapter] Parse succeeded after sanitization ✓')
        console.log('[BaseAdapter] Parsed successfully, companyInfo:', parsed.companyInfo)
        return parsed
      } catch (sanitizeError) {
        console.error('[BaseAdapter] Sanitization also failed:', sanitizeError.message)
        console.error('[BaseAdapter] Response preview:', response.substring(0, 500))

        // V1.8: 最后尝试 - 使用更宽松的解析
        try {
          const relaxedJson = this.relaxedJsonParse(jsonStr)
          if (relaxedJson) {
            console.log('[BaseAdapter] Relaxed parse succeeded ✓')
            return relaxedJson
          }
        } catch (relaxedError) {
          console.error('[BaseAdapter] All parsing attempts failed')
        }

        return this.getDefaultResult()
      }
    }
  }

  /**
   * V1.8: 宽松JSON解析 - 作为最后的容错手段
   * 尝试修复常见的JSON格式问题
   * @param {string} jsonStr - JSON字符串
   * @returns {Object|null} 解析结果或null
   */
  relaxedJsonParse(jsonStr) {
    if (!jsonStr) return null

    let normalized = jsonStr

    // 1. 移除JSON中的注释（虽然标准JSON不支持，但AI可能添加）
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '')
    normalized = normalized.replace(/\/\/.*/g, '')

    // 2. 修复尾部逗号
    normalized = normalized.replace(/,(\s*[}\]])/g, '$1')

    // 3. 修复未引用的属性名（简单情况）
    // 注意：这个正则可能不完全准确，仅作为最后手段

    // 4. 尝试解析
    try {
      return JSON.parse(normalized)
    } catch (e) {
      return null
    }
  }

  /**
   * 获取默认结果（当解析失败时）
   */
  getDefaultResult() {
    return {
      companyInfo: {
        name: null,
        stockCode: null,
        reportPeriod: null,
        reportDate: null
      },
      financialMetrics: [],
      nonFinancialInfo: {
        riskFactors: [],
        majorEvents: [],
        futurePlans: [],
        dividendPlan: null
      },
      confidence: 'low',
      error: 'AI响应解析失败'
    }
  }

  /**
   * V1.8: 清理JSON字符串中的非法控制字符
   * 使用状态机方式处理，只在字符串值内部转义控制字符
   * @param {string} jsonStr - 原始JSON字符串
   * @returns {string} 清理后的JSON字符串
   */
  sanitizeJsonString(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
      return jsonStr
    }

    const result = []
    let inString = false
    let escapeNext = false
    let controlCharCount = 0

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i]
      const code = char.charCodeAt(0)

      if (escapeNext) {
        // 上一个字符是反斜杠，当前字符是转义序列的一部分
        result.push(char)
        escapeNext = false
        continue
      }

      if (char === '\\') {
        // 遇到反斜杠，标记下一个字符需要特殊处理
        result.push(char)
        escapeNext = true
        continue
      }

      if (char === '"') {
        // 引号切换字符串状态
        result.push(char)
        inString = !inString
        continue
      }

      if (inString) {
        // 在字符串内部，检查控制字符
        if (code < 32) {
          // 控制字符需要转义
          controlCharCount++
          let replacement
          switch (code) {
            case 9: // Tab
              replacement = '\\t'
              break
            case 10: // Line Feed (newline)
              replacement = '\\n'
              break
            case 12: // Form Feed
              replacement = '\\f'
              break
            case 13: // Carriage Return
              replacement = '\\r'
              break
            case 8: // Backspace
              replacement = '\\b'
              break
            default:
              // 其他控制字符替换为空格
              replacement = ' '
          }
          result.push(replacement)
          console.log(`[BaseAdapter] Sanitized: control char ASCII ${code} at position ${i} → ${JSON.stringify(replacement)}`)
        } else {
          result.push(char)
        }
      } else {
        // 不在字符串内部，直接保留字符
        result.push(char)
      }
    }

    if (controlCharCount > 0) {
      console.log(`[BaseAdapter] Total control characters sanitized: ${controlCharCount}`)
    }

    return result.join('')
  }
}

export default BaseAdapter
