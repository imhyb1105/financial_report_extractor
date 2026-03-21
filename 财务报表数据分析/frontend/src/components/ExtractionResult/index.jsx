import React from 'react'
import { Card, Table, Tag, Tabs, Descriptions, Alert, Button, Space, Tooltip, Typography } from 'antd'
import {
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { exportToExcel } from '../../services/exportService'

const { Title, Text } = Typography
const { TabPane } = Tabs

const CONFIDENCE_CONFIG = {
  high: { color: 'success', icon: <CheckCircleOutlined />, text: '高置信度' },
  medium: { color: 'warning', icon: <WarningOutlined />, text: '中置信度' },
  low: { color: 'error', icon: <CloseCircleOutlined />, text: '低置信度' }
}

function ExtractionResult() {
  const { extractionResult, displayUnit } = useStore()

  if (!extractionResult) return null

  const { companyInfo, financialMetrics, nonFinancialInfo, accountingCheck, confidence } = extractionResult

  const handleExport = () => {
    exportToExcel(extractionResult, displayUnit)
  }

  const formatValue = (value, unit = displayUnit) => {
    if (value === null || value === undefined) return '-'
    if (typeof value !== 'number') return value

    const units = { yuan: '元', wan: '万元', yi: '亿元' }
    return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${units[unit]}`
  }

  const renderConfidenceTag = (level) => {
    const config = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.medium
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  const renderSourceTooltip = (source) => {
    if (!source) return null
    return (
      <Tooltip title={`来源: 第${source.page}页, ${source.location}`}>
        <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
      </Tooltip>
    )
  }

  const financialColumns = [
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {renderSourceTooltip(record.source)}
        </Space>
      )
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => (
        <Space>
          <Text>{formatValue(value, record.unit || displayUnit)}</Text>
          {record.originalUnit && record.originalUnit !== displayUnit && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              (原: {record.originalUnit})
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (level) => renderConfidenceTag(level)
    }
  ]

  const accountingColumns = [
    { title: '检查项', dataIndex: 'name', key: 'name', width: 200 },
    { title: '公式', dataIndex: 'formula', key: 'formula' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
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
      render: (value) => value !== undefined ? `${value.toFixed(2)}%` : '-'
    },
    { title: '建议', dataIndex: 'suggestion', key: 'suggestion' }
  ]

  return (
    <div className="result-container">
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>提取结果</Title>
            {renderConfidenceTag(confidence?.overall || 'medium')}
          </Space>
        }
        extra={
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        }
      >
        {/* 公司信息 */}
        <Card type="inner" title="公司概况" style={{ marginBottom: 16 }}>
          <Descriptions column={2}>
            <Descriptions.Item label="公司名称">{companyInfo?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="股票代码">{companyInfo?.stockCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="报告期间">{companyInfo?.reportPeriod || '-'}</Descriptions.Item>
            <Descriptions.Item label="报告日期">{companyInfo?.reportDate || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 勾稽核对结果 */}
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
              />
            }
          />
        )}

        <Tabs defaultActiveKey="financial">
          <TabPane tab="财务指标" key="financial">
            <Table
              columns={financialColumns}
              dataSource={financialMetrics || []}
              pagination={false}
              size="small"
              rowKey="name"
            />
          </TabPane>

          <TabPane tab="非财务信息" key="nonFinancial">
            {nonFinancialInfo && (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(nonFinancialInfo).map(([key, value]) => (
                  <Card key={key} type="inner" title={getNonFinancialTitle(key)} size="small">
                    {Array.isArray(value) ? (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {value.map((item, idx) => (
                          <li key={idx}>{typeof item === 'object' ? item.content : item}</li>
                        ))}
                      </ul>
                    ) : (
                      <Text>{value}</Text>
                    )}
                  </Card>
                ))}
              </Space>
            )}
          </TabPane>
        </Tabs>
      </Card>
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
