/**
 * 数据对比组件
 * V2.2 新增
 * 支持多期财务数据对比分析
 */
import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Select, Button, Space, Typography, Alert, Spin } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, BarChartOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

const { Title, Text } = Typography
const { Option } = Select

const DataComparison = ({ dataA, dataB, labelA = '报告A', labelB = '报告B' }) => {
  const [comparison, setComparison] = useState(null)
  const [chartType, setChartType] = useState('line')
  const [loading, setLoading] = useState(false)

  /**
   * 执行对比分析
   */
  useEffect(() => {
    if (!dataA || !dataB) {
      setComparison(null)
      return
    }

    setLoading(true)

    try {
      const metricsA = dataA.financialMetrics || []
      const metricsB = dataB.financialMetrics || []

      // 创建对比结果
      const comparisonResults = metricsA.map(metricA => {
        const metricB = metricsB.find(m => m.name === metricA.name)
        if (!metricB) return {
          name: metricA.name,
          valueA: metricA.value,
          valueB: null,
          diff: null,
          percentChange: null,
          trend: 'same'
        }

        const valueA = metricA.value
        const valueB = metricB.value

        if (valueA === null || valueB === null) {
          return {
            name: metricA.name,
            valueA,
            valueB,
            diff: null,
            percentChange: null,
            trend: 'same'
          }
        }

        const diff = valueB - valueA
        const percentChange = valueA !== 0 ? ((diff / Math.abs(valueA)) * 100).toFixed(2) : 0
        const trend = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'same'

        return {
          name: metricA.name,
          valueA,
          valueB,
          diff,
          percentChange: parseFloat(percentChange),
          trend
        }
      })

      setComparison(comparisonResults)
    } catch (error) {
      console.error('对比分析失败:', error)
      setComparison([])
    } finally {
      setLoading(false)
    }
  }, [dataA, dataB])

  /**
   * 渲染趋势图表
   */
  const renderTrendChart = () => {
    if (!comparison || comparison.length === 0) return null

    const chartData = comparison
      .filter(c => c.diff !== null)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 10)
      .map(c => ({
        name: c.name.length > 8 ? c.name.substring(0, 8) + '...' : c.name,
        [labelA]: c.valueA,
        [labelB]: c.valueB,
        差异: c.diff
      }))

    if (chartData.length === 0) return null

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={labelA} stroke="#1890ff" strokeWidth={2} />
            <Line type="monotone" dataKey={labelB} stroke="#52c41a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={labelA} fill="#1890ff" />
            <Bar dataKey={labelB} fill="#52c41a" />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left'
    },
    {
      title: `${labelA}数值`,
      dataIndex: 'valueA',
      key: 'valueA',
      width: 150,
      render: (value) => (
        <Text>{value !== null ? value.toLocaleString() : '-'}</Text>
      )
    },
    {
      title: `${labelB}数值`,
      dataIndex: 'valueB',
      key: 'valueB',
      width: 150,
      render: (value) => (
        <Text>{value !== null ? value.toLocaleString() : '-'}</Text>
      )
    },
    {
      title: '差异',
      dataIndex: 'diff',
      key: 'diff',
      width: 120,
      render: (diff) => {
        if (diff === null) return '-'
        const color = diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#8c8c8c'
        return (
          <Text style={{ color }}>
            {diff > 0 ? '+' : ''}{diff.toLocaleString()}
          </Text>
        )
      }
    },
    {
      title: '变动率',
      dataIndex: 'percentChange',
      key: 'percentChange',
      width: 100,
      render: (percentChange) => {
        if (percentChange === null) return '-'
        const color = percentChange > 0 ? '#52c41a' : percentChange < 0 ? '#ff4d4f' : '#8c8c8c'
        return (
          <Text style={{ color }}>
            {percentChange > 0 ? '+' : ''}{percentChange}%
          </Text>
        )
      }
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      width: 80,
      render: (trend) => {
        const config = {
          increase: { color: 'success', icon: <ArrowUpOutlined />, text: '↑' },
          decrease: { color: 'error', icon: <ArrowDownOutlined />, text: '↓' },
          same: { color: 'default', icon: <MinusOutlined />, text: '-' }
        }
        const c = config[trend] || config.same
        return (
          <Tag color={c.color} icon={c.icon}>
            {c.text}
          </Tag>
        )
      }
    }
  ]

  // 没有数据时显示提示
  if (!dataA || !dataB) {
    return (
      <Card title="数据对比分析">
        <Alert
          type="info"
          message="请上传两份报告进行对比"
          description="上传两份不同期间的财务报告，系统将自动进行指标对比分析。"
          showIcon
        />
      </Card>
    )
  }

  // 加载中
  if (loading) {
    return (
      <Card title="数据对比分析">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="正在分析对比数据..." />
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={`数据对比: ${labelA} vs ${labelB}`}
      extra={
        <Space>
          <Select value={chartType} onChange={setChartType} style={{ width: 120 }}>
            <Option value="line">折线图</Option>
            <Option value="bar">柱状图</Option>
          </Select>
          <BarChartOutlined />
        </Space>
      }
    >
      {/* 统计摘要 */}
      {comparison && comparison.length > 0 && (
        <Space style={{ marginBottom: 16 }} wrap>
          <Tag color="success">
            上升: {comparison.filter(c => c.trend === 'increase').length}项
          </Tag>
          <Tag color="error">
            下降: {comparison.filter(c => c.trend === 'decrease').length}项
          </Tag>
          <Tag color="default">
            持平: {comparison.filter(c => c.trend === 'same').length}项
          </Tag>
        </Space>
      )}

      {/* 趋势图表 */}
      {renderTrendChart()}

      {/* 对比表格 */}
      <Table
        dataSource={comparison}
        columns={columns}
        pagination={false}
        rowKey="name"
        style={{ marginTop: 16 }}
        scroll={{ x: 800, y: 400 }}
        size="small"
      />
    </Card>
  )
}

export default DataComparison
