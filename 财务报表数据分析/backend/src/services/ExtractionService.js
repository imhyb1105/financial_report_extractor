import PDFService from './PDFService.js'
import AccountingCheckService from './AccountingCheckService.js'
import UnitConvertService from './UnitConvertService.js'
import AdapterFactory from '../adapters/AdapterFactory.js'

/**
 * 数据提取协调服务
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
   */
  async extract(pdfPath, models, displayUnit = 'wan') {
    console.log(`[ExtractionService] Starting extraction for: ${pdfPath}`)
    console.log(`[ExtractionService] Models: ${models.map(m => m.role).join(', ')}`)
    console.log(`[ExtractionService] Display unit: ${displayUnit}`)

    // 1. PDF转换为图片
    const images = await this.pdfService.convertToImages(pdfPath)
    console.log(`[ExtractionService] Converted ${images.length} pages`)

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

    // 3. 勾稽关系核对（带重试）
    result = await this.extractWithAccountingCheck(
      () => result,
      images,
      pdfPath,
      models
    )

    // 4. 单位转换
    result = this.unitConvertService.convert(result, displayUnit)

    // 5. 添加元数据
    result.metadata = {
      extractedAt: new Date().toISOString(),
      modelCount: models.length,
      extractionMode: models.length === 1 ? 'single' : models.length === 2 ? 'dual' : 'tri',
      displayUnit,
      pdfInfo: {
        path: pdfPath,
        pageCount: images.length
      }
    }

    return result
  }

  /**
   * 单模型提取
   */
  async singleModelExtract(modelConfig, images, pdfPath) {
    const adapter = AdapterFactory.createAdapter(modelConfig.provider, modelConfig.apiKey)

    if (!adapter) {
      throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
    }

    const result = await adapter.extract(images, {
      pdfPath,
      mode: 'single'
    })

    // 单模型模式下，置信度可能较低
    if (result.financialMetrics) {
      result.financialMetrics.forEach(metric => {
        if (metric.confidence === 'high') {
          metric.confidence = 'medium'
        }
      })
    }

    result.confidence = 'medium'
    result.extractionMode = 'single'

    return result
  }

  /**
   * 双模型提取
   */
  async dualModelExtract(modelA, modelB, images, pdfPath) {
    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey)
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey)

    // 并行提取
    const [resultA, resultB] = await Promise.all([
      adapterA.extract(images, { pdfPath, role: 'A' }),
      adapterB.extract(images, { pdfPath, role: 'B' })
    ])

    // 模型B验证
    const validatedResult = await adapterB.validate(resultA, resultB, {
      pdfPath,
      mode: 'dual'
    })

    return validatedResult.finalResult || resultA
  }

  /**
   * 三模型提取验证
   */
  async triModelExtract(modelA, modelB, modelC, images, pdfPath) {
    const adapterA = AdapterFactory.createAdapter(modelA.provider, modelA.apiKey)
    const adapterB = AdapterFactory.createAdapter(modelB.provider, modelB.apiKey)
    const adapterC = AdapterFactory.createAdapter(modelC.provider, modelC.apiKey)

    // 并行提取
    const [resultA, resultB] = await Promise.all([
      adapterA.extract(images, { pdfPath, role: 'A' }),
      adapterB.extract(images, { pdfPath, role: 'B' })
    ])

    // 模型C裁决
    const validatedResult = await adapterC.validate(resultA, resultB, {
      pdfPath,
      mode: 'tri'
    })

    const finalResult = validatedResult.finalResult || resultA

    // 设置置信度
    finalResult.confidence = validatedResult.confidence || 'high'
    finalResult.comparisons = validatedResult.comparisons
    finalResult.extractionMode = 'tri'

    return finalResult
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
