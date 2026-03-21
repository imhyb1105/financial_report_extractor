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
    return `你是一位专业的财务分析师。请从这份财务报表PDF中提取以下信息：

## 需要提取的财务指标（21项）

### 收入利润类
1. 营业收入
2. 营业成本
3. 毛利润（营业收入-营业成本）
4. 净利润
5. 归母净利润
6. 扣非净利润

### 资产负债类
7. 总资产
8. 总负债
9. 净资产（所有者权益）
10. 流动资产
11. 流动负债
12. 应收账款
13. 存货

### 现金流类
14. 经营活动现金流净额
15. 投资活动现金流净额
16. 筹资活动现金流净额

### 计算指标（需要计算）
17. 毛利率（毛利润/营业收入）
18. 净利率（净利润/营业收入）
19. 资产负债率（总负债/总资产）
20. 流动比率（流动资产/流动负债）
21. ROE（净利润/净资产）

## 需要提取的非财务信息

### 公司概况
- 公司名称
- 股票代码
- 报告期间
- 主营业务
- 所属行业

### 风险提示
- 前3-5条重大风险因素

### 重大事项
- 诉讼、担保、关联交易等

### 未来规划
- 投资计划、战略方向

### 分红方案
- 分红金额、比例、日期

## 输出格式要求（非常重要！）

请严格按照以下JSON格式输出，不要添加任何其他文字：

{
  "companyInfo": {
    "name": "公司名称",
    "stockCode": "股票代码",
    "reportPeriod": "报告期间",
    "reportDate": "报告日期"
  },
  "financialMetrics": [
    {
      "name": "营业收入",
      "value": 1234567890.00,
      "unit": "wan",
      "originalUnit": "万元",
      "confidence": "high",
      "source": {
        "page": 10,
        "location": "利润表",
        "text": "营业收入 1,234,567.89万元"
      }
    }
  ],
  "nonFinancialInfo": {
    "riskFactors": ["风险1", "风险2"],
    "majorEvents": ["事项1"],
    "futurePlans": ["规划1"],
    "dividendPlan": "分红方案描述"
  }
}

## 单位说明
- yuan: 元
- wan: 万元
- yi: 亿元

## 注意事项
1. 所有数值必须是数字类型，不要包含单位或逗号
2. value字段必须是纯数字
3. 如果某项数据无法提取，设置value为null
4. confidence必须是 high/medium/low 之一
5. 只输出JSON，不要有任何其他文字说明`
  }

  /**
   * 构建验证Prompt
   * @param {Object} resultA - 模型A结果
   * @param {Object} resultB - 模型B结果
   * @returns {string}
   */
  buildValidatePrompt(resultA, resultB) {
    return `你是一位资深的财务审计专家。现在有两个AI模型从同一份财务报表中提取了数据，请你对两者的结果进行对比和裁决。

## 模型A的提取结果
${JSON.stringify(resultA, null, 2)}

## 模型B的提取结果
${JSON.stringify(resultB, null, 2)}

## 你的任务

1. 对比每个指标的提取结果
2. 分析差异原因
3. 给出最终裁决结果

## 输出格式要求

请严格按照以下JSON格式输出：

{
  "finalResult": {
    "companyInfo": {...},
    "financialMetrics": [...],
    "nonFinancialInfo": {...}
  },
  "comparisons": [
    {
      "metric": "指标名称",
      "valueA": "模型A的值",
      "valueB": "模型B的值",
      "final": "最终采纳的值",
      "reason": "裁决理由"
    }
  ],
  "confidence": "high",
  "notes": "需要注意的事项"
}

只输出JSON，不要有任何其他文字。`
  }

  /**
   * 解析AI响应
   * @param {string} response - AI返回的文本
   * @returns {Object} 解析后的JSON
   */
  parseResponse(response) {
    if (!response || typeof response !== 'string') {
      console.error('[BaseAdapter] Empty or invalid response')
      return this.getDefaultResult()
    }

    try {
      // 尝试提取JSON部分
      // 方法1: 查找 ```json ... ``` 块
      let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }

      // 方法2: 查找 ``` ... ``` 块
      jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }

      // 方法3: 查找 { ... } 最外层对象
      const startIndex = response.indexOf('{')
      const lastIndex = response.lastIndexOf('}')
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        const jsonStr = response.substring(startIndex, lastIndex + 1)
        return JSON.parse(jsonStr)
      }

      // 方法4: 直接解析
      return JSON.parse(response)
    } catch (error) {
      console.error('[BaseAdapter] Failed to parse AI response:', error.message)
      console.error('[BaseAdapter] Response preview:', response.substring(0, 500))
      return this.getDefaultResult()
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
}

export default BaseAdapter
