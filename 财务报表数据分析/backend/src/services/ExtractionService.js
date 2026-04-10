import PDFService from './PDFService.js'
import AccountingCheckService from './AccountingCheckService.js'
import UnitConvertService from './UnitConvertService.js'
import AdapterFactory from '../adapters/AdapterFactory.js'
import aiLogService from './AILogService.js'
import StatsService from './StatsService.js'

/**
 * 数据提取协调服务
 * V1.7: 集成AI日志服务，支持调试日志输出
 * V2.0: 集成使用统计服务，记录耗时和Token用量
 */
class ExtractionService {
  constructor() {
    this.maxRetries = 3
    this.pdfService = new PDFService()
    this.accountingCheckService = new AccountingCheckService()
    this.unitConvertService = new UnitConvertService()
  }

  /**
   * 执行数据提取
   * @param {string} pdfPath - PDF文件路径
   * @param {Array} models - 模型配置 [{role, provider, apiKey}]
   * @param {string} displayUnit - 显示单位
   * @returns {Object} 提取结果，包含data和debugLog
   */
  async extract(pdfPath, models, displayUnit = 'wan') {
    console.log(`[ExtractionService] Starting extraction for: ${pdfPath}`)
    console.log(`[ExtractionService] Models: ${models.map(m => m.role).join(', ')}`)
    console.log(`[ExtractionService] Display unit: ${displayUnit}`)

    // V2.0: 记录开始时间
    const startTime = Date.now()
    let success = true
    let errorMessage = null

    // V1.7: 开始日志会话
    const sessionId = aiLogService.startSession()

    // V2.0: Token 统计
    const tokenBreakdown = { modelA: 0, modelB: 0, modelC: 0 }

    try {
      // 1. PDF转换为图片（同时获取完整文本用于验证）
      const pdfResult = await this.pdfService.convertToImages(pdfPath)
      const images = pdfResult.pages
      const pdfFullText = pdfResult.fullText
      console.log(`[ExtractionService] Converted ${images.length} pages, text length: ${pdfFullText.length}`)

      // 2. 根据模型数量选择提取策略
      let result

      if (models.length === 1) {
        // 单模型模式
        result = await this.singleModelExtract(models[0], images, pdfPath)
        // V2.0: 记录Token
        if (result.tokens) tokenBreakdown.modelA = result.tokens
      } else if (models.length === 2) {
        // 双模型模式
        result = await this.dualModelExtract(models[0], models[1], images, pdfPath)
        // V2.0: 记录Token
        if (result.modelA?.tokens) tokenBreakdown.modelA = result.modelA.tokens
        if (result.modelB?.tokens) tokenBreakdown.modelB = result.modelB.tokens
      } else {
        // 三模型验证模式
        result = await this.triModelExtract(models[0], models[1], models[2], images, pdfPath)
        // V2.0: 记录Token
        if (result.modelA?.tokens) tokenBreakdown.modelA = result.modelA.tokens
        if (result.modelB?.tokens) tokenBreakdown.modelB = result.modelB.tokens
        if (result.modelC?.tokens) tokenBreakdown.modelC = result.modelC.tokens
      }

      // 3. 模拟数据检测与验证
      const mockDataCheck = this.detectMockData(result, pdfFullText)
      if (mockDataCheck.isMockData) {
        console.warn(`[ExtractionService] Mock data detected: ${mockDataCheck.reasons.join(', ')}`)
        result.extractionWarning = `检测到可能的模拟数据: ${mockDataCheck.reasons.join('; ')}`
        result.confidence = 'low'
      }

      // 3.1 从PDF原文中提取真实公司名称（用于校验AI提取结果）
      const pdfCompanyName = this.extractCompanyNameFromPDF(pdfFullText)
      if (pdfCompanyName && result.companyInfo?.name) {
        const extractedName = result.companyInfo.name.trim()
        if (extractedName !== pdfCompanyName && !extractedName.includes(pdfCompanyName) && !pdfCompanyName.includes(extractedName.replace(/股份有限公司|有限责任公司|集团/, ''))) {
          console.warn(`[ExtractionService] Company name mismatch! AI extracted: "${extractedName}", PDF actual: "${pdfCompanyName}"`)
          result.companyNameMismatch = true
          result.extractionWarning = result.extractionWarning
            ? `${result.extractionWarning}; AI提取的公司名称"${extractedName}"与PDF实际公司"${pdfCompanyName}"不一致，数据可能不准确`
            : `AI提取的公司名称"${extractedName}"与PDF实际公司"${pdfCompanyName}"不一致，数据可能不准确`
          result.confidence = 'low'
          // 尝试修正公司名称
          result.companyInfo.name = pdfCompanyName
        }
      }

      // 3.2 服务端重算派生指标（不依赖AI做算术）
      this.recalculateDerivedMetrics(result)

      // 4. 勾稽关系核对（带重试）
      result = await this.extractWithAccountingCheck(
        () => result,
        images,
        pdfPath,
        models
      )

      // V1.12: 根据勾稽核对结果修正置信度
      result = this.adjustConfidenceBasedOnResults(result, models.length)

      // V2.8: 非财务信息三模型提取（恢复阻塞，前端超时已增至10分钟，足够容纳）
      if (models.length >= 3 && result.modelResults?.modelA && result.modelResults?.modelB) {
        try {
          result = await this.enhanceNonFinancialInfo(result, models, images, pdfPath)
        } catch (e) {
          console.warn(`[ExtractionService] Non-financial info enhancement failed: ${e.message}`)
        }
      }

      // 5. 单位转换
      result = this.unitConvertService.convert(result, displayUnit)

      // 6. 添加元数据
      result.metadata = {
        extractedAt: new Date().toISOString(),
        modelCount: models.length,
        extractionMode: models.length === 1 ? 'single' : models.length === 2 ? 'dual' : 'tri',
        displayUnit,
        pdfInfo: {
          path: pdfPath,
          pageCount: images.length,
          textLength: pdfFullText.length
        },
        mockDataCheck
      }

      // V1.9: 生成置信度原因
      result.confidenceReason = this.generateConfidenceReason(result, models.length, mockDataCheck)

      // V1.7: 构建调试日志
      const debugLog = aiLogService.buildDebugLog(result)

      // V2.0: 计算总耗时
      const totalDuration = Date.now() - startTime

      // V2.7: 从调试日志中收集token使用量
      if (debugLog?.modelCalls) {
        for (const call of debugLog.modelCalls) {
          const usage = call.response?.tokens
          if (!usage) continue
          const total = (usage.total_tokens || 0) ||
            ((usage.input_tokens || usage.prompt_tokens || 0) + (usage.output_tokens || usage.completion_tokens || 0))
          if (call.role === 'A') tokenBreakdown.modelA = total
          else if (call.role === 'B') tokenBreakdown.modelB = total
          else if (call.role === 'C') tokenBreakdown.modelC = total
        }
      }
      const totalTokens = tokenBreakdown.modelA + tokenBreakdown.modelB + tokenBreakdown.modelC

      // V2.0: 添加使用统计到结果
      result.usage = {
        totalDuration,
        formattedDuration: StatsService.formatDuration(totalDuration),
        totalTokens,
        breakdown: tokenBreakdown
      }

      // V2.0: 记录使用统计到数据库
      const extractionMode = models.length === 1 ? 'single' : models.length === 2 ? 'dual' : 'tri'
      const confidenceScore = typeof result.confidence === 'number' ? result.confidence : 3

      await StatsService.recordUsage({
        sessionId,
        extractionMode,
        totalDuration,
        totalTokens,
        tokenBreakdown,
        confidenceScore,
        success: true
      })

      return {
        data: result,
        debugLog
      }
    } catch (err) {
      success = false
      errorMessage = err.message
      console.error('[ExtractionService] Extraction failed:', err)

      // V2.0: 记录失败统计
      const totalDuration = Date.now() - startTime
      await StatsService.recordUsage({
        sessionId,
        extractionMode: models.length === 1 ? 'single' : models.length === 2 ? 'dual' : 'tri',
        totalDuration,
        totalTokens: 0,
        confidenceScore: 1,
        success: false,
        errorMessage
      })

      throw err
    }
  }

  /**
   * V1.9: 生成置信度原因说明
   * V1.14: 支持五档置信度
   * @param {Object} result - 提取结果
   * @param {number} modelCount - 使用的模型数量
   * @param {Object} mockDataCheck - 模拟数据检测结果
   * @returns {string} 置信度原因说明
   */
  generateConfidenceReason(result, modelCount, mockDataCheck) {
    const reasons = []

    // 1. 模型数量因素
    if (modelCount === 1) {
      reasons.push('单模型提取')
    } else if (modelCount === 2) {
      reasons.push('双模型交叉验证')
    } else if (modelCount >= 3) {
      reasons.push('三模型裁决验证')
    }

    // 2. 模拟数据检测
    if (mockDataCheck?.isMockData) {
      reasons.push('检测到疑似模拟数据')
    }

    // 3. 勾稽关系核对
    if (result.accountingCheck) {
      const { passed, summary } = result.accountingCheck
      if (!passed) {
        reasons.push('勾稽关系存在异常')
      } else if (summary?.warnings > 0) {
        reasons.push(`勾稽关系存在${summary.warnings}项警告`)
      } else {
        reasons.push('勾稽关系核对通过')
      }
    }

    // 4. 数据完整性
    const metricsCount = result.financialMetrics?.length || 0
    if (metricsCount < 10) {
      reasons.push('提取指标较少')
    } else if (metricsCount >= 20) {
      reasons.push('数据提取完整')
    }

    // 5. 公司信息完整性
    const { companyInfo } = result
    const companyInfoComplete = companyInfo?.name && companyInfo?.stockCode && companyInfo?.reportPeriod
    if (!companyInfoComplete) {
      reasons.push('公司信息不完整')
    }

    // V1.14: 支持五档置信度 (1-5)
    const confidence = result.confidence || 3
    const score = typeof confidence === 'number' ? confidence : ({ 'high': 5, 'medium-high': 4, 'medium': 3, 'medium-low': 2, 'low': 1 }[confidence] || 3)

    // 根据分数过滤原因
    if (score >= 5) {
      // 高置信度：只显示正面原因
      return reasons.filter(r =>
        r.includes('验证') || r.includes('通过') || r.includes('完整')
      ).join('，') || '数据质量优秀'
    } else if (score >= 4) {
      // 中高置信度：显示正面原因，提示可提升
      const positive = reasons.filter(r => r.includes('验证') || r.includes('通过') || r.includes('完整'))
      return positive.length > 0 ? positive.join('，') : '数据质量良好'
    } else if (score >= 3) {
      // 中置信度：显示实际原因
      const positiveReasons = reasons.filter(r => r.includes('通过') || r.includes('完整') || r.includes('验证'))
      const negativeReasons = reasons.filter(r => r.includes('异常') || r.includes('警告') || r.includes('较少'))
      if (negativeReasons.length > 0) {
        return negativeReasons.join('，')
      }
      return positiveReasons.length > 0 ? positiveReasons.join('，') : '数据质量一般'
    } else if (score >= 2) {
      // 中低置信度：显示警告和问题
      const negativeReasons = reasons.filter(r => r.includes('异常') || r.includes('警告') || r.includes('不完整') || r.includes('模拟'))
      return negativeReasons.length > 0 ? negativeReasons.join('，') : '建议人工核对部分数据'
    } else {
      // 低置信度：显示严重问题
      return reasons.filter(r =>
        r.includes('模拟') || r.includes('异常') || r.includes('不完整')
      ).join('，') || '数据质量存疑，建议人工核对'
    }
  }

  /**
   * V1.12: 根据勾稽核对结果修正置信度
   * V1.14: 支持五档置信度 (1-5 或 high/medium-high/medium/medium-low/low)
   * @param {Object} result - 提取结果
   * @param {number} modelCount - 模型数量
   * @returns {Object} 修正后的结果
   */
  adjustConfidenceBasedOnResults(result, modelCount) {
    // 如果已经是低置信度（模拟数据），不调整
    if (result.confidence === 'low' || result.confidence === 1) {
      return result
    }

    // V2.7: tri-single模式（一个模型失败）时，置信度上限为3（中等）
    if (result.extractionMode === 'tri-single' || result.extractionMode === 'dual-single') {
      const currentScore = typeof result.confidence === 'number' ? result.confidence : 3
      if (currentScore > 3) {
        console.log(`[ExtractionService] ${result.extractionMode} mode: capping confidence from ${currentScore} to 3`)
        result.confidence = 3
      }
      return result
    }

    // V1.14: 如果模型C已经给出1-5分的置信度，直接使用并调整
    if (typeof result.confidence === 'number' && result.confidence >= 1 && result.confidence <= 5) {
      return this.adjustConfidenceFromScore(result)
    }

    // 兼容旧的字符串格式
    const confidenceMap = { 'high': 5, 'medium-high': 4, 'medium': 3, 'medium-low': 2, 'low': 1 }
    let currentScore = confidenceMap[result.confidence] || 3

    // 计算各项指标
    const accountingCheck = result.accountingCheck
    const metrics = result.financialMetrics || []
    const companyInfo = result.companyInfo || {}

    // 1. 勾稽核对评分
    let accountingScore = 0
    if (accountingCheck) {
      if (accountingCheck.passed && accountingCheck.summary?.warnings === 0) {
        accountingScore = 5 // 完美通过
      } else if (accountingCheck.passed) {
        accountingScore = 4 // 通过但有警告
      } else {
        accountingScore = 2 // 未通过
      }
    }

    // 2. 指标置信度评分
    const highConfidenceMetrics = metrics.filter(m => m.confidence === 'high').length
    const mediumConfidenceMetrics = metrics.filter(m => m.confidence === 'medium').length
    const totalMetrics = metrics.length
    const metricScore = totalMetrics > 0
      ? Math.round((highConfidenceMetrics * 5 + mediumConfidenceMetrics * 3) / totalMetrics)
      : 3

    // 3. 公司信息完整性评分
    const companyInfoComplete = companyInfo.name && companyInfo.stockCode && companyInfo.reportPeriod
    const companyScore = companyInfoComplete ? 5 : (companyInfo.name ? 3 : 1)

    // 4. 综合评分 (加权平均)
    const totalScore = Math.round((accountingScore * 0.4) + (metricScore * 0.4) + (companyScore * 0.2))

    // 5. 多模型加分
    const finalScore = modelCount >= 3 ? Math.min(5, totalScore + 1) : (modelCount >= 2 ? totalScore : Math.max(1, totalScore - 1))

    console.log(`[ExtractionService] Confidence adjustment: accounting=${accountingScore}, metrics=${metricScore}, company=${companyScore}, total=${totalScore}, final=${finalScore}`)

    // 6. 设置置信度
    const originalConfidence = result.confidence
    result.confidence = finalScore

    // 记录调整日志
    if (originalConfidence !== finalScore) {
      console.log(`[ExtractionService] Confidence adjusted: ${originalConfidence} → ${finalScore}`)
    }

    return result
  }

  /**
   * V1.14: 根据模型C的评分调整置信度
   * V2.8: 修复置信度计算逻辑 - 勾稽核对完美通过时应提升置信度
   * @param {Object} result - 提取结果
   * @returns {Object} 修正后的结果
   */
  adjustConfidenceFromScore(result) {
    const modelCScore = result.confidence // 1-5
    const accountingCheck = result.accountingCheck

    // 勾稽核对影响
    let adjustment = 0
    if (accountingCheck) {
      if (accountingCheck.passed && accountingCheck.summary?.warnings === 0) {
        adjustment = 1 // 完美通过，提升一级
      } else if (accountingCheck.passed) {
        adjustment = 0 // 通过但有警告，不调整
      } else {
        adjustment = -1 // 未通过，降低一级
      }
    }

    // 计算最终分数 (1-5范围)
    const finalScore = Math.max(1, Math.min(5, modelCScore + adjustment))

    console.log(`[ExtractionService] Model C score: ${modelCScore}, accounting adjustment: ${adjustment}, final: ${finalScore}`)

    result.confidence = finalScore
    return result
  }

  /**
   * 单模型提取
   * V1.7: 添加日志记录
   */
  async singleModelExtract(modelConfig, images, pdfPath) {
    const adapter = AdapterFactory.createAdapter(modelConfig.provider, modelConfig.apiKey, { model: modelConfig.model })

    if (!adapter) {
      throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
    }

    // V1.7: 传递日志服务到适配器
    const result = await adapter.extract(images, {
      pdfPath,
      mode: 'single',
      aiLogService
    })

    // 检测并清理模板/占位符数据
    this.cleanTemplateData(result)

    // 单模型模式下，置信度可能较低
    if (result.financialMetrics) {
      result.financialMetrics.forEach(metric => {
        if (metric.confidence === 'high') {
          metric.confidence = 'medium'
        }
      })
    }

    result.confidence = result.confidence || 'medium'
    result.extractionMode = 'single'

    // 添加模型结果（单模型模式下只有一个）
    result.modelResults = {
      modelA: {
        provider: modelConfig.provider,
        companyInfo: result.companyInfo,
        financialMetrics: result.financialMetrics
      }
    }

    console.log(`[ExtractionService] Single model result: modelA.provider=${modelConfig.provider}, metrics=${result.financialMetrics?.length || 0}`)

    return result
  }

  /**
   * 检测并清理模板/占位符数据
   * AI有时会返回示例数据而非实际提取的数据
   */
  cleanTemplateData(result) {
    if (!result) return

    // 检测公司信息中的占位符
    const placeholderPatterns = [
      /^公司名称$/,
      /^股票代码$/,
      /^报告期间$/,
      /^报告日期$/,
      /^示例公司/,
      /^Example/i,
      /^XXX/,
      /^000000/
    ]

    if (result.companyInfo) {
      for (const [key, value] of Object.entries(result.companyInfo)) {
        if (typeof value === 'string') {
          for (const pattern of placeholderPatterns) {
            if (pattern.test(value.trim())) {
              console.log(`[ExtractionService] Detected placeholder data: ${key} = "${value}", setting to null`)
              result.companyInfo[key] = null
              break
            }
          }
        }
      }
    }

    // 检测财务指标中的无效数据
    if (result.financialMetrics) {
      let validMetrics = 0
      for (const metric of result.financialMetrics) {
        if (metric.value !== null && metric.value !== undefined && metric.value !== 0) {
          validMetrics++
        }
      }

      // 如果所有指标都是 null 或 0，可能是模板数据
      if (validMetrics === 0 && result.financialMetrics.length > 0) {
        console.log(`[ExtractionService] Warning: All financial metrics are null/zero, possible template response`)
        result.extractionWarning = 'AI可能返回了模板数据而非实际提取结果，请检查PDF内容是否正确'
      }
    }
  }

  /**
   * V2.6: 服务端重算派生指标
   * AI模型做算术经常出错，服务端根据原始提取值重新计算
   * 派生指标：毛利润、毛利率、净利率、资产负债率、流动比率、ROE
   */
  recalculateDerivedMetrics(result) {
    if (!result.financialMetrics || result.financialMetrics.length === 0) return

    const metrics = result.financialMetrics
    const getVal = (name) => {
      const m = metrics.find(m => m.name === name)
      return m ? m.value : null
    }
    const setVal = (name, value, formula) => {
      let m = metrics.find(m => m.name === name)
      if (m) {
        const oldVal = m.value
        m.value = value
        m.unit = m.unit || 'yuan'
        m.confidence = 'high' // 服务端根据原始值精确计算，置信度为高
        if (formula) {
          m.source = m.source || {}
          m.source.location = '服务端计算'
          m.source.text = formula
        }
        if (oldVal !== null && oldVal !== undefined && Math.abs(oldVal - value) > 0.01) {
          console.log(`[ExtractionService] Recalculated ${name}: ${oldVal} → ${value} (${formula})`)
        }
      }
    }

    const revenue = getVal('营业收入')
    const cost = getVal('营业成本')
    const netProfit = getVal('净利润')
    const parentNetProfit = getVal('归属于母公司股东的净利润')
    const totalAssets = getVal('总资产')
    const totalLiabilities = getVal('总负债')
    const currentAssets = getVal('流动资产')
    const currentLiabilities = getVal('流动负债')
    const parentEquity = getVal('归属于母公司所有者权益合计')

    // 毛利润 = 营业收入 - 营业成本
    if (revenue != null && cost != null) {
      setVal('毛利润', revenue - cost, `营业收入(${revenue}) - 营业成本(${cost})`)
    }

    // 毛利率 = 毛利润 / 营业收入
    if (revenue != null && cost != null && revenue !== 0) {
      setVal('毛利率', parseFloat(((revenue - cost) / revenue).toFixed(4)), '毛利润 / 营业收入')
    }

    // 净利率 = 净利润 / 营业收入
    if (netProfit != null && revenue != null && revenue !== 0) {
      setVal('净利率', parseFloat((netProfit / revenue).toFixed(4)), '净利润 / 营业收入')
    }

    // 资产负债率 = 总负债 / 总资产
    if (totalLiabilities != null && totalAssets != null && totalAssets !== 0) {
      setVal('资产负债率', parseFloat((totalLiabilities / totalAssets).toFixed(4)), '总负债 / 总资产')
    }

    // 流动比率 = 流动资产 / 流动负债
    if (currentAssets != null && currentLiabilities != null && currentLiabilities !== 0) {
      setVal('流动比率', parseFloat((currentAssets / currentLiabilities).toFixed(2)), '流动资产 / 流动负债')
    }

    // ROE = 归属于母公司股东的净利润 / 归属于母公司所有者权益合计
    if (parentNetProfit != null && parentEquity != null && parentEquity !== 0) {
      setVal('ROE', parseFloat((parentNetProfit / parentEquity).toFixed(4)), '归母净利润 / 归母所有者权益')
    }
  }

  /**
   * V2.7: 三模型方式增强非财务信息提取
   * A/B模型分别提取非财务信息，C模型总结合并
   */
  async enhanceNonFinancialInfo(result, models, images, pdfPath) {
    const modelA = models[0]
    const modelB = models[1]
    const modelC = models[2]

    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey, { model: modelA.model })
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey, { model: modelB.model })
    const adapterC = AdapterFactory.createAdapter(modelC.provider, modelC.apiKey, { model: modelC.model })

    console.log('[ExtractionService] Starting non-financial info extraction (A/B extract, C summarize)')

    // 构建专门的非财务信息提取prompt
    const nonFinPrompt = this.buildNonFinancialPrompt(pdfPath)

    // A/B并行提取非财务信息
    const [resultA, resultB] = await Promise.all([
      adapterA.extractNonFinancial(images, { pdfPath, role: 'A', aiLogService, prompt: nonFinPrompt }).catch(e => {
        console.warn('[ExtractionService] Model A non-financial extraction failed:', e.message)
        return null
      }),
      adapterB.extractNonFinancial(images, { pdfPath, role: 'B', aiLogService, prompt: nonFinPrompt }).catch(e => {
        console.warn('[ExtractionService] Model B non-financial extraction failed:', e.message)
        return null
      })
    ])

    if (!resultA && !resultB) {
      console.warn('[ExtractionService] Both models failed non-financial extraction, keeping original')
      return result
    }

    // C模型总结合并
    const summarizePrompt = this.buildNonFinancialSummarizePrompt(resultA, resultB, result.companyInfo?.name)
    const summarizedResult = await adapterC.summarizeNonFinancial(summarizePrompt, { role: 'C', aiLogService }).catch(e => {
      console.warn('[ExtractionService] Model C non-financial summarization failed:', e.message)
      return null
    })

    if (summarizedResult) {
      result.nonFinancialInfo = summarizedResult
      result.nonFinancialInfoEnhanced = true
      console.log('[ExtractionService] Non-financial info enhanced by Model C')
    } else if (resultA || resultB) {
      // C失败时使用A或B的结果（只取nonFinancialInfo字段，不要整个extract结果）
      const fallbackSource = resultA || resultB
      const fallbackData = fallbackSource?.nonFinancialInfo || fallbackSource
      if (fallbackData) {
        result.nonFinancialInfo = fallbackData
        result.nonFinancialInfoEnhanced = true
        console.log('[ExtractionService] Non-financial info using fallback (A or B result)')
      }
    }

    return result
  }

  /**
   * V2.8: 构建非财务信息提取专用prompt（优化版）
   * - 识别报告类型（季度/年度）
   * - 扩大搜索范围，不仅搜索专门章节
   * - 返回结构化状态信息
   */
  buildNonFinancialPrompt(pdfPath) {
    return `你是一位专业的财务分析师。请从PDF中提取非财务信息。

# 第一步：识别报告类型
首先判断这是什么类型的报告：
- 如果标题包含"第一季度"、"第二季度"、"第三季度"、"第四季度"或"半年度"，则为季度/半年度报告
- 如果标题包含"年度报告"或"年报"，则为年度报告

# 第二步：提取信息（灵活策略）
⚠️ 重要：季度报告通常比年度报告简短，可能不包含完整的专门章节。请采用灵活策略：

## 1. 风险因素 (riskFactors)
**优先搜索专门章节**：
- "可能面对的风险"、"风险提示"、"风险因素"、"风险警示"

**如果找不到专门章节，搜索相关描述**：
- "审计意见"、"重大不确定性"、"持续经营"
- "诉讼"、"仲裁"、"担保"、"抵押"
- 报告开头/结尾的"重要内容提示"、"注意事项"

## 2. 重大事项 (majorEvents)
**优先搜索专门章节**：
- "重要事项"、"重大事项"、"重大事件"、"临时公告"

**如果找不到专门章节，搜索相关描述**：
- "收购"、"出售"、"合并"、"重组"
- "投资"、"融资"、"股权变动"
- "关联交易"、"对外担保"

## 3. 未来规划 (futurePlans)
**优先搜索专门章节**：
- "未来发展展望"、"未来发展规划"、"经营计划"、"发展目标"

**如果找不到专门章节，搜索相关描述**：
- "下一步"、"计划"、"预计"、"展望"
- 董事会报告、管理层讨论中的前瞻性陈述

## 4. 分红方案 (dividendPlan)
**优先搜索专门章节**：
- "利润分配"、"股利分配"、"分红派息"、"股息"

**如果找不到专门章节，搜索相关描述**：
- "未分配利润"、"盈余公积"
- "利润分配预案"、"分红预案"

# 第三步：确定状态
对每个字段，确定以下状态之一：
- "found": 找到专门章节，内容完整
- "partial": 没有专门章节，但找到相关描述
- "not_in_report": 报告类型不包含此信息（如季度报告通常不含风险因素章节）
- "not_found": 确实找不到任何相关信息

# 输出格式（严格JSON，不要其他文字）
{
  "reportType": "quarterly" 或 "annual",
  "riskFactors": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "风险描述", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议（如：季度报告通常不包含完整的风险因素章节，建议查看年度报告）"
  },
  "majorEvents": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "事项描述", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议"
  },
  "futurePlans": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "规划描述", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议"
  },
  "dividendPlan": {
    "status": "found/partial/not_in_report/not_found",
    "content": "分红方案描述（如有）",
    "source": {"page": 页码, "location": "位置"},
    "hint": "状态说明或建议"
  }
}

⚠️ 重要提示：
1. 即使找不到专门章节，也要尽量提取相关的零散信息
2. hint字段必须填写，告诉用户为什么是空的建议查看什么
3. 不要返回空数组后什么都不解释

⚠️ 页码准确性要求（极其重要）：
1. source.page 必须是内容实际所在的页码，查看PDF原文中"--- 第 X 页 ---"标记
2. 不同内容可能在不同的页，不要所有内容都写同一个页码
3. 如果内容出现在第5页，source.page必须是5，不是3或其他数字
4. 禁止为所有内容使用相同的页码（如全部写3）
5. 如果不确定页码，可以根据内容上下文中的"--- 第 X 页 ---"标记推断

只输出JSON。`
  }

  /**
   * V2.8: 构建非财务信息总结合并prompt（支持新的结构化格式）
   */
  buildNonFinancialSummarizePrompt(resultA, resultB, companyName) {
    return `你是一位专业的财务分析师。以下是两个AI模型从"${companyName || '某公司'}"的财务报告中提取的非财务信息。

【模型A提取结果】
${JSON.stringify(resultA || { reportType: 'unknown', riskFactors: { status: 'not_found', items: [], hint: '' }, majorEvents: { status: 'not_found', items: [], hint: '' }, futurePlans: { status: 'not_found', items: [], hint: '' }, dividendPlan: { status: 'not_found', content: '', hint: '' } }, null, 2)}

【模型B提取结果】
${JSON.stringify(resultB || { reportType: 'unknown', riskFactors: { status: 'not_found', items: [], hint: '' }, majorEvents: { status: 'not_found', items: [], hint: '' }, futurePlans: { status: 'not_found', items: [], hint: '' }, dividendPlan: { status: 'not_found', content: '', hint: '' } }, null, 2)}

# 任务
请综合两个模型的结果，生成最终的非财务信息：
1. 合并两个模型提取的内容，去重并补充
2. 如果两个模型提取的内容有冲突，选择更详细/更准确的版本
3. 如果某个模型提取为空但另一个有内容，保留有内容的
4. 确保最终结果准确、完整
5. 保留或合并hint字段中的建议

# 输出格式（严格JSON，不要其他文字）
{
  "reportType": "quarterly" 或 "annual",
  "riskFactors": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "风险描述（简洁明了）", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议"
  },
  "majorEvents": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "事项描述（简洁明了）", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议"
  },
  "futurePlans": {
    "status": "found/partial/not_in_report/not_found",
    "items": [
      {"content": "规划描述（简洁明了）", "source": {"page": 页码, "location": "位置"}}
    ],
    "hint": "状态说明或建议"
  },
  "dividendPlan": {
    "status": "found/partial/not_in_report/not_found",
    "content": "分红方案描述（如有）",
    "source": {"page": 页码, "location": "位置"},
    "hint": "状态说明或建议"
  }
}

只输出JSON。`
  }

  /**
   * 验证提取的数据是否来自PDF原文
   * @param {Object} result - 提取结果
   * @param {string} pdfFullText - PDF完整文本
   * @returns {Object} { isMockData: boolean, reasons: string[] }
   */
  detectMockData(result, pdfFullText) {
    const reasons = []

    if (!result || !pdfFullText) {
      return { isMockData: false, reasons: [] }
    }

    // 1. 检测公司名称是否在PDF中存在
    if (result.companyInfo?.name) {
      const companyName = result.companyInfo.name.trim()
      // 检查是否为占位符
      const placeholderPatterns = [/^公司名称$/, /^示例公司/, /^Example/i, /^XXX/, /^测试公司/]
      let isPlaceholder = false
      for (const pattern of placeholderPatterns) {
        if (pattern.test(companyName)) {
          reasons.push(`公司名称为占位符: "${companyName}"`)
          isPlaceholder = true
          break
        }
      }

      // 检查公司名是否在PDF中存在（如果不是占位符）
      // 注意：PDF文本提取可能不完整（扫描件、特殊字体等），因此仅作为辅助参考
      if (!isPlaceholder && !pdfFullText.includes(companyName)) {
        // 尝试匹配公司名称的简短形式（如去掉括号内容、去掉"股份有限公司"等）
        const shortNames = [
          companyName.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim(),
          companyName.replace(/股份有限公司/, '').replace(/有限责任公司/, '').trim(),
          companyName.replace(/集团/, '').trim()
        ].filter(name => name.length >= 2 && name !== companyName)

        let nameFound = false
        for (const shortName of shortNames) {
          if (pdfFullText.includes(shortName)) {
            nameFound = true
            break
          }
        }

        if (!nameFound) {
          reasons.push(`公司名称 "${companyName}" 不在PDF原文中`)
        }
      }
    }

    // 2. 检测连续数字模式和重复数字模式（模拟数据特征）
    // 扩展检测模式，覆盖更多可能的模拟数据模式
    if (result.financialMetrics) {
      const mockPatterns = [
        // 连续递增数字
        { pattern: /^123456/, desc: '连续递增数字(123456...)' },
        { pattern: /^234567/, desc: '连续递增数字(234567...)' },
        { pattern: /^345678/, desc: '连续递增数字(345678...)' },
        { pattern: /^456789/, desc: '连续递增数字(456789...)' },
        { pattern: /^567890/, desc: '连续递增数字(567890...)' },
        // 连续递减数字
        { pattern: /^987654/, desc: '连续递减数字(987654...)' },
        { pattern: /^876543/, desc: '连续递减数字(876543...)' },
        { pattern: /^765432/, desc: '连续递减数字(765432...)' },
        { pattern: /^654321/, desc: '连续递减数字(654321...)' },
        // 重复数字
        { pattern: /^111111/, desc: '重复数字(111111...)' },
        { pattern: /^222222/, desc: '重复数字(222222...)' },
        { pattern: /^333333/, desc: '重复数字(333333...)' },
        { pattern: /^444444/, desc: '重复数字(444444...)' },
        { pattern: /^555555/, desc: '重复数字(555555...)' },
        { pattern: /^666666/, desc: '重复数字(666666...)' },
        { pattern: /^777777/, desc: '重复数字(777777...)' },
        { pattern: /^888888/, desc: '重复数字(888888...)' },
        { pattern: /^999999/, desc: '重复数字(999999...)' },
        { pattern: /^000000/, desc: '重复数字(000000...)' },
        // 常见模拟数据模式
        { pattern: /^523456/, desc: '疑似模拟数据(523456...)' },
        { pattern: /^52345/, desc: '疑似模拟数据(52345...)' },
        { pattern: /^12345\d/, desc: '疑似模拟数据(12345x...)' },
        { pattern: /^98765\d/, desc: '疑似模拟数据(98765x...)' }
      ]

      let mockValueCount = 0
      for (const metric of result.financialMetrics) {
        if (metric.value !== null && metric.value !== undefined) {
          const valueStr = String(Math.abs(metric.value)).replace(/[.,]/g, '')

          // 检查连续数字模式
          for (const { pattern, desc } of mockPatterns) {
            if (pattern.test(valueStr)) {
              reasons.push(`指标"${metric.name}"值为${desc}`)
              mockValueCount++
              break
            }
          }

          // 检查是否为"好看"的数字模式（如 x.79, x.89, x.99 等）
          const decimalPart = valueStr.split('.')[1] || ''
          if (decimalPart.length >= 2) {
            const lastTwoDigits = decimalPart.slice(0, 2)
            const niceEndings = ['79', '89', '99', '00', '11', '22', '33', '44', '55', '66', '77', '88']
            if (niceEndings.includes(lastTwoDigits) && valueStr.length > 4) {
              // 只记录一次，避免过多警告
              if (mockValueCount === 0) {
                reasons.push(`多个指标值以"${lastTwoDigits}"结尾，疑似模拟数据`)
              }
              mockValueCount++
            }
          }
        }
      }

      // 如果多个指标都是模拟数据模式，整体标记为模拟数据
      if (mockValueCount >= 3) {
        reasons.push(`检测到${mockValueCount}个指标使用了模拟数字模式`)
      }
    }

    // 3. 验证数值是否在PDF中有对应
    // 注意：此检测仅作为辅助参考，不作为模拟数据的主要判断依据
    // 因为PDF中的数字格式多样（千位分隔符、万元/亿元单位、表格分散等），
    // 匹配失败不代表数据是模拟的，可能是格式差异导致
    if (result.financialMetrics && pdfFullText) {
      let unmatchedCount = 0
      let matchedCount = 0
      const checkedValues = []
      const significantMetrics = result.financialMetrics.filter(m =>
        m.value !== null &&
        m.value !== undefined &&
        Math.abs(m.value) > 1000000 // 只检查大数值
      )

      for (const metric of significantMetrics.slice(0, 10)) { // 检查前10个大数值
        // 提取数值的主要部分（去掉小数点，用于在PDF中搜索）
        const valueStr = String(Math.abs(metric.value))
        const mainPart = valueStr.split('.')[0] // 取整数部分

        // 跳过太短的数字
        if (mainPart.length < 4) continue

        // 在PDF中搜索这个数值
        // 尝试多种格式：原始、带逗号、带空格、除以10000（万元）、除以100000000（亿元）
        const searchPatterns = [
          mainPart,
          mainPart.replace(/\B(?=(\d{3})+(?!\d))/g, ','), // 添加千位分隔符
          mainPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' '),  // 空格分隔
          // PDF中以万元为单位时的数值（除以10000）
          ...this._getUnitVariants(mainPart)
        ]

        let found = false
        for (const pattern of searchPatterns) {
          if (pdfFullText.includes(pattern)) {
            found = true
            break
          }
        }

        if (found) {
          matchedCount++
        } else {
          unmatchedCount++
          checkedValues.push(mainPart)
        }
      }

      // 仅当匹配率为0%（全部大数值都找不到）且数量>=5时才标记
      // 匹配率>0说明数据是真实的，只是部分格式不匹配
      const totalChecked = matchedCount + unmatchedCount
      if (totalChecked >= 5 && matchedCount === 0) {
        reasons.push(`${unmatchedCount}个大数值(${checkedValues.slice(0, 3).join(', ')}...)在PDF原文中未找到对应`)
      }
    }

    // 4. 检查公司信息字段是否为占位符
    if (result.companyInfo) {
      const { stockCode, reportPeriod, reportDate } = result.companyInfo

      // 检查股票代码是否为占位符
      if (stockCode) {
        const stockCodeStr = String(stockCode).trim()
        if (/^股票代码$|^000000|^XXXXXX|^123456/i.test(stockCodeStr)) {
          reasons.push(`股票代码为占位符: "${stockCodeStr}"`)
        }
      }

      // 检查报告期间是否为占位符
      if (reportPeriod) {
        if (/^报告期间$|^报告期$|^XXXX|^示例/i.test(reportPeriod.trim())) {
          reasons.push(`报告期间为占位符: "${reportPeriod}"`)
        }
      }

      // 检查报告日期是否为占位符
      if (reportDate) {
        if (/^报告日期$|^XXXX|^示例/i.test(reportDate.trim())) {
          reasons.push(`报告日期为占位符: "${reportDate}"`)
        }
      }
    }

    return {
      isMockData: reasons.length > 0,
      reasons
    }
  }

  /**
   * 生成数值在不同单位下的变体，用于PDF原文匹配
   * PDF中的数字可能是万元、亿元等单位，需要转换后搜索
   * @param {string} mainPart - 数值的整数部分字符串
   * @returns {string[]} 单位变体数组
   */
  _getUnitVariants(mainPart) {
    const variants = []
    const num = Number(mainPart)
    if (isNaN(num) || num === 0) return variants

    // 万元：除以10000，可能有小数
    const wanValue = num / 10000
    if (Number.isInteger(wanValue)) {
      variants.push(
        String(wanValue),
        String(wanValue).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      )
    } else {
      // 保留2位小数
      const wanStr = wanValue.toFixed(2)
      variants.push(wanStr)
    }

    // 亿元：除以100000000
    const yiValue = num / 100000000
    if (yiValue >= 0.01) {
      if (Number.isInteger(yiValue)) {
        variants.push(
          String(yiValue),
          String(yiValue).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        )
      } else {
        const yiStr = yiValue.toFixed(2)
        variants.push(yiStr)
      }
    }

    return variants
  }

  /**
   * 从PDF原文中提取真实公司名称
   * 通过识别PDF中的"XX股份有限公司"等模式来提取
   * @param {string} pdfFullText - PDF完整文本
   * @returns {string|null} 公司名称
   */
  extractCompanyNameFromPDF(pdfFullText) {
    if (!pdfFullText) return null

    // 常见公司名称模式
    const patterns = [
      // "XXX股份有限公司" 或 "XXX有限责任公司" 出现在标题行
      /([^\s\n]{2,30}(?:股份有限公司|有限责任公司|集团有限公司|（集团）股份有限公司))/,
      // 证券代码前的公司名
      /([^\s\n]{2,30}(?:股份有限公司|有限责任公司))\s*\n/,
      // 第一行的公司名（通常格式为"公司名 XXXX年报告"）
      /^(.{2,30}(?:股份有限公司|有限责任公司|集团有限公司))/m
    ]

    for (const pattern of patterns) {
      const match = pdfFullText.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        // 过滤掉太短或明显不是公司名的结果
        if (name.length >= 4 && !/^证券|^股票|^报告|^本报告|^重要|^董事|^公司/.test(name)) {
          console.log(`[ExtractionService] Extracted company name from PDF: "${name}"`)
          return name
        }
      }
    }

    return null
  }

  /**
   * 双模型提取
   * V1.7: 添加日志记录
   */
  async dualModelExtract(modelA, modelB, images, pdfPath) {
    console.log(`[ExtractionService] Starting dual model extraction`)
    console.log(`[ExtractionService] Model A: ${modelA.provider}`)
    console.log(`[ExtractionService] Model B: ${modelB.provider}`)

    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey, { model: modelA.model })
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey, { model: modelB.model })

    // 并行提取 - V1.7: 传递日志服务
    const [resultA, resultB] = await Promise.all([
      adapterA.extract(images, { pdfPath, role: 'A', aiLogService }),
      adapterB.extract(images, { pdfPath, role: 'B', aiLogService })
    ])

    console.log(`[ExtractionService] Model A extracted: ${resultA?.financialMetrics?.length || 0} metrics`)
    console.log(`[ExtractionService] Model B extracted: ${resultB?.financialMetrics?.length || 0} metrics`)

    // 清理模板数据
    this.cleanTemplateData(resultA)
    this.cleanTemplateData(resultB)

    // V2.6: 检测单模型解析失败
    const hasAMetrics = resultA.financialMetrics && resultA.financialMetrics.length > 0
    const hasBMetrics = resultB.financialMetrics && resultB.financialMetrics.length > 0

    if (!hasAMetrics && !hasBMetrics) {
      console.error('[ExtractionService] Both models failed to extract data')
      const finalResult = this.mergeResults(resultA, resultB)
      finalResult.confidence = 'low'
      finalResult.extractionMode = 'dual-fallback'
      finalResult.extractionWarning = '两个模型均解析失败，数据不可用'
      finalResult.modelResults = {
        modelA: { provider: modelA.provider, companyInfo: resultA.companyInfo, financialMetrics: resultA.financialMetrics, error: resultA.error },
        modelB: { provider: modelB.provider, companyInfo: resultB.companyInfo, financialMetrics: resultB.financialMetrics, error: resultB.error }
      }
      return finalResult
    }

    if (!hasAMetrics || !hasBMetrics) {
      const failedModel = !hasAMetrics ? 'A' : 'B'
      const successResult = hasAMetrics ? resultA : resultB
      console.warn(`[ExtractionService] Model ${failedModel} parse failed, using successful model's data directly`)
      const finalResult = JSON.parse(JSON.stringify(successResult))
      this.cleanTemplateData(finalResult)
      finalResult.confidence = 'medium-high'
      finalResult.extractionMode = 'dual-single'
      finalResult.extractionWarning = `模型${failedModel}解析失败，仅使用${failedModel === 'A' ? '模型B' : '模型A'}的数据`
      finalResult.modelResults = {
        modelA: { provider: modelA.provider, companyInfo: resultA.companyInfo, financialMetrics: resultA.financialMetrics, error: !hasAMetrics ? (resultA.error || 'AI响应解析失败') : undefined },
        modelB: { provider: modelB.provider, companyInfo: resultB.companyInfo, financialMetrics: resultB.financialMetrics, error: !hasBMetrics ? (resultB.error || 'AI响应解析失败') : undefined }
      }
      return finalResult
    }

    // 模型B验证（带错误处理）- V1.13: 传递日志服务
    try {
      const validatedResult = await adapterB.validate(resultA, resultB, {
        pdfPath,
        mode: 'dual',
        aiLogService,
        role: 'B-validator'
      })

      const finalResult = validatedResult.finalResult || resultA
      this.cleanTemplateData(finalResult)

      // 添加各模型独立结果（用于前端对比展示）
      finalResult.modelResults = {
        modelA: {
          provider: modelA.provider,
          companyInfo: resultA.companyInfo,
          financialMetrics: resultA.financialMetrics
        },
        modelB: {
          provider: modelB.provider,
          companyInfo: resultB.companyInfo,
          financialMetrics: resultB.financialMetrics
        }
      }

      console.log(`[ExtractionService] Dual model complete: modelA.metrics=${finalResult.modelResults.modelA.financialMetrics?.length || 0}, modelB.metrics=${finalResult.modelResults.modelB.financialMetrics?.length || 0}`)

      return finalResult
    } catch (validateError) {
      console.warn(`[ExtractionService] Dual model validation failed: ${validateError.message}`)
      // 验证失败时，返回第一个模型的结果
      resultA.confidence = 'medium'
      resultA.validationError = validateError.message

      // 添加各模型独立结果
      resultA.modelResults = {
        modelA: {
          provider: modelA.provider,
          companyInfo: resultA.companyInfo,
          financialMetrics: resultA.financialMetrics
        },
        modelB: {
          provider: modelB.provider,
          companyInfo: resultB.companyInfo,
          financialMetrics: resultB.financialMetrics
        }
      }

      console.log(`[ExtractionService] Dual model fallback: modelA.metrics=${resultA.modelResults.modelA.financialMetrics?.length || 0}, modelB.metrics=${resultA.modelResults.modelB.financialMetrics?.length || 0}`)

      return resultA
    }
  }

  /**
   * 三模型提取验证
   * V1.7: 添加日志记录
   */
  async triModelExtract(modelA, modelB, modelC, images, pdfPath) {
    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey, { model: modelA.model })
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey, { model: modelB.model })
    const adapterC = AdapterFactory.createAdapter(modelC.provider, modelC.apiKey, { model: modelC.model })

    // 并行提取 - V1.7: 传递日志服务
    const [resultA, resultB] = await Promise.all([
      adapterA.extract(images, { pdfPath, role: 'A', aiLogService }),
      adapterB.extract(images, { pdfPath, role: 'B', aiLogService })
    ])

    // 清理模板数据
    this.cleanTemplateData(resultA)
    this.cleanTemplateData(resultB)

    // V2.6: 检测单模型解析失败，跳过Model C裁决直接使用成功模型的数据
    const hasAMetrics = resultA.financialMetrics && resultA.financialMetrics.length > 0
    const hasBMetrics = resultB.financialMetrics && resultB.financialMetrics.length > 0

    if (!hasAMetrics && !hasBMetrics) {
      // 两个模型都失败了
      console.error('[ExtractionService] Both models failed to extract data')
      const finalResult = this.mergeResults(resultA, resultB)
      finalResult.confidence = 'low'
      finalResult.extractionMode = 'tri-fallback'
      finalResult.extractionWarning = '两个模型均解析失败，数据不可用'
      finalResult.modelResults = {
        modelA: { provider: modelA.provider, companyInfo: resultA.companyInfo, financialMetrics: resultA.financialMetrics, error: resultA.error },
        modelB: { provider: modelB.provider, companyInfo: resultB.companyInfo, financialMetrics: resultB.financialMetrics, error: resultB.error },
        modelC: { provider: modelC.provider, role: 'validator', skipped: true }
      }
      return finalResult
    }

    if (!hasAMetrics || !hasBMetrics) {
      // 只有一个模型成功，跳过Model C裁决，直接使用成功模型的数据
      const failedModel = !hasAMetrics ? 'A' : 'B'
      const successResult = hasAMetrics ? resultA : resultB
      console.warn(`[ExtractionService] Model ${failedModel} parse failed (0 metrics), using successful model's data directly`)

      const finalResult = JSON.parse(JSON.stringify(successResult))
      this.cleanTemplateData(finalResult)
      finalResult.confidence = 'medium-high'
      finalResult.extractionMode = 'tri-single'
      finalResult.extractionWarning = `模型${failedModel}解析失败（AI响应格式异常），仅使用${failedModel === 'A' ? '模型B' : '模型A'}的数据`

      finalResult.modelResults = {
        modelA: { provider: modelA.provider, companyInfo: resultA.companyInfo, financialMetrics: resultA.financialMetrics, error: !hasAMetrics ? (resultA.error || 'AI响应解析失败') : undefined },
        modelB: { provider: modelB.provider, companyInfo: resultB.companyInfo, financialMetrics: resultB.financialMetrics, error: !hasBMetrics ? (resultB.error || 'AI响应解析失败') : undefined },
        modelC: { provider: modelC.provider, role: 'validator', skipped: true }
      }

      return finalResult
    }

    // 模型C裁决（带错误处理）- V1.13: 传递日志服务
    try {
      const validatedResult = await adapterC.validate(resultA, resultB, {
        pdfPath,
        mode: 'tri',
        aiLogService,
        role: 'C'
      })

      const finalResult = validatedResult.finalResult || resultA

      // 清理最终结果
      this.cleanTemplateData(finalResult)

      // 设置置信度
      finalResult.confidence = validatedResult.confidence || 'high'
      finalResult.comparisons = validatedResult.comparisons
      finalResult.extractionMode = 'tri'

      // 添加各模型独立结果（用于前端对比展示）
      finalResult.modelResults = {
        modelA: {
          provider: modelA.provider,
          companyInfo: resultA.companyInfo,
          financialMetrics: resultA.financialMetrics
        },
        modelB: {
          provider: modelB.provider,
          companyInfo: resultB.companyInfo,
          financialMetrics: resultB.financialMetrics
        },
        modelC: {
          provider: modelC.provider,
          role: 'validator'
        }
      }

      return finalResult
    } catch (validateError) {
      console.warn(`[ExtractionService] Tri model validation failed: ${validateError.message}`)
      // 验证失败时，合并两个模型的结果，优先使用第一个模型
      const finalResult = this.mergeResults(resultA, resultB)
      finalResult.confidence = 'medium'
      finalResult.extractionMode = 'tri-fallback'
      finalResult.validationError = validateError.message

      // 添加各模型独立结果
      finalResult.modelResults = {
        modelA: {
          provider: modelA.provider,
          companyInfo: resultA.companyInfo,
          financialMetrics: resultA.financialMetrics
        },
        modelB: {
          provider: modelB.provider,
          companyInfo: resultB.companyInfo,
          financialMetrics: resultB.financialMetrics
        },
        modelC: {
          provider: modelC.provider,
          role: 'validator',
          error: validateError.message
        }
      }

      return finalResult
    }
  }

  /**
   * 合并两个提取结果（当验证失败时使用）
   */
  mergeResults(resultA, resultB) {
    // 优先使用resultA，对于缺失的字段尝试从resultB补充
    const merged = JSON.parse(JSON.stringify(resultA))

    if (!merged.companyInfo?.name && resultB.companyInfo?.name) {
      merged.companyInfo = resultB.companyInfo
    }

    // 合并财务指标，去重
    if (resultB.financialMetrics) {
      const existingNames = new Set(merged.financialMetrics?.map(m => m.name) || [])
      for (const metric of resultB.financialMetrics) {
        if (!existingNames.has(metric.name)) {
          merged.financialMetrics = merged.financialMetrics || []
          merged.financialMetrics.push(metric)
        }
      }
    }

    return merged
  }

  /**
   * 带勾稽核对的重试提取
   */
  async extractWithAccountingCheck(extractFn, images, pdfPath, models) {
    let result = await extractFn()
    let retryCount = 0

    while (retryCount < this.maxRetries) {
      const accountingResult = this.accountingCheckService.check(result)

      result.accountingCheck = accountingResult

      if (accountingResult.passed) {
        console.log(`[ExtractionService] Accounting check passed`)
        return result
      }

      console.log(`[ExtractionService] Accounting check failed, retry ${retryCount + 1}/${this.maxRetries}`)

      // 重试提取
      retryCount++

      if (retryCount < this.maxRetries) {
        // 使用优化后的提示重新提取
        const adapter = AdapterFactory.createAdapter(models[0].provider, models[0].apiKey)
        result = await adapter.extract(images, {
          pdfPath,
          retryAttempt: retryCount,
          accountingErrors: accountingResult.errors
        })
      }
    }

    // 超过最大重试次数，标记为低置信度
    result.confidence = 'low'
    result.accountingCheck.warning = '勾稽关系核对未通过，已达到最大重试次数，建议人工核对'

    return result
  }
}

export default ExtractionService
