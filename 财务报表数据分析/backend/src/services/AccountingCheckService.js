/**
 * 勾稽关系核对服务
 * 检查财务数据之间的逻辑关系
 */
class AccountingCheckService {
  constructor() {
    // 勾稽检查规则
    this.rules = [
      {
        name: '资产负债表平衡',
        formula: '总资产 = 总负债 + 净资产',
        check: (data) => {
          const totalAssets = this.getMetricValue(data, '总资产')
          const totalLiabilities = this.getMetricValue(data, '总负债')
          const netAssets = this.getMetricValue(data, '净资产')

          if (!totalAssets || !totalLiabilities || !netAssets) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const expected = totalLiabilities + netAssets
          const diff = Math.abs(totalAssets - expected)
          const diffPercent = (diff / totalAssets) * 100

          return {
            passed: diffPercent <= 1,
            status: diffPercent <= 0.01 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: totalAssets,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            suggestion: diffPercent > 0.01
              ? `差异${diffPercent.toFixed(2)}%，可能是四舍五入导致`
              : '完全平衡'
          }
        },
        priority: 0
      },
      {
        name: '毛利润计算',
        formula: '毛利润 = 营业收入 - 营业成本',
        check: (data) => {
          const revenue = this.getMetricValue(data, '营业收入')
          const cost = this.getMetricValue(data, '营业成本')
          const grossProfit = this.getMetricValue(data, '毛利润')

          if (!revenue || !cost) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const expected = revenue - cost
          const diff = grossProfit ? Math.abs(grossProfit - expected) : 0
          const diffPercent = grossProfit ? (diff / expected) * 100 : 0

          return {
            passed: !grossProfit || diffPercent <= 1,
            status: !grossProfit ? 'warning' : diffPercent <= 0.01 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: grossProfit,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            suggestion: grossProfit ? '毛利润计算正确' : '未提取毛利润，建议补充'
          }
        },
        priority: 0
      },
      {
        name: '流动资产校验',
        formula: '流动资产 ≤ 总资产',
        check: (data) => {
          const currentAssets = this.getMetricValue(data, '流动资产')
          const totalAssets = this.getMetricValue(data, '总资产')

          if (!currentAssets || !totalAssets) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const passed = currentAssets <= totalAssets

          return {
            passed,
            status: passed ? 'pass' : 'fail',
            leftSide: currentAssets,
            rightSide: totalAssets,
            difference: currentAssets - totalAssets,
            differencePercent: ((currentAssets - totalAssets) / totalAssets) * 100,
            tolerance: 0,
            suggestion: passed ? '逻辑正确' : '流动资产不应超过总资产'
          }
        },
        priority: 1
      },
      {
        name: '流动负债校验',
        formula: '流动负债 ≤ 总负债',
        check: (data) => {
          const currentLiabilities = this.getMetricValue(data, '流动负债')
          const totalLiabilities = this.getMetricValue(data, '总负债')

          if (!currentLiabilities || !totalLiabilities) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const passed = currentLiabilities <= totalLiabilities

          return {
            passed,
            status: passed ? 'pass' : 'fail',
            leftSide: currentLiabilities,
            rightSide: totalLiabilities,
            difference: currentLiabilities - totalLiabilities,
            differencePercent: ((currentLiabilities - totalLiabilities) / totalLiabilities) * 100,
            tolerance: 0,
            suggestion: passed ? '逻辑正确' : '流动负债不应超过总负债'
          }
        },
        priority: 1
      },
      {
        name: '资产负债率计算',
        formula: '资产负债率 = 总负债 / 总资产',
        check: (data) => {
          const totalLiabilities = this.getMetricValue(data, '总负债')
          const totalAssets = this.getMetricValue(data, '总资产')
          const debtRatio = this.getMetricValue(data, '资产负债率')

          if (!totalLiabilities || !totalAssets) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const expected = totalLiabilities / totalAssets
          const expectedPercent = expected * 100

          if (!debtRatio) {
            return {
              passed: true,
              status: 'warning',
              note: '未提取资产负债率',
              suggestion: `建议补充资产负债率: ${(expectedPercent).toFixed(2)}%`
            }
          }

          // debtRatio可能是小数或百分比
          const ratioValue = debtRatio > 1 ? debtRatio / 100 : debtRatio
          const diff = Math.abs(ratioValue - expected)
          const diffPercent = diff * 100

          return {
            passed: diffPercent <= 1,
            status: diffPercent <= 0.1 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: ratioValue,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            suggestion: `计算值: ${(expectedPercent).toFixed(2)}%`
          }
        },
        priority: 2
      }
    ]
  }

  /**
   * 执行勾稽关系核对
   * @param {Object} data - 提取的财务数据
   * @returns {Object} 核对结果
   */
  check(data) {
    const checks = []
    let allPassed = true

    for (const rule of this.rules.sort((a, b) => a.priority - b.priority)) {
      try {
        const result = rule.check(data)

        checks.push({
          name: rule.name,
          formula: rule.formula,
          ...result
        })

        if (!result.passed) {
          allPassed = false
        }
      } catch (error) {
        checks.push({
          name: rule.name,
          formula: rule.formula,
          passed: true,
          status: 'warning',
          note: `检查出错: ${error.message}`
        })
      }
    }

    return {
      passed: allPassed,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: checks.filter(c => c.status === 'warning').length,
        failed: checks.filter(c => c.status === 'fail').length
      }
    }
  }

  /**
   * 获取指标值
   */
  getMetricValue(data, name) {
    if (!data.financialMetrics) return null

    const metric = data.financialMetrics.find(m =>
      m.name === name || m.name.includes(name) || name.includes(m.name)
    )

    return metric ? metric.value : null
  }

  /**
   * 生成重试提示
   */
  generateRetryPrompt(accountingErrors) {
    const failedChecks = accountingErrors.checks.filter(c => !c.passed)

    if (failedChecks.length === 0) {
      return ''
    }

    return `

【重要】之前提取的数据存在以下勾稽关系问题，请特别注意：

${failedChecks.map(check => `
- ${check.name}（${check.formula}）
  问题：${check.suggestion}
`).join('\n')}

请确保重新提取的数据满足这些关系。`
  }
}

export default AccountingCheckService
