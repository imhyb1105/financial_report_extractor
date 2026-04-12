/**
 * 单位转换服务
 * 处理元/万元/亿元之间的转换
 * V2.14: 扩展单位映射，支持百万元/千元等中国上市公司年报常见单位
 */
class UnitConvertService {
  constructor() {
    // 转换系数（转换为元）
    // V2.14: 扩展为完整的中国财务报表单位映射
    this.toYuan = {
      // 标准代码（原有，保持不变）
      yuan: 1,
      wan: 10000,
      yi: 100000000,

      // V2.15: AI模型常见的拼音单位误用
      baiwan: 1000000,      // "百万元"的拼音，MiniMax模型常见
      qianwan: 10000000,    // "千万元"的拼音
      shiwan: 100000,       // "十万元"的拼音
      qian: 1000,           // "千元"的拼音（补充）

      // V2.14: 中国上市公司年报常见单位名称
      '元': 1,
      '万元': 10000,
      '亿元': 100000000,
      '百万元': 1000000,
      '千元': 1000,
      '十万元': 100000,
      '千万元': 10000000,
      '万': 10000,
      '亿': 100000000,
      '百万': 1000000,
      '千': 1000,
      '十': 10,
      '百': 100
    }

    // 标准单位名称映射（用于显示）
    this.unitNames = {
      yuan: '元',
      wan: '万元',
      yi: '亿元'
    }

    // V2.14: 单位中文显示名映射（用于"原单位"显示）
    this.unitDisplayNames = {
      yuan: '元',
      wan: '万元',
      yi: '亿元',
      '元': '元',
      '万元': '万元',
      '亿元': '亿元',
      '百万元': '百万元',
      '千元': '千元',
      '十万元': '十万元',
      '千万元': '千万元',
      '万': '万',
      '亿': '亿',
      '百万': '百万',
      '千': '千',
      // V2.15: 拼音单位显示名
      baiwan: '百万元',
      qianwan: '千万元',
      shiwan: '十万元'
    }

    // 不需要转换的指标类型
    this.ratioMetrics = ['毛利率', '净利率', '资产负债率', 'ROE', '流动比率']
  }

  /**
   * V2.14: 获取单位的转换系数，带NaN防护
   * @param {string} unit - 单位代码或名称
   * @returns {number} 转换到元的系数，未知单位时使用智能识别，最终后备为1
   */
  getConversionFactor(unit) {
    // 1. 直接查找已知映射
    if (this.toYuan[unit] !== undefined) {
      return this.toYuan[unit]
    }

    // 2. 智能识别后备（基于文字内容推断）
    const detected = this.detectUnit(unit)
    if (this.toYuan[detected] !== undefined) {
      console.warn(`[UnitConvertService] Unknown unit "${unit}", detected as "${detected}"`)
      return this.toYuan[detected]
    }

    // 3. 最终后备：视为元（系数=1，不改变值）
    console.warn(`[UnitConvertService] Unrecognized unit "${unit}", defaulting to yuan (factor=1)`)
    return 1
  }

  /**
   * V2.14: 获取单位中文显示名
   * @param {string} unit - 单位代码或名称
   * @returns {string} 中文显示名
   */
  getUnitDisplayName(unit) {
    return this.unitDisplayNames[unit] || this.unitNames[unit] || unit || '元'
  }

  /**
   * 转换数据到指定单位
   * @param {Object} data - 提取的数据
   * @param {string} targetUnit - 目标单位 (yuan/wan/yi)
   */
  convert(data, targetUnit) {
    if (!data || !targetUnit) return data

    const result = { ...data }

    // 转换财务指标
    if (result.financialMetrics) {
      result.financialMetrics = result.financialMetrics.map(metric => {
        // 比率类指标不转换
        if (this.isRatioMetric(metric.name)) {
          return metric
        }

        const originalUnit = metric.unit || 'yuan'
        const originalValue = metric.value

        if (originalValue === null || originalValue === undefined) {
          return metric
        }

        // V2.14: 使用 getConversionFactor 带 NaN 防护
        const fromFactor = this.getConversionFactor(originalUnit)
        const toFactor = this.getConversionFactor(targetUnit)

        // 先转换为元，再转换为目标单位
        const valueInYuan = originalValue * fromFactor
        const convertedValue = valueInYuan / toFactor

        return {
          ...metric,
          value: convertedValue,
          originalUnit: this.getUnitDisplayName(originalUnit),
          unit: targetUnit,
          displayUnit: this.unitNames[targetUnit]
        }
      })
    }

    // 转换模型对比数据中的财务指标
    if (result.modelResults) {
      result.modelResults = { ...result.modelResults }

      if (result.modelResults.modelA) {
        result.modelResults.modelA = {
          ...result.modelResults.modelA,
          financialMetrics: this.convertMetrics(result.modelResults.modelA.financialMetrics, targetUnit)
        }
      }

      if (result.modelResults.modelB) {
        result.modelResults.modelB = {
          ...result.modelResults.modelB,
          financialMetrics: this.convertMetrics(result.modelResults.modelB.financialMetrics, targetUnit)
        }
      }
    }

    // 记录单位信息
    result.unitInfo = {
      displayUnit: targetUnit,
      displayUnitName: this.unitNames[targetUnit]
    }

    return result
  }

  /**
   * 转换财务指标数组
   * @param {Array} metrics - 财务指标数组
   * @param {string} targetUnit - 目标单位
   */
  convertMetrics(metrics, targetUnit) {
    if (!metrics || !Array.isArray(metrics)) return metrics

    return metrics.map(metric => {
      // 比率类指标不转换
      if (this.isRatioMetric(metric.name)) {
        return metric
      }

      const originalUnit = metric.unit || 'yuan'
      const originalValue = metric.value

      if (originalValue === null || originalValue === undefined) {
        return metric
      }

      // V2.14: 使用 getConversionFactor 带 NaN 防护
      const fromFactor = this.getConversionFactor(originalUnit)
      const toFactor = this.getConversionFactor(targetUnit)

      // 先转换为元，再转换为目标单位
      const valueInYuan = originalValue * fromFactor
      const convertedValue = valueInYuan / toFactor

      return {
        ...metric,
        value: convertedValue,
        unit: targetUnit
      }
    })
  }

  /**
   * 检查是否为比率类指标
   */
  isRatioMetric(name) {
    return this.ratioMetrics.some(r => name.includes(r))
  }

  /**
   * 格式化数值
   */
  formatValue(value, unit) {
    if (value === null || value === undefined) return '-'

    const options = {
      yuan: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      wan: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      yi: { minimumFractionDigits: 2, maximumFractionDigits: 4 }
    }

    return value.toLocaleString('zh-CN', options[unit] || options.wan)
  }

  /**
   * 智能识别原始单位
   */
  detectUnit(text) {
    if (!text) return 'yuan'

    const lowerText = text.toLowerCase()

    if (lowerText.includes('亿') || lowerText.includes('yi')) {
      return 'yi'
    }
    if (lowerText.includes('万') || lowerText.includes('wan')) {
      return 'wan'
    }
    return 'yuan'
  }

  /**
   * 批量转换
   */
  convertBatch(values, fromUnit, toUnit) {
    const fromFactor = this.getConversionFactor(fromUnit)
    const toFactor = this.getConversionFactor(toUnit)

    return values.map(v => {
      if (v === null || v === undefined) return null
      return (v * fromFactor) / toFactor
    })
  }
}

export default UnitConvertService
