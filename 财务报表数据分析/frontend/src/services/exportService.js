import * as XLSX from 'xlsx'

// 比率类型指标关键词（V2.8: 新增ROE）
const RATIO_KEYWORDS = ['率', '比例', '占比', '比率', 'ROE', 'ROA']

// 检查是否为比率类型指标
function isRatioMetric(name) {
  if (!name) return false
  return RATIO_KEYWORDS.some(keyword => name.includes(keyword))
}

// 格式化导出值（比率显示为百分比）
function formatExportValue(value, metricName) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'number') return value

  if (isRatioMetric(metricName)) {
    const percentValue = value > 1 ? value : value * 100
    return `${percentValue.toFixed(2)}%`
  }

  // 大数字添加千分位
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

// 设置列宽
function setColumnWidths(sheet, widths) {
  sheet['!cols'] = widths.map(w => ({ wch: w }))
}

export function exportToExcel(result, displayUnit) {
  const workbook = XLSX.utils.book_new()
  const hasModelComparison = result.modelResults && (result.modelResults.modelA || result.modelResults.modelB)

  // ========== Sheet 1: 公司信息概览 ==========
  const companyOverviewData = [
    { '项目': '公司名称', '内容': result.companyInfo?.name || '' },
    { '项目': '股票代码', '内容': result.companyInfo?.stockCode || '' },
    { '项目': '报告期间', '内容': result.companyInfo?.reportPeriod || '' },
    { '项目': '报告日期', '内容': result.companyInfo?.reportDate || '' },
    { '项目': '提取时间', '内容': result.metadata?.extractedAt ? new Date(result.metadata.extractedAt).toLocaleString('zh-CN') : '' },
    { '项目': '提取模式', '内容': getExtractionModeText(result.metadata?.extractionMode) },
    { '项目': '整体置信度', '内容': getConfidenceText(result.confidence) },
    { '项目': '置信度说明', '内容': result.confidenceReason || '' }
  ]
  const companyOverviewSheet = XLSX.utils.json_to_sheet(companyOverviewData)
  setColumnWidths(companyOverviewSheet, [15, 50])
  XLSX.utils.book_append_sheet(workbook, companyOverviewSheet, '概览')

  // ========== Sheet 2: 核心财务指标 ==========
  const financialData = result.financialMetrics?.map(metric => {
    const row = {
      '指标名称': metric.name,
      '数值': formatExportValue(metric.value, metric.name),
      '单位': isRatioMetric(metric.name) ? '%' : (metric.displayUnit || metric.unit || displayUnit),
      '置信度': getConfidenceText(metric.confidence),
      '来源页码': metric.source?.page || '',
      '来源位置': metric.source?.location || ''
    }

    // 如果有模型对比数据，添加各模型列
    if (hasModelComparison) {
      if (result.modelResults.modelA) {
        const modelAMetric = result.modelResults.modelA.financialMetrics?.find(m => m.name === metric.name)
        row[`${result.modelResults.modelA.provider?.toUpperCase() || '模型A'}`] = formatExportValue(modelAMetric?.value, metric.name)
      }
      if (result.modelResults.modelB) {
        const modelBMetric = result.modelResults.modelB.financialMetrics?.find(m => m.name === metric.name)
        row[`${result.modelResults.modelB.provider?.toUpperCase() || '模型B'}`] = formatExportValue(modelBMetric?.value, metric.name)
      }
    }

    return row
  }) || []

  const financialSheet = XLSX.utils.json_to_sheet(financialData)
  setColumnWidths(financialSheet, [20, 18, 8, 10, 10, 25])
  XLSX.utils.book_append_sheet(workbook, financialSheet, '财务指标')

  // ========== Sheet 3: 勾稽核对结果 ==========
  if (result.accountingCheck?.checks) {
    const accountingData = result.accountingCheck.checks.map(check => ({
      '检查项': check.name,
      '公式': check.formula,
      '状态': check.status === 'pass' ? '✓ 通过' : check.status === 'warning' ? '⚠ 警告' : '✗ 失败',
      '差异': check.differencePercent ? `${check.differencePercent.toFixed(2)}%` : '-',
      '说明': check.note || ''
    }))

    // 添加汇总行
    if (result.accountingCheck.summary) {
      accountingData.push({})
      accountingData.push({
        '检查项': '汇总',
        '公式': '',
        '状态': `通过 ${result.accountingCheck.summary.passed}/${result.accountingCheck.summary.total}`,
        '差异': '',
        '说明': result.accountingCheck.summary.warnings > 0 ? `存在 ${result.accountingCheck.summary.warnings} 项警告` : '全部检查通过'
      })
    }

    const accountingSheet = XLSX.utils.json_to_sheet(accountingData)
    setColumnWidths(accountingSheet, [18, 30, 12, 12, 40])
    XLSX.utils.book_append_sheet(workbook, accountingSheet, '勾稽核对')
  }

  // ========== Sheet 4: 非财务信息 ==========
  const nonFinancialData = []

  // 添加报告类型
  if (result.nonFinancialInfo?.reportType) {
    nonFinancialData.push({
      '类别': '报告类型',
      '状态': '',
      '内容': result.nonFinancialInfo.reportType === 'quarterly' ? '季度报告' : '年度报告',
      '来源页码': '',
      '备注': ''
    })
    nonFinancialData.push({}) // 空行分隔
  }

  if (result.nonFinancialInfo) {
    const categories = ['riskFactors', 'majorEvents', 'futurePlans', 'dividendPlan']

    categories.forEach(key => {
      const value = result.nonFinancialInfo[key]
      if (!value) return

      // V2.8: 支持新格式 {status, items, hint}
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.status) {
          // 添加类别标题行
          nonFinancialData.push({
            '类别': `【${getNonFinancialTitle(key)}】`,
            '状态': getNonFinancialStatus(value.status),
            '内容': '',
            '来源页码': '',
            '备注': value.hint || ''
          })

          // 添加 items
          if (Array.isArray(value.items) && value.items.length > 0) {
            value.items.forEach((item, idx) => {
              nonFinancialData.push({
                '类别': `  ${idx + 1}`,
                '状态': '',
                '内容': item.content || (typeof item === 'string' ? item : ''),
                '来源页码': item.source?.page || '',
                '备注': item.source?.location || ''
              })
            })
          } else if (value.status === 'not_in_report' || value.status === 'not_found') {
            nonFinancialData.push({
              '类别': '  -',
              '状态': '',
              '内容': '(无内容)',
              '来源页码': '',
              '备注': value.hint || ''
            })
          }

          nonFinancialData.push({}) // 空行分隔
        } else if (value.content !== undefined) {
          // 单个对象（如 dividendPlan 旧格式）
          nonFinancialData.push({
            '类别': `【${getNonFinancialTitle(key)}】`,
            '状态': '',
            '内容': value.content || '',
            '来源页码': value.source?.page || '',
            '备注': value.source?.location || (value.hint || '')
          })
          nonFinancialData.push({}) // 空行分隔
        }
      } else if (Array.isArray(value) && value.length > 0) {
        // 旧格式：数组
        nonFinancialData.push({
          '类别': `【${getNonFinancialTitle(key)}】`,
          '状态': '已找到',
          '内容': '',
          '来源页码': '',
          '备注': ''
        })
        value.forEach((item, idx) => {
          const isObject = typeof item === 'object'
          nonFinancialData.push({
            '类别': `  ${idx + 1}`,
            '状态': '',
            '内容': isObject ? item.content : item,
            '来源页码': isObject ? (item.source?.page || '') : '',
            '备注': isObject ? (item.source?.location || '') : ''
          })
        })
        nonFinancialData.push({}) // 空行分隔
      }
    })
  }

  if (nonFinancialData.length > 0) {
    const nonFinancialSheet = XLSX.utils.json_to_sheet(nonFinancialData)
    setColumnWidths(nonFinancialSheet, [15, 12, 60, 10, 30])
    XLSX.utils.book_append_sheet(workbook, nonFinancialSheet, '非财务信息')
  }

  // ========== Sheet 5: 提取统计 ==========
  if (result.usage) {
    const usageData = [
      { '项目': '总耗时', '内容': result.usage.formattedDuration || `${result.usage.totalDuration}ms` },
      { '项目': '总Token消耗', '内容': result.usage.totalTokens?.toLocaleString() || '-' }
    ]

    if (result.usage.breakdown) {
      if (result.usage.breakdown.modelA) usageData.push({ '项目': '模型A Token', '内容': result.usage.breakdown.modelA.toLocaleString() })
      if (result.usage.breakdown.modelB) usageData.push({ '项目': '模型B Token', '内容': result.usage.breakdown.modelB.toLocaleString() })
      if (result.usage.breakdown.modelC) usageData.push({ '项目': '模型C Token', '内容': result.usage.breakdown.modelC.toLocaleString() })
    }

    const usageSheet = XLSX.utils.json_to_sheet(usageData)
    setColumnWidths(usageSheet, [18, 20])
    XLSX.utils.book_append_sheet(workbook, usageSheet, '提取统计')
  }

  // 导出文件
  const fileName = `${result.companyInfo?.name || '财务报表'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

// 获取置信度文本
function getConfidenceText(confidence) {
  if (typeof confidence === 'number') {
    const map = { 5: '★★★★★ 高', 4: '★★★★☆ 中高', 3: '★★★☆☆ 中', 2: '★★☆☆☆ 中低', 1: '★☆☆☆☆ 低' }
    return map[confidence] || '★★★☆☆ 中'
  }
  const map = { 'high': '★★★★★ 高', 'medium-high': '★★★★☆ 中高', 'medium': '★★★☆☆ 中', 'medium-low': '★★☆☆☆ 中低', 'low': '★☆☆☆☆ 低' }
  return map[confidence] || '★★★☆☆ 中'
}

// 获取提取模式文本
function getExtractionModeText(mode) {
  const map = {
    'single': '单模型提取',
    'dual': '双模型交叉验证',
    'tri': '三模型裁决验证',
    'dual-single': '双模型(单模型有效)',
    'tri-single': '三模型(单模型有效)'
  }
  return map[mode] || mode || '-'
}

function getNonFinancialTitle(key) {
  const titles = {
    riskFactors: '风险提示',
    majorEvents: '重大事项',
    futurePlans: '未来规划',
    dividendPlan: '分红方案',
    businessOverview: '业务概述',
    reportType: '报告类型'
  }
  return titles[key] || key
}

// V2.8: 获取非财务信息状态文本
function getNonFinancialStatus(status) {
  const statusMap = {
    'found': '✓ 已找到',
    'partial': '◐ 部分提取',
    'not_in_report': '○ 报告未包含',
    'not_found': '✗ 未找到'
  }
  return statusMap[status] || status
}
