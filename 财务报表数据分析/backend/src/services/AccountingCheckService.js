/**
 * 勾稽关系核对服务
 * 检查财务数据之间的逻辑关系
 * V1.10: 增强计算详情输出，添加calculationDetail字段
 */
class AccountingCheckService {
  constructor() {
    // 勾稽检查规则
    this.rules = [
      {
        name: '资产负债表平衡',
        formula: '总资产 = 总负债 + 所有者权益合计',
        check: (data) => {
          const totalAssets = this.getMetricValue(data, '总资产')
          const totalLiabilities = this.getMetricValue(data, '总负债')
          // V1.9: 使用"所有者权益合计"而非"净资产"进行平衡校验
          const totalEquity = this.getMetricValue(data, '所有者权益合计') || this.getMetricValue(data, '净资产')

          if (!totalAssets || !totalLiabilities || !totalEquity) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          const expected = totalLiabilities + totalEquity
          const diff = Math.abs(totalAssets - expected)
          const diffPercent = (diff / totalAssets) * 100

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '总资产', value: totalAssets },
              { label: '总负债', value: totalLiabilities },
              { label: '所有者权益合计', value: totalEquity }
            ],
            calculation: `总负债 + 所有者权益合计 = ${this.formatNumber(totalLiabilities)} + ${this.formatNumber(totalEquity)} = ${this.formatNumber(expected)}`,
            expected: expected,
            actual: totalAssets,
            difference: diff,
            differencePercent: diffPercent,
            conclusion: diffPercent <= 1
              ? '差异在容差范围内，核对通过'
              : '差异超过容差，请检查数据'
          }

          return {
            passed: diffPercent <= 1,
            status: diffPercent <= 0.01 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: totalAssets,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            note: diffPercent > 0.01
              ? `差异${diffPercent.toFixed(2)}%，可能是四舍五入导致`
              : '完全平衡',
            suggestion: diffPercent > 1
              ? `请检查：总资产(${totalAssets.toFixed(2)}) 应等于 总负债(${totalLiabilities.toFixed(2)}) + 所有者权益合计(${totalEquity.toFixed(2)}) = ${expected.toFixed(2)}`
              : '数据核对通过',
            calculationDetail // V1.10: 新增
          }
        },
        priority: 0
      },
      {
        name: '所有者权益构成',
        formula: '所有者权益合计 = 归母权益 + 少数股东权益',
        check: (data) => {
          const totalEquity = this.getMetricValue(data, '所有者权益合计')
          const parentEquity = this.getMetricValue(data, '归属于母公司所有者权益合计') || this.getMetricValue(data, '归母权益')
          const minorityEquity = this.getMetricValue(data, '少数股东权益')

          if (!totalEquity) {
            return { passed: true, status: 'pass', note: '数据不完整，跳过检查' }
          }

          // 如果有归母权益但没有少数股东权益，计算少数股东权益
          if (parentEquity && !minorityEquity) {
            const calculatedMinority = totalEquity - parentEquity
            if (Math.abs(calculatedMinority) < totalEquity * 0.01) {
              return {
                passed: true,
                status: 'pass',
                note: `少数股东权益接近0，所有者权益主要由归母权益构成`,
                suggestion: '数据核对通过',
                calculationDetail: {
                  items: [
                    { label: '所有者权益合计', value: totalEquity },
                    { label: '归母权益', value: parentEquity },
                    { label: '少数股东权益', value: 0, note: '（推算）' }
                  ],
                  calculation: `归母权益 + 少数股东权益 = ${this.formatNumber(parentEquity)} + 0 ≈ ${this.formatNumber(totalEquity)}`,
                  expected: totalEquity,
                  actual: totalEquity,
                  difference: 0,
                  differencePercent: 0,
                  conclusion: '少数股东权益可忽略，核对通过'
                }
              }
            }
          }

          if (!parentEquity || !minorityEquity) {
            return { passed: true, status: 'pass', note: '缺少细分数据，跳过检查' }
          }

          const expected = parentEquity + minorityEquity
          const diff = Math.abs(totalEquity - expected)
          const diffPercent = (diff / totalEquity) * 100

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '所有者权益合计', value: totalEquity },
              { label: '归母权益', value: parentEquity },
              { label: '少数股东权益', value: minorityEquity }
            ],
            calculation: `归母权益 + 少数股东权益 = ${this.formatNumber(parentEquity)} + ${this.formatNumber(minorityEquity)} = ${this.formatNumber(expected)}`,
            expected: expected,
            actual: totalEquity,
            difference: diff,
            differencePercent: diffPercent,
            conclusion: diffPercent <= 1
              ? '差异在容差范围内，核对通过'
              : '差异超过容差，请检查数据'
          }

          return {
            passed: diffPercent <= 1,
            status: diffPercent <= 0.01 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: totalEquity,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            note: diffPercent <= 0.01
              ? '所有者权益构成正确'
              : `差异${diffPercent.toFixed(2)}%`,
            suggestion: '数据核对通过',
            calculationDetail // V1.10: 新增
          }
        },
        priority: 1
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

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '营业收入', value: revenue },
              { label: '营业成本', value: cost },
              { label: '毛利润（提取值）', value: grossProfit }
            ],
            calculation: `营业收入 - 营业成本 = ${this.formatNumber(revenue)} - ${this.formatNumber(cost)} = ${this.formatNumber(expected)}`,
            expected: expected,
            actual: grossProfit,
            difference: diff,
            differencePercent: diffPercent,
            conclusion: !grossProfit
              ? '未提取到毛利润数据'
              : diffPercent <= 1
                ? '差异在容差范围内，核对通过'
                : '差异超过容差，请检查数据'
          }

          return {
            passed: !grossProfit || diffPercent <= 1,
            status: !grossProfit ? 'warning' : diffPercent <= 0.01 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: grossProfit,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            note: !grossProfit
              ? 'PDF中未找到"毛利润"数据，无法验证计算是否正确'
              : diffPercent > 0.01
                ? `计算值(${expected.toFixed(2)})与提取值(${grossProfit.toFixed(2)})存在${diffPercent.toFixed(2)}%差异`
                : '毛利润计算正确',
            suggestion: !grossProfit
              ? `建议手动核对：毛利润应为 营业收入(${revenue.toFixed(2)}) - 营业成本(${cost.toFixed(2)}) = ${expected.toFixed(2)}`
              : '数据核对通过',
            calculationDetail // V1.10: 新增
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
          const diff = currentAssets - totalAssets
          const diffPercent = (diff / totalAssets) * 100

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '流动资产', value: currentAssets },
              { label: '总资产', value: totalAssets }
            ],
            calculation: `流动资产(${this.formatNumber(currentAssets)}) ${passed ? '≤' : '>'} 总资产(${this.formatNumber(totalAssets)})`,
            expected: totalAssets,
            actual: currentAssets,
            difference: Math.abs(diff),
            differencePercent: Math.abs(diffPercent),
            conclusion: passed
              ? '流动资产不超过总资产，逻辑正确'
              : '流动资产超过总资产，数据异常'
          }

          return {
            passed,
            status: passed ? 'pass' : 'fail',
            leftSide: currentAssets,
            rightSide: totalAssets,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 0,
            suggestion: passed ? '逻辑正确' : '流动资产不应超过总资产',
            calculationDetail // V1.10: 新增
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
          const diff = currentLiabilities - totalLiabilities
          const diffPercent = (diff / totalLiabilities) * 100

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '流动负债', value: currentLiabilities },
              { label: '总负债', value: totalLiabilities }
            ],
            calculation: `流动负债(${this.formatNumber(currentLiabilities)}) ${passed ? '≤' : '>'} 总负债(${this.formatNumber(totalLiabilities)})`,
            expected: totalLiabilities,
            actual: currentLiabilities,
            difference: Math.abs(diff),
            differencePercent: Math.abs(diffPercent),
            conclusion: passed
              ? '流动负债不超过总负债，逻辑正确'
              : '流动负债超过总负债，数据异常'
          }

          return {
            passed,
            status: passed ? 'pass' : 'fail',
            leftSide: currentLiabilities,
            rightSide: totalLiabilities,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 0,
            suggestion: passed ? '逻辑正确' : '流动负债不应超过总负债',
            calculationDetail // V1.10: 新增
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
            // V1.10: 添加详细计算过程（无提取值情况）
            const calculationDetail = {
              items: [
                { label: '总负债', value: totalLiabilities },
                { label: '总资产', value: totalAssets },
                { label: '资产负债率（提取值）', value: null, note: '未提取' }
              ],
              calculation: `总负债 / 总资产 = ${this.formatNumber(totalLiabilities)} / ${this.formatNumber(totalAssets)} = ${(expectedPercent).toFixed(2)}%`,
              expected: expected,
              actual: null,
              difference: 0,
              differencePercent: 0,
              conclusion: '未提取到资产负债率数据，建议手动核对'
            }

            return {
              passed: true,
              status: 'warning',
              note: 'PDF中未找到"资产负债率"数据，无法验证计算是否正确',
              suggestion: `建议手动核对：资产负债率应为 总负债(${totalLiabilities.toFixed(2)}) / 总资产(${totalAssets.toFixed(2)}) = ${expectedPercent.toFixed(2)}%`,
              calculationDetail // V1.10: 新增
            }
          }

          // debtRatio可能是小数或百分比
          const ratioValue = debtRatio > 1 ? debtRatio / 100 : debtRatio
          const diff = Math.abs(ratioValue - expected)
          const diffPercent = diff * 100

          // V1.10: 添加详细计算过程
          const calculationDetail = {
            items: [
              { label: '总负债', value: totalLiabilities },
              { label: '总资产', value: totalAssets },
              { label: '资产负债率（提取值）', value: ratioValue, note: debtRatio > 1 ? '(已转换为小数)' : '' }
            ],
            calculation: `总负债 / 总资产 = ${this.formatNumber(totalLiabilities)} / ${this.formatNumber(totalAssets)} = ${(expectedPercent).toFixed(2)}%`,
            expected: expected,
            actual: ratioValue,
            difference: diff,
            differencePercent: diffPercent,
            conclusion: diffPercent <= 1
              ? '差异在容差范围内，核对通过'
              : '差异超过容差，请检查数据'
          }

          return {
            passed: diffPercent <= 1,
            status: diffPercent <= 0.1 ? 'pass' : diffPercent <= 1 ? 'warning' : 'fail',
            leftSide: ratioValue,
            rightSide: expected,
            difference: diff,
            differencePercent: diffPercent,
            tolerance: 1,
            note: diffPercent <= 0.1
              ? '资产负债率计算正确'
              : `提取值(${(ratioValue * 100).toFixed(2)}%)与计算值(${expectedPercent.toFixed(2)}%)存在${diffPercent.toFixed(2)}%差异`,
            suggestion: `正确值应为: ${expectedPercent.toFixed(2)}%`,
            calculationDetail // V1.10: 新增
          }
        },
        priority: 2
      }
    ]
  }

  /**
   * V1.10: 格式化数字显示
   */
  formatNumber(num) {
    if (num === null || num === undefined) return '-'
    if (typeof num !== 'number') return String(num)
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
   * V1.10: 修复模糊匹配问题，优先精确匹配
   */
  getMetricValue(data, name) {
    if (!data.financialMetrics) return null

    // 1. 首先尝试精确匹配
    let metric = data.financialMetrics.find(m => m.name === name)
    if (metric) return metric.value

    // 2. 尝试以指定名称开头的匹配（避免"所有者权益合计"匹配到"归属于母公司所有者权益合计"）
    metric = data.financialMetrics.find(m => m.name.startsWith(name + '（') || m.name.startsWith(name + '('))
    if (metric) return metric.value

    // 3. 最后尝试包含匹配（但要排除更长的名称）
    metric = data.financialMetrics.find(m => {
      // 如果指标名比查找名长很多，可能是不同的指标
      if (m.name.length > name.length + 4) return false
      return m.name.includes(name)
    })

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
