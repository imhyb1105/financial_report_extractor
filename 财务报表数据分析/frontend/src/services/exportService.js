import * as XLSX from 'xlsx'

export function exportToExcel(result, displayUnit) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: 核心财务指标
  const financialData = result.financialMetrics?.map(metric => ({
    '指标名称': metric.name,
    '数值': metric.value,
    '单位': metric.unit || displayUnit,
    '原始单位': metric.originalUnit || '',
    '置信度': metric.confidence === 'high' ? '高' : metric.confidence === 'medium' ? '中' : '低',
    '来源页码': metric.source?.page || '',
    '来源位置': metric.source?.location || ''
  })) || []

  const financialSheet = XLSX.utils.json_to_sheet(financialData)
  XLSX.utils.book_append_sheet(workbook, financialSheet, '核心财务指标')

  // Sheet 2: 非财务信息
  const nonFinancialData = []
  if (result.nonFinancialInfo) {
    Object.entries(result.nonFinancialInfo).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          nonFinancialData.push({
            '类别': getNonFinancialTitle(key),
            '序号': idx + 1,
            '内容': typeof item === 'object' ? item.content : item
          })
        })
      } else {
        nonFinancialData.push({
          '类别': getNonFinancialTitle(key),
          '序号': 1,
          '内容': value
        })
      }
    })
  }

  if (nonFinancialData.length > 0) {
    const nonFinancialSheet = XLSX.utils.json_to_sheet(nonFinancialData)
    XLSX.utils.book_append_sheet(workbook, nonFinancialSheet, '非财务信息')
  }

  // Sheet 3: 勾稽核对结果
  if (result.accountingCheck?.checks) {
    const accountingData = result.accountingCheck.checks.map(check => ({
      '检查项': check.name,
      '公式': check.formula,
      '状态': check.status === 'pass' ? '通过' : check.status === 'warning' ? '警告' : '失败',
      '差异百分比': check.differencePercent ? `${check.differencePercent.toFixed(2)}%` : '',
      '建议': check.suggestion || ''
    }))

    const accountingSheet = XLSX.utils.json_to_sheet(accountingData)
    XLSX.utils.book_append_sheet(workbook, accountingSheet, '勾稽核对')
  }

  // Sheet 4: 公司信息
  const companyData = [
    { '项目': '公司名称', '内容': result.companyInfo?.name || '' },
    { '项目': '股票代码', '内容': result.companyInfo?.stockCode || '' },
    { '项目': '报告期间', '内容': result.companyInfo?.reportPeriod || '' },
    { '项目': '报告日期', '内容': result.companyInfo?.reportDate || '' }
  ]
  const companySheet = XLSX.utils.json_to_sheet(companyData)
  XLSX.utils.book_append_sheet(workbook, companySheet, '公司信息')

  // 导出文件
  const fileName = `${result.companyInfo?.name || '财务报表'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

function getNonFinancialTitle(key) {
  const titles = {
    riskFactors: '风险提示',
    majorEvents: '重大事项',
    futurePlans: '未来规划',
    dividendPlan: '分红方案',
    businessOverview: '业务概述'
  }
  return titles[key] || key
}
