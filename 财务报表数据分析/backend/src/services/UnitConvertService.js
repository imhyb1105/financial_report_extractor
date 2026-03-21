/**
 * 单位转换服务
 * 处理元/万元/亿元之间的转换
 */
class UnitConvertService {
  constructor() {
    // 转换系数（转换为元）
    this.toYuan = {
      yuan: 1,
      wan: 10000,
      yi: 100000000
    }

    // 单位名称映射
    this.unitNames = {
      yuan: '元',
      wan: '万元',
      yi: '亿元'
    }

    // 不需要转换的指标类型
    this.ratioMetrics = ['毛利率', '净利率', '资产负债率', 'ROE', '流动比率']
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

        // 先转换为元
        const valueInYuan = originalValue * this.toYuan[originalUnit]

        // 再转换为目标单位
        const convertedValue = valueInYuan / this.toYuan[targetUnit]

        return {
          ...metric,
          value: convertedValue,
          originalUnit: this.unitNames[originalUnit],
          unit: targetUnit,
          displayUnit: this.unitNames[targetUnit]
        }
      })
    }

    // 记录单位信息
    result.unitInfo = {
      displayUnit: targetUnit,
      displayUnitName: this.unitNames[targetUnit]
    }

    return result
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
    const fromFactor = this.toYuan[fromUnit]
    const toFactor = this.toYuan[toUnit]

    return values.map(v => {
      if (v === null || v === undefined) return null
      return (v * fromFactor) / toFactor
    })
  }
}

export default UnitConvertService
