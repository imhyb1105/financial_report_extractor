import React, { useState } from 'react'
import { Card, Table, Tag, Tabs, Descriptions, Alert, Button, Space, Tooltip, Typography, Divider, Empty, Grid } from 'antd'
import {
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  BugOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  FileTextOutlined,
  BulbOutlined
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { exportToExcel } from '../../services/exportService'
import AIDebugPanel from '../AIDebugPanel' // V1.7: AI调试面板

const { Title, Text } = Typography

// V2.8: 非财务信息状态配置
const NON_FIN_STATUS_CONFIG = {
  found: { color: 'success', icon: <CheckCircleOutlined />, text: '已找到' },
  partial: { color: 'warning', icon: <InfoCircleOutlined />, text: '部分提取' },
  not_in_report: { color: 'processing', icon: <FileTextOutlined />, text: '报告未包含' },
  not_found: { color: 'default', icon: <CloseCircleOutlined />, text: '未找到' }
}

// V1.14: 五档置信度配置
const CONFIDENCE_CONFIG = {
  5: { color: 'success', icon: <CheckCircleOutlined />, text: '高置信度', level: 'high' },
  4: { color: 'processing', icon: <CheckCircleOutlined />, text: '中高置信度', level: 'medium-high' },
  3: { color: 'warning', icon: <WarningOutlined />, text: '中置信度', level: 'medium' },
  2: { color: 'orange', icon: <WarningOutlined />, text: '中低置信度', level: 'medium-low' },
  1: { color: 'error', icon: <CloseCircleOutlined />, text: '低置信度', level: 'low' },
  // 兼容旧的字符串格式
  'high': { color: 'success', icon: <CheckCircleOutlined />, text: '高置信度', level: 'high' },
  'medium-high': { color: 'processing', icon: <CheckCircleOutlined />, text: '中高置信度', level: 'medium-high' },
  'medium': { color: 'warning', icon: <WarningOutlined />, text: '中置信度', level: 'medium' },
  'medium-low': { color: 'orange', icon: <WarningOutlined />, text: '中低置信度', level: 'medium-low' },
  'low': { color: 'error', icon: <CloseCircleOutlined />, text: '低置信度', level: 'low' }
}

// 将置信度转换为配置键
const getConfidenceKey = (confidence) => {
  if (typeof confidence === 'number') {
    return Math.max(1, Math.min(5, Math.round(confidence)))
  }
  // 字符串格式兼容
  const map = { 'high': 5, 'medium-high': 4, 'medium': 3, 'medium-low': 2, 'low': 1 }
  return map[confidence] || 3
}

function ExtractionResult() {
  const { extractionResult, displayUnit, debugLog } = useStore()
  const [showDebugPanel, setShowDebugPanel] = useState(false) // V1.7: 调试面板状态
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  if (!extractionResult) return null

  const { companyInfo, financialMetrics, nonFinancialInfo, accountingCheck, confidence, confidenceReason, modelResults, extractionWarning, usage, metricStats } = extractionResult

  const handleExport = () => {
    exportToExcel(extractionResult, displayUnit)
  }

  // 比率类型指标关键词
  const RATIO_KEYWORDS = ['率', '比例', '占比', '比率', 'ROE', 'ROA', 'PE', 'PB']

  // 检查是否为比率类型指标
  const isRatioMetric = (name) => {
    if (!name) return false
    // 精确匹配缩写指标
    if (['ROE', 'ROA', 'PE', 'PB'].includes(name)) return true
    return RATIO_KEYWORDS.some(keyword => name.includes(keyword))
  }

  const formatValue = (value, unit = displayUnit, metricName = null) => {
    if (value === null || value === undefined) return <Text type="secondary" style={{ color: '#faad14' }}>未找到</Text>
    if (typeof value !== 'number') return value || '-'

    // 比率类型显示为百分比
    if (isRatioMetric(metricName)) {
      // 如果值大于1，说明已经是百分比形式（如 45.5），直接显示
      // 如果值小于等于1，说明是小数形式（如 0.455），需要乘以100
      const percentValue = value > 1 ? value : value * 100
      return `${percentValue.toFixed(2)}%`
    }

    const units = { yuan: '元', wan: '万元', yi: '亿元' }
    return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${units[unit] || ''}`
  }

  const formatSimpleValue = (value, metricName = null) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') {
      // 比率类型显示为百分比
      if (isRatioMetric(metricName)) {
        const percentValue = value > 1 ? value : value * 100
        return `${percentValue.toFixed(2)}%`
      }
      return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return value || '-'
  }

  const renderConfidenceTag = (level, reason) => {
    const key = getConfidenceKey(level)
    const config = CONFIDENCE_CONFIG[key] || CONFIDENCE_CONFIG[3]
    return (
      <Space>
        <Tag color={config.color} icon={config.icon}>
          {config.text}
        </Tag>
        {reason && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            {reason}
          </Text>
        )}
      </Space>
    )
  }

  const renderSourceTooltip = (source) => {
    if (!source || !source.page) return null

    const parts = [`第${source.page}页`]
    if (source.location) parts.push(source.location)

    return (
      <Tooltip title={`来源: ${parts.join(', ')}`}>
        <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
      </Tooltip>
    )
  }

  // 检查是否有模型对比数据
  const hasModelComparison = modelResults && (modelResults.modelA || modelResults.modelB)

  // V1.11: 计算指标的定义（名称、公式、需要的数据）
  const CALCULATED_METRICS = {
    '毛利率': {
      formula: '毛利率 = 毛利润 / 营业收入',
      requiredMetrics: ['毛利润', '营业收入'],
      calculate: (metrics) => {
        const gross = metrics.find(m => m.name === '毛利润')?.value
        const revenue = metrics.find(m => m.name === '营业收入')?.value
        if (!gross || !revenue) return null
        return {
          result: gross / revenue,
          calculation: `${formatSimpleValue(gross)} ÷ ${formatSimpleValue(revenue)} = ${((gross / revenue) * 100).toFixed(2)}%`
        }
      }
    },
    '净利率': {
      formula: '净利率 = 净利润 / 营业收入',
      requiredMetrics: ['净利润', '营业收入'],
      calculate: (metrics) => {
        const netProfit = metrics.find(m => m.name === '净利润')?.value
        const revenue = metrics.find(m => m.name === '营业收入')?.value
        if (!netProfit || !revenue) return null
        return {
          result: netProfit / revenue,
          calculation: `${formatSimpleValue(netProfit)} ÷ ${formatSimpleValue(revenue)} = ${((netProfit / revenue) * 100).toFixed(2)}%`
        }
      }
    },
    '资产负债率': {
      formula: '资产负债率 = 总负债 / 总资产',
      requiredMetrics: ['总负债', '总资产'],
      calculate: (metrics) => {
        const liability = metrics.find(m => m.name === '总负债')?.value
        const asset = metrics.find(m => m.name === '总资产')?.value
        if (!liability || !asset) return null
        return {
          result: liability / asset,
          calculation: `${formatSimpleValue(liability)} ÷ ${formatSimpleValue(asset)} = ${((liability / asset) * 100).toFixed(2)}%`
        }
      }
    },
    '流动比率': {
      formula: '流动比率 = 流动资产 / 流动负债',
      requiredMetrics: ['流动资产', '流动负债'],
      calculate: (metrics) => {
        const currentAsset = metrics.find(m => m.name === '流动资产')?.value
        const currentLiability = metrics.find(m => m.name === '流动负债')?.value
        if (!currentAsset || !currentLiability) return null
        return {
          result: currentAsset / currentLiability,
          calculation: `${formatSimpleValue(currentAsset)} ÷ ${formatSimpleValue(currentLiability)} = ${(currentAsset / currentLiability).toFixed(2)}`
        }
      }
    },
    'ROE': {
      formula: 'ROE = 归属于母公司股东的净利润 / 归属于母公司所有者权益合计',
      requiredMetrics: ['归属于母公司股东的净利润', '归属于母公司所有者权益合计'],
      calculate: (metrics) => {
        const netProfit = metrics.find(m => m.name === '归属于母公司股东的净利润')?.value
        const equity = metrics.find(m => m.name === '归属于母公司所有者权益合计')?.value
        if (!netProfit || !equity) return null
        return {
          result: netProfit / equity,
          calculation: `${formatSimpleValue(netProfit)} ÷ ${formatSimpleValue(equity)} = ${((netProfit / equity) * 100).toFixed(2)}%`
        }
      }
    }
  }

  // V1.11: 渲染财务指标的计算详情
  const renderFinancialExpandedRow = (record) => {
    const metricConfig = CALCULATED_METRICS[record.name]
    if (!metricConfig) {
      // 非计算指标，显示来源信息
      return (
        <div style={{ padding: 12, backgroundColor: '#fafafa', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            📍 来源：{record.source?.location || 'PDF原文'}
            {record.source?.page && ` (第${record.source.page}页)`}
          </Text>
          {record.source?.text && (
            <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 4 }}>
              <Text code style={{ fontSize: 11 }}>{record.source.text}</Text>
            </div>
          )}
        </div>
      )
    }

    // 计算指标，显示计算过程
    const calcResult = metricConfig.calculate(financialMetrics)
    const requiredValues = metricConfig.requiredMetrics.map(name => {
      const metric = financialMetrics?.find(m => m.name === name)
      return { name, value: metric?.value, found: !!metric?.value }
    })

    return (
      <div style={{ padding: 12, backgroundColor: '#fafafa', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12 }}>📐 计算公式</Text>
          <div style={{ marginTop: 4, padding: 8, backgroundColor: '#fff', borderRadius: 4 }}>
            <Text code style={{ fontSize: 12 }}>{metricConfig.formula}</Text>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12 }}>📊 需要的数据</Text>
          <div style={{ marginTop: 4 }}>
            {requiredValues.map((item, idx) => (
              <div key={idx} style={{ fontSize: 12, padding: '2px 0' }}>
                <Text type={item.found ? 'secondary' : 'danger'}>
                  • {item.name}: {item.found ? formatSimpleValue(item.value) : '❌ 未找到'}
                </Text>
              </div>
            ))}
          </div>
        </div>

        {calcResult && (
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 12 }}>🔢 计算过程</Text>
            <div style={{ marginTop: 4, padding: 8, backgroundColor: '#f6ffed', borderRadius: 4 }}>
              <Text style={{ fontSize: 12 }}>{calcResult.calculation}</Text>
            </div>
          </div>
        )}

        {!calcResult && (
          <div style={{ padding: 8, backgroundColor: '#fff2f0', borderRadius: 4 }}>
            <Text type="danger" style={{ fontSize: 12 }}>
              ⚠️ 缺少必要数据，无法计算
            </Text>
          </div>
        )}
      </div>
    )
  }

  // 构建财务指标列（根据是否有模型对比动态调整）
  const getFinancialColumns = () => {
    const baseColumns = [
      {
        title: '指标名称',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        render: (text, record) => (
          <Space>
            <Text strong>{text || '-'}</Text>
            {renderSourceTooltip(record.source)}
          </Space>
        )
      },
      {
        title: '最终结果',
        dataIndex: 'value',
        key: 'value',
        width: 180,
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{formatValue(value, record.unit || displayUnit, record.name)}</Text>
            {record.originalUnit && record.originalUnit !== (record.unit || displayUnit) && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                (原单位: {record.originalUnit || '-'})
              </Text>
            )}
          </Space>
        )
      }
    ]

    // 如果有模型对比数据，添加模型对比列
    if (hasModelComparison) {
      if (modelResults.modelA) {
        const isModelAError = modelResults.modelA.error || (modelResults.modelA.financialMetrics?.length === 0)
        baseColumns.push({
          title: (
            <Space size={4}>
              <Text>模型A：{modelResults.modelA.provider?.toUpperCase() || 'GLM'}</Text>
              {isModelAError && <Tag color="error" style={{ fontSize: 10 }}>失败</Tag>}
            </Space>
          ),
          key: 'modelA',
          width: 150,
          render: (_, record) => {
            if (isModelAError) {
              return <Text type="secondary" style={{ fontSize: 12 }}>解析失败</Text>
            }
            const modelAMetric = modelResults.modelA.financialMetrics?.find(m => m.name === record.name)
            return <Text>{formatSimpleValue(modelAMetric?.value, record.name)}</Text>
          }
        })
      }

      if (modelResults.modelB) {
        const isModelBError = modelResults.modelB.error || (modelResults.modelB.financialMetrics?.length === 0)
        baseColumns.push({
          title: (
            <Space size={4}>
              <Text>模型B：{modelResults.modelB.provider?.toUpperCase() || 'GLM'}</Text>
              {isModelBError && <Tag color="error" style={{ fontSize: 10 }}>失败</Tag>}
            </Space>
          ),
          key: 'modelB',
          width: 150,
          render: (_, record) => {
            if (isModelBError) {
              return <Text type="secondary" style={{ fontSize: 12 }}>解析失败</Text>
            }
            const modelBMetric = modelResults.modelB.financialMetrics?.find(m => m.name === record.name)
            return <Text>{formatSimpleValue(modelBMetric?.value, record.name)}</Text>
          }
        })
      }
    }

    // 添加置信度列
    baseColumns.push({
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 160,
      render: (level, record) => {
        // V2.7: 服务端计算的指标显示原因
        const isCalculated = record.source?.location === '服务端计算'
        const reason = isCalculated ? '服务端计算' : undefined
        return renderConfidenceTag(level, reason)
      }
    })

    return baseColumns
  }

  // 勾稽核对列（V1.10: 增加计算详情）
  const accountingColumns = [
    { title: '检查项', dataIndex: 'name', key: 'name', width: 140 },
    { title: '公式', dataIndex: 'formula', key: 'formula', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (status) => (
        <Tag color={status === 'pass' ? 'success' : status === 'warning' ? 'warning' : 'error'}>
          {status === 'pass' ? '通过' : status === 'warning' ? '警告' : '失败'}
        </Tag>
      )
    },
    {
      title: '差异',
      dataIndex: 'differencePercent',
      key: 'difference',
      width: 70,
      render: (value) => value !== undefined && value !== null ? `${value.toFixed(2)}%` : '-'
    },
    {
      title: '结论',
      key: 'conclusion',
      render: (_, record) => {
        const explanation = record.note || record.suggestion || '-'
        const isWarning = record.status === 'warning'
        const hasDetail = record.calculationDetail

        return (
          <Space direction="vertical" size={0}>
            <Text type={isWarning ? 'warning' : undefined} style={isWarning ? { fontWeight: 500 } : {}}>
              {explanation}
            </Text>
            {hasDetail && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                🔍 点击行展开查看计算详情
              </Text>
            )}
          </Space>
        )
      }
    }
  ]

  // V1.10: 渲染计算详情
  const renderCalculationDetail = (record) => {
    const detail = record.calculationDetail
    if (!detail) return null

    return (
      <div style={{ padding: '12px 16px', backgroundColor: '#fafafa', borderRadius: 4 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>📊 计算详情</div>

        {/* 数值项 */}
        {detail.items && detail.items.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>涉及数值：</div>
            <Space direction="vertical" size={2}>
              {detail.items.map((item, idx) => (
                <Text key={idx} style={{ fontSize: 12 }}>
                  • {item.label}: {item.value !== null && item.value !== undefined
                    ? item.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '-'}
                  {item.note && <Text type="secondary" style={{ fontSize: 11 }}> {item.note}</Text>}
                </Text>
              ))}
            </Space>
          </div>
        )}

        {/* 计算过程 */}
        {detail.calculation && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>计算过程：</div>
            <Text code style={{ fontSize: 12 }}>{detail.calculation}</Text>
          </div>
        )}

        {/* 对比结果 */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>预期值: </Text>
            <Text strong style={{ fontSize: 12 }}>
              {detail.expected !== null && detail.expected !== undefined
                ? detail.expected.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '-'}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>实际值: </Text>
            <Text strong style={{ fontSize: 12 }}>
              {detail.actual !== null && detail.actual !== undefined
                ? detail.actual.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '-'}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>差异: </Text>
            <Text strong style={{ fontSize: 12, color: detail.differencePercent > 1 ? '#ff4d4f' : '#52c41a' }}>
              {detail.differencePercent !== undefined ? `${detail.differencePercent.toFixed(4)}%` : '-'}
            </Text>
          </div>
        </div>

        {/* 结论 */}
        <div style={{ padding: '8px 12px', backgroundColor: record.status === 'pass' ? '#f6ffed' : record.status === 'warning' ? '#fffbe6' : '#fff2f0', borderRadius: 4 }}>
          <Text style={{ fontSize: 12 }}>
            {record.status === 'pass' ? '✅' : record.status === 'warning' ? '⚠️' : '❌'} {detail.conclusion || '-'}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="result-container">
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>提取结果</Title>
            {renderConfidenceTag(confidence || 'medium', confidenceReason)}
            {/* V2.12: 指标完整度 */}
            {metricStats && (
              <Tag color={parseInt(metricStats.completeness) >= 80 ? 'success' : parseInt(metricStats.completeness) >= 50 ? 'warning' : 'error'}>
                指标完整度: {metricStats.completeness} ({metricStats.nonNullValues}/{metricStats.expected})
              </Tag>
            )}
            {/* V2.0: 使用统计显示 */}
            {usage && (
              <>
                <Divider type="vertical" />
                <Space size="middle">
                  <Text type="secondary">
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    耗时: {usage.formattedDuration || `${usage.totalDuration}ms`}
                  </Text>
                  <Text type="secondary">
                    <ApiOutlined style={{ marginRight: 4 }} />
                    Token: {usage.totalTokens?.toLocaleString() || '-'}
                  </Text>
                </Space>
              </>
            )}
          </Space>
        }
        extra={
          <Space>
            {/* V1.7: 查看AI调试日志按钮 */}
            <Button
              icon={<BugOutlined />}
              onClick={() => setShowDebugPanel(true)}
              disabled={!debugLog}
            >
              {!isMobile && '查看AI调试日志'}
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              {!isMobile && '导出Excel'}
            </Button>
          </Space>
        }
      >
        {/* 公司信息 */}
        <Card type="inner" title="公司概况" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="公司名称">{companyInfo?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="股票代码">{companyInfo?.stockCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="报告期间">{companyInfo?.reportPeriod || '-'}</Descriptions.Item>
            <Descriptions.Item label="报告日期">{companyInfo?.reportDate || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* V2.12: 未找到指标警告 */}
        {metricStats && metricStats.nullValues > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`以下${metricStats.nullValues}项指标在PDF中未找到: ${financialMetrics?.filter(m => m.value === null || m.value === undefined).map(m => m.name).join('、') || '无'}`}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* V1.7: 数据异常警告 */}
        {extractionWarning && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            message="数据异常警告"
            description={extractionWarning}
            showIcon
          />
        )}

        {/* 勾稽核对结果 - V1.10: 支持展开显示计算详情 */}
        {accountingCheck && (
          <Alert
            style={{ marginBottom: 16 }}
            type={accountingCheck.passed ? 'success' : 'warning'}
            message={accountingCheck.passed ? '勾稽关系核对通过' : '勾稽关系存在异常'}
            description={
              <Table
                columns={accountingColumns}
                dataSource={accountingCheck.checks || []}
                pagination={false}
                size="small"
                rowKey="name"
                scroll={{ x: 600 }}
                expandable={{
                  expandedRowRender: renderCalculationDetail,
                  rowExpandable: (record) => !!record.calculationDetail
                }}
              />
            }
          />
        )}

        <Tabs
          defaultActiveKey="financial"
          items={[
            {
              key: 'financial',
              label: '财务指标',
              children: (
                <Table
                  columns={getFinancialColumns()}
                  dataSource={financialMetrics || []}
                  pagination={false}
                  size="small"
                  rowKey="name"
                  scroll={{ x: 800 }}
                  expandable={{
                    expandedRowRender: renderFinancialExpandedRow,
                    rowExpandable: (record) => !!CALCULATED_METRICS[record.name] || !!record.source
                  }}
                />
              )
            },
            {
              key: 'nonFinancial',
              label: '非财务信息',
              children: nonFinancialInfo && (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {/* V2.8: 报告类型提示 */}
                  {nonFinancialInfo.reportType && (
                    <Alert
                      message={nonFinancialInfo.reportType === 'quarterly'
                        ? '检测到季度报告'
                        : nonFinancialInfo.reportType === 'annual'
                          ? '检测到年度报告'
                          : '报告类型未知'}
                      description={nonFinancialInfo.reportType === 'quarterly'
                        ? '季度报告通常比年度报告简短，可能不包含完整的风险因素、重大事项等章节。以下信息是根据报告内容尽可能提取的相关信息。'
                        : '年度报告通常包含完整的非财务信息章节。'}
                      type={nonFinancialInfo.reportType === 'quarterly' ? 'info' : 'success'}
                      showIcon
                      icon={<InfoCircleOutlined />}
                    />
                  )}
                  {/* V2.8: 非财务信息卡片 */}
                  {['riskFactors', 'majorEvents', 'futurePlans', 'dividendPlan'].map(key => {
                    const item = nonFinancialInfo[key]
                    // 兼容新旧格式
                    const isNewFormat = item && typeof item === 'object' && 'status' in item
                    const status = isNewFormat ? item.status : (item && (Array.isArray(item) ? item.length > 0 : item.content) ? 'found' : 'not_found')
                    const statusConfig = NON_FIN_STATUS_CONFIG[status] || NON_FIN_STATUS_CONFIG.not_found
                    const items = isNewFormat ? item.items : (Array.isArray(item) ? item : [])
                    const content = isNewFormat ? item.content : (typeof item === 'object' && !Array.isArray(item) ? item.content : null)
                    const hint = isNewFormat ? item.hint : null
                    const source = isNewFormat ? item.source : (typeof item === 'object' && !Array.isArray(item) ? item.source : null)

                    return (
                      <Card
                        key={key}
                        type="inner"
                        title={
                          <Space>
                            <span>{getNonFinancialTitle(key)}</span>
                            <Tag color={statusConfig.color} icon={statusConfig.icon}>
                              {statusConfig.text}
                            </Tag>
                          </Space>
                        }
                        size="small"
                      >
                        {/* 显示提取的内容 */}
                        {status === 'found' && items && items.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {items.map((it, idx) => {
                              const itemContent = typeof it === 'object' ? it.content : it
                              const itemSource = typeof it === 'object' ? it.source : null
                              return (
                                <li key={idx}>
                                  {itemContent}
                                  {itemSource?.page && (
                                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                      (第{itemSource.page}页{itemSource.location ? `，${itemSource.location}` : ''})
                                    </Text>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                        {status === 'found' && content && (
                          <Space direction="vertical" size={0}>
                            <Text>{content}</Text>
                            {source?.page && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                来源：第{source.page}页{source.location ? `，${source.location}` : ''}
                              </Text>
                            )}
                          </Space>
                        )}

                        {/* 显示提示信息 */}
                        {(status === 'partial' || status === 'not_in_report' || status === 'not_found') && (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {status === 'partial' && items && items.length > 0 && (
                              <>
                                <Text type="secondary">从报告中找到的相关内容：</Text>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  {items.map((it, idx) => {
                                    const itemContent = typeof it === 'object' ? it.content : it
                                    const itemSource = typeof it === 'object' ? it.source : null
                                    return (
                                      <li key={idx}>
                                        {itemContent}
                                        {itemSource?.page && (
                                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                            (第{itemSource.page}页)
                                          </Text>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ul>
                              </>
                            )}
                            {hint && (
                              <Alert
                                message={<span><BulbOutlined /> {hint}</span>}
                                type="info"
                                showIcon
                                style={{ marginTop: 8 }}
                              />
                            )}
                            {!hint && status === 'not_found' && (
                              <Text type="secondary">在报告中未找到相关信息</Text>
                            )}
                            {!hint && status === 'not_in_report' && (
                              <Alert
                                message={<span><BulbOutlined /> 季度报告通常不包含此信息，建议查看年度报告</span>}
                                type="info"
                                showIcon
                              />
                            )}
                          </Space>
                        )}

                        {/* 兼容旧格式：空内容 */}
                        {!isNewFormat && !items?.length && !content && (
                          <Text type="secondary">未提取到相关信息</Text>
                        )}
                      </Card>
                    )
                  })}
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* V1.7: AI调试日志面板 */}
      <AIDebugPanel
        visible={showDebugPanel}
        debugLog={debugLog}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  )
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

export default ExtractionResult
