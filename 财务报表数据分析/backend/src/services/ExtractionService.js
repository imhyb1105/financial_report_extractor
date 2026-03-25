import PDFService from './PDFService.js'
import AccountingCheckService from './AccountingCheckService.js'
import UnitConvertService from './UnitConvertService.js'
import AdapterFactory from '../adapters/AdapterFactory.js'
import aiLogService from './AILogService.js'

/**
 * 数据提取协调服务
 * V1.7: 集成AI日志服务，支持调试日志输出
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

    // V1.7: 开始日志会话
    const sessionId = aiLogService.startSession()

    // 1. PDF转换为图片（同时获取完整文本用于验证）
    const pdfResult = await this.pdfService.convertToImages(pdfPath)
    const images = pdfResult.pages
    const pdfFullText = pdfResult.fullText
    console.log(`[ExtractionService] Converted ${images.length} pages, text length: ${pdfFullText.length}`)

    // 2. 根据模型数量选择提取策略
    let result
    const retryCount = 0

    if (models.length === 1) {
      // 单模型模式
      result = await this.singleModelExtract(models[0], images, pdfPath)
    } else if (models.length === 2) {
      // 双模型模式
      result = await this.dualModelExtract(models[0], models[1], images, pdfPath)
    } else {
      // 三模型验证模式
      result = await this.triModelExtract(models[0], models[1], models[2], images, pdfPath)
    }

    // 3. 模拟数据检测与验证
    const mockDataCheck = this.detectMockData(result, pdfFullText)
    if (mockDataCheck.isMockData) {
      console.warn(`[ExtractionService] Mock data detected: ${mockDataCheck.reasons.join(', ')}`)
      result.extractionWarning = `检测到可能的模拟数据: ${mockDataCheck.reasons.join('; ')}`
      result.confidence = 'low'
    }

    // 4. 勾稽关系核对（带重试）
    result = await this.extractWithAccountingCheck(
      () => result,
      images,
      pdfPath,
      models
    )

    // V1.12: 根据勾稽核对结果修正置信度
    result = this.adjustConfidenceBasedOnResults(result, models.length)

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

    return {
      data: result,
      debugLog
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
        adjustment = 0 // 完美通过，不调整
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
    const adapter = AdapterFactory.createAdapter(modelConfig.provider, modelConfig.apiKey)

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
   * 检测模拟数据
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
      if (!isPlaceholder && !pdfFullText.includes(companyName)) {
        reasons.push(`公司名称 "${companyName}" 不在PDF原文中`)
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
    if (result.financialMetrics && pdfFullText) {
      let unmatchedCount = 0
      const checkedValues = []
      const significantMetrics = result.financialMetrics.filter(m =>
        m.value !== null &&
        m.value !== undefined &&
        Math.abs(m.value) > 1000000 // 只检查大数值
      )

      for (const metric of significantMetrics.slice(0, 8)) { // 检查前8个大数值
        // 提取数值的主要部分（去掉小数点，用于在PDF中搜索）
        const valueStr = String(Math.abs(metric.value))
        const mainPart = valueStr.split('.')[0] // 取整数部分

        // 跳过太短的数字
        if (mainPart.length < 4) continue

        // 在PDF中搜索这个数值
        // 尝试多种格式：带逗号、不带逗号、带空格
        const searchPatterns = [
          mainPart,
          mainPart.replace(/\B(?=(\d{3})+(?!\d))/g, ','), // 添加千位分隔符
          mainPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')  // 空格分隔
        ]

        let found = false
        for (const pattern of searchPatterns) {
          if (pdfFullText.includes(pattern)) {
            found = true
            break
          }
        }

        if (!found) {
          unmatchedCount++
          checkedValues.push(mainPart)
        }
      }

      // 如果多个大数值都找不到，可能是模拟数据
      if (unmatchedCount >= 3 && significantMetrics.length >= 3) {
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
   * 双模型提取
   * V1.7: 添加日志记录
   */
  async dualModelExtract(modelA, modelB, images, pdfPath) {
    console.log(`[ExtractionService] Starting dual model extraction`)
    console.log(`[ExtractionService] Model A: ${modelA.provider}`)
    console.log(`[ExtractionService] Model B: ${modelB.provider}`)

    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey)
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey)

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
    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey)
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey)
    const adapterC = AdapterFactory.createAdapter(modelC.provider, modelC.apiKey)

    // 并行提取 - V1.7: 传递日志服务
    const [resultA, resultB] = await Promise.all([
      adapterA.extract(images, { pdfPath, role: 'A', aiLogService }),
      adapterB.extract(images, { pdfPath, role: 'B', aiLogService })
    ])

    // 清理模板数据
    this.cleanTemplateData(resultA)
    this.cleanTemplateData(resultB)

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
