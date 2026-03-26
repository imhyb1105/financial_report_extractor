/**
 * PDF自动抓取组件
 * V2.3 新增
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
  Tooltip,
  Alert
} from 'antd'
import {
  SearchOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import api from '../../services/api'

const { Title, Text, Link } = Typography
const { Search } = Input
const { Option } = Select

const PDFAutoCapture = ({ onPDFSelected }) => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [downloading, setDownloading] = useState(false)
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
      const response = await api.get('/api/pdf-source/search', {
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
      const response = await api.get('/api/pdf-source/reports', {
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
   * 下载并使用PDF
   */
  const handleDownloadPDF = useCallback(async (report) => {
    setDownloading(true)

    try {
      // 如果有回调函数，传递报告信息
      if (onPDFSelected) {
        // 模拟PDF文件对象
        const mockFile = {
          name: `${report.code}_${report.title}.pdf`,
          type: 'application/pdf',
          size: 1024 * 1024, // 模拟大小
          url: report.url,
          source: report.source,
          isRemote: true
        }

        onPDFSelected(mockFile, report)
        message.success('已选择年报，请点击"开始提取"按钮')
      }
    } catch (error) {
      console.error('选择PDF失败:', error)
      message.error('选择PDF失败')
    } finally {
      setDownloading(false)
    }
  }, [onPDFSelected])

  /**
   * 渲染数据源标签
   */
  const renderSourceTag = (source) => {
    const sourceConfig = {
      eastmoney: { color: 'blue', text: '东方财富' },
      cninfo: { color: 'green', text: '巨潮资讯' },
      sse: { color: 'red', text: '上交所' },
      szse: { color: 'orange', text: '深交所' },
      mock: { color: 'default', text: '模拟数据' }
    }
    const config = sourceConfig[source] || sourceConfig.mock
    return <Tag color={config.color}>{config.text}</Tag>
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
      title={
        <Space>
          <DatabaseOutlined />
          <span>PDF自动抓取</span>
          <Tag color="blue">V2.3</Tag>
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setShowConfig(!showConfig)}
        />
      }
      size="small"
    >
      {/* 使用说明 */}
      <Alert
        type="info"
        message="输入股票代码（如600519）或公司名称（如贵州茅台），自动搜索并获取年报PDF"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 数据源配置 */}
      {showConfig && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">数据源优先级：</Text>
          <Select
            value={dataSource}
            onChange={setDataSource}
            style={{ width: 150, marginLeft: 8 }}
            size="small"
          >
            <Option value="auto">自动选择</Option>
            <Option value="eastmoney">东方财富优先</Option>
            <Option value="cninfo">巨潮资讯优先</Option>
          </Select>
        </div>
      )}

      {/* 搜索框 */}
      <Search
        placeholder="输入股票代码或公司名称"
        allowClear
        enterButton={<><SearchOutlined /> 搜索</>}
        size="large"
        loading={searching}
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        onSearch={handleSearch}
      />

      {/* 搜索结果 - 公司列表 */}
      {companies.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Divider orientation="left" plain>
            <Text type="secondary">搜索结果</Text>
          </Divider>
          <List
            size="small"
            dataSource={companies}
            renderItem={(company) => (
              <List.Item
                onClick={() => handleSelectCompany(company)}
                style={{
                  cursor: 'pointer',
                  background: selectedCompany?.code === company.code ? '#e6f7ff' : 'transparent'
                }}
              >
                <List.Item.Meta
                  avatar={<FilePdfOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={
                    <Space>
                      <Text strong>{company.name}</Text>
                      <Tag>{company.code}</Tag>
                      {renderSourceTag(company.source)}
                    </Space>
                  }
                  description={`${company.market === 'sh' ? '上海证券交易所' : company.market === 'sz' ? '深圳证券交易所' : '北京证券交易所'}`}
                />
                {selectedCompany?.code === company.code && (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                )}
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 年报列表 */}
      {selectedCompany && (
        <div style={{ marginTop: 16 }}>
          <Divider orientation="left" plain>
            <Space>
              <Text type="secondary">{selectedCompany.name} 年报列表</Text>
              {loadingReports && <Spin size="small" />}
            </Space>
          </Divider>

          {reports.length > 0 ? (
            <List
              size="small"
              dataSource={reports}
              renderItem={(report) => (
                <List.Item
                  actions={[
                    <Tooltip title="选择此年报进行数据提取" key="select">
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        loading={downloading}
                        onClick={() => handleDownloadPDF(report)}
                      >
                        选择
                      </Button>
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FilePdfOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />}
                    title={
                      <Space>
                        <Text>{report.title}</Text>
                        {renderSourceTag(report.source)}
                      </Space>
                    }
                    description={
                      <Space split={<Text type="secondary">|</Text>}>
                        <Text type="secondary">
                          <ClockCircleOutlined /> 发布日期: {formatDate(report.publishDate)}
                        </Text>
                        <Text type="secondary">
                          代码: {report.code}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            !loadingReports && (
              <Empty
                description="暂无年报数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          )}
        </div>
      )}

      {/* 加载中 */}
      {searching && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在搜索..." />
        </div>
      )}
    </Card>
  )
}

export default PDFAutoCapture
