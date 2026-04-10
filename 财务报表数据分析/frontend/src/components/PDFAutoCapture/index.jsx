/**
 * PDF自动抓取组件
 * V2.5.2 优化布局
 * 支持通过股票代码/公司名自动获取年报PDF
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Space,
  Typography,
  message,
  Spin,
  Empty,
  Select,
  Divider,
  Tooltip
} from 'antd'
import {
  SearchOutlined,
  FilePdfOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  SelectOutlined,
  StockOutlined
} from '@ant-design/icons'
import api from '../../services/api'

const { Text } = Typography
const { Search } = Input
const { Option } = Select

const PDFAutoCapture = ({ onPDFSelected }) => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingOriginal, setDownloadingOriginal] = useState({})
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [reports, setReports] = useState([])
  const [dataSource, setDataSource] = useState('auto')
  const [showConfig, setShowConfig] = useState(false)

  /**
   * 搜索公司
   */
  const handleSearch = useCallback(async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
      message.warning('请输入股票代码或公司名称')
      return
    }

    setSearching(true)
    setCompanies([])
    setSelectedCompany(null)
    setReports([])

    try {
      const response = await api.get('/pdf-source/search', {
        params: { keyword: keyword.trim() }
      })

      if (response.data.success && response.data.data.length > 0) {
        setCompanies(response.data.data)
        message.success(`找到 ${response.data.data.length} 个匹配结果`)
      } else {
        message.info('未找到匹配的公司')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      message.error('搜索失败，请稍后重试')
    } finally {
      setSearching(false)
    }
  }, [])

  /**
   * 选择公司
   */
  const handleSelectCompany = useCallback(async (company) => {
    setSelectedCompany(company)
    setLoadingReports(true)
    setReports([])

    try {
      const response = await api.get('/pdf-source/reports', {
        params: {
          code: company.code,
          market: company.market
        }
      })

      if (response.data.success) {
        setReports(response.data.data)
        if (response.data.data.length === 0) {
          message.info('未找到该公司的年报')
        }
      }
    } catch (error) {
      console.error('获取年报列表失败:', error)
      message.error('获取年报列表失败')
    } finally {
      setLoadingReports(false)
    }
  }, [])

  /**
   * 直接下载PDF原文件
   */
  const handleDownloadOriginal = useCallback(async (report) => {
    const artCode = report.artCode || report.url?.split('/').pop()?.replace('.pdf', '').replace('H2_', '')
    const downloadKey = artCode || report.url

    setDownloadingOriginal(prev => ({ ...prev, [downloadKey]: true }))

    try {
      const response = await api.get('/pdf-source/download', {
        params: { url: report.url },
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `${report.code}_${report.title}.pdf`.replace(/[\/\\:*?"<>|]/g, '_')
      link.download = fileName

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success(`已下载: ${fileName}`)
    } catch (error) {
      console.error('下载PDF失败:', error)
      message.error('下载PDF失败，请稍后重试')
    } finally {
      setDownloadingOriginal(prev => ({ ...prev, [downloadKey]: false }))
    }
  }, [])

  /**
   * 下载并使用PDF
   */
  const handleDownloadPDF = useCallback(async (report) => {
    setDownloading(true)

    try {
      const response = await api.get('/pdf-source/download', {
        params: { url: report.url },
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const fileName = `${report.code}_${report.title}.pdf`.replace(/[\/\\:*?"<>|]/g, '_')
      const file = new File([blob], fileName, { type: 'application/pdf' })

      if (onPDFSelected) {
        onPDFSelected(file, report)
        message.success(`已选择年报: ${report.title}`)
      }
    } catch (error) {
      console.error('下载PDF失败:', error)
      message.error('下载PDF失败，请稍后重试')
    } finally {
      setDownloading(false)
    }
  }, [onPDFSelected])

  /**
   * 渲染数据源标签
   */
  const renderSourceTag = (source) => {
    const sourceConfig = {
      eastmoney: { color: 'processing', text: '东方财富' },
      cninfo: { color: 'success', text: '巨潮资讯' },
      sse: { color: 'error', text: '上交所' },
      szse: { color: 'warning', text: '深交所' }
    }
    const config = sourceConfig[source] || { color: 'default', text: source }
    return <Tag color={config.color} style={{ margin: 0, fontSize: 11 }}>{config.text}</Tag>
  }

  /**
   * 格式化日期
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN')
    } catch {
      return dateStr
    }
  }

  return (
    <Card
      size="small"
      title={
        <Space size={6}>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontSize: 14 }}>PDF自动抓取</span>
          <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>V2.5.2</Tag>
        </Space>
      }
      extra={
        <Tooltip title="设置">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setShowConfig(!showConfig)}
          />
        </Tooltip>
      }
      styles={{
        body: { padding: '12px' }
      }}
    >
      {/* 搜索框 */}
      <Search
        placeholder="股票代码/公司名称"
        allowClear
        enterButton={<SearchOutlined />}
        size="middle"
        loading={searching}
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 12 }}
      />

      {/* 数据源配置 */}
      {showConfig && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>数据源:</Text>
          <Select
            value={dataSource}
            onChange={setDataSource}
            size="small"
            style={{ flex: 1 }}
          >
            <Option value="auto">自动选择</Option>
            <Option value="eastmoney">东方财富优先</Option>
            <Option value="cninfo">巨潮资讯优先</Option>
          </Select>
        </div>
      )}

      {/* 搜索结果 - 公司列表 */}
      {companies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Divider style={{ margin: '8px 0', fontSize: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>公司列表 ({companies.length})</Text>
          </Divider>
          <List
            size="small"
            dataSource={companies}
            style={{ maxHeight: 150, overflow: 'auto' }}
            renderItem={(company) => (
              <List.Item
                onClick={() => handleSelectCompany(company)}
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  background: selectedCompany?.code === company.code ? '#e6f7ff' : 'transparent',
                  borderRadius: 4,
                  marginBottom: 4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <StockOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>{company.name}</Text>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{company.code}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {company.market === 'sh' ? '上交所' : company.market === 'sz' ? '深交所' : '北交所'}
                    </Text>
                  </div>
                  {selectedCompany?.code === company.code && (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 年报列表 */}
      {selectedCompany && (
        <div style={{ marginTop: 8 }}>
          <Divider style={{ margin: '8px 0', fontSize: 12 }}>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedCompany.name} 年报</Text>
              {loadingReports && <Spin size="small" />}
            </Space>
          </Divider>

          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin size="small" />
            </div>
          ) : reports.length > 0 ? (
            <List
              size="small"
              dataSource={reports}
              style={{ maxHeight: 200, overflow: 'auto' }}
              renderItem={(report) => {
                const artCode = report.artCode || report.url?.split('/').pop()?.replace('.pdf', '').replace('H2_', '')
                const downloadKey = artCode || report.url
                const isDownloading = downloadingOriginal[downloadKey]

                return (
                  <List.Item
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f0f0f0',
                      marginBottom: 4,
                      background: '#fafafa',
                      borderRadius: 4
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      {/* 标题行 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
                        <Text ellipsis style={{ flex: 1, fontSize: 12 }} title={report.title}>
                          {report.title}
                        </Text>
                        {renderSourceTag(report.source)}
                      </div>

                      {/* 信息行 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {formatDate(report.publishDate)}
                        </Text>

                        {/* 按钮组 */}
                        <Space size={4}>
                          <Tooltip title="下载PDF原文件">
                            <Button
                              type="text"
                              size="small"
                              icon={<CloudDownloadOutlined />}
                              loading={isDownloading}
                              onClick={() => handleDownloadOriginal(report)}
                              style={{ color: '#666', fontSize: 12 }}
                            >
                              下载
                            </Button>
                          </Tooltip>
                          <Tooltip title="选择进行数据提取">
                            <Button
                              type="primary"
                              size="small"
                              icon={<SelectOutlined />}
                              loading={downloading}
                              onClick={() => handleDownloadPDF(report)}
                              style={{ fontSize: 12 }}
                            >
                              选择
                            </Button>
                          </Tooltip>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )
              }}
            />
          ) : (
            <Empty
              description="暂无年报"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 16 }}
            />
          )}
        </div>
      )}

      {/* 加载中 */}
      {searching && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin tip="搜索中..." />
        </div>
      )}
    </Card>
  )
}

export default PDFAutoCapture
