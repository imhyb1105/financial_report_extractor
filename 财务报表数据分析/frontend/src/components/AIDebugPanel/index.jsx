import React, { useState } from 'react'
import {
  Modal,
  Card,
  Descriptions,
  Collapse,
  Typography,
  Button,
  Space,
  Tag,
  Divider,
  Input,
  message
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons'

const { Text, Paragraph } = Typography
const { Panel } = Collapse
const { TextArea } = Input

/**
 * AI调试日志面板 - V1.7
 * 展示AI模型调用的详细信息，包括输入Prompt、原始响应、耗时等
 */
function AIDebugPanel({ visible, debugLog, onClose }) {
  const [expandedModel, setExpandedModel] = useState(null)
  const [showFullPrompt, setShowFullPrompt] = useState({})
  const [showFullResponse, setShowFullResponse] = useState({})

  if (!debugLog) return null

  const { sessionId, timestamp, totalDuration, pdfInfo, modelCalls } = debugLog

  // 复制文本到剪贴板
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label}已复制到剪贴板`)
    }).catch(() => {
      message.error('复制失败')
    })
  }

  // 导出日志为JSON
  const exportLog = () => {
    const dataStr = JSON.stringify(debugLog, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-debug-log-${sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('日志已导出')
  }

  // 格式化耗时
  const formatDuration = (ms) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // 格式化时间戳
  const formatTimestamp = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('zh-CN')
  }

  // 状态标签
  const renderStatusTag = (status) => {
    const config = {
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '成功' },
      error: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
      pending: { color: 'processing', icon: <ClockCircleOutlined />, text: '处理中' }
    }
    const { color, icon, text } = config[status] || config.pending
    return <Tag color={color} icon={icon}>{text}</Tag>
  }

  // 角色标签
  const renderRoleTag = (role) => {
    const roleMap = {
      extractor: { color: 'blue', text: '提取器' },
      validator: { color: 'green', text: '验证器' },
      judge: { color: 'orange', text: '裁决器' },
      A: { color: 'blue', text: '模型A' },
      B: { color: 'green', text: '模型B' },
      C: { color: 'orange', text: '模型C' }
    }
    const { color, text } = roleMap[role] || { color: 'default', text: role }
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <Modal
      title={
        <Space>
          <span>AI调试日志</span>
          <Tag color="blue">V1.7</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="export" icon={<DownloadOutlined />} onClick={exportLog}>
          导出日志
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      {/* 提取概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="会话ID">
            <Text copyable style={{ fontSize: 12 }}>{sessionId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="提取时间">{formatTimestamp(timestamp)}</Descriptions.Item>
          <Descriptions.Item label="总耗时">{formatDuration(totalDuration)}</Descriptions.Item>
          {pdfInfo && (
            <>
              <Descriptions.Item label="PDF页数">{pdfInfo.pageCount}</Descriptions.Item>
              <Descriptions.Item label="文本长度">{pdfInfo.textLength?.toLocaleString()} 字符</Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      <Divider orientation="left">AI模型调用记录 ({modelCalls?.length || 0}次)</Divider>

      {/* 模型调用列表 */}
      <Collapse
        accordion
        activeKey={expandedModel}
        onChange={(key) => setExpandedModel(key)}
      >
        {modelCalls?.map((call, index) => (
          <Panel
            key={call.id || index}
            header={
              <Space>
                <Text strong>{call.modelId}</Text>
                {renderRoleTag(call.role)}
                {renderStatusTag(call.status)}
                <Text type="secondary">{formatDuration(call.duration)}</Text>
              </Space>
            }
          >
            {/* 请求信息 */}
            <Card size="small" title="📥 请求信息" style={{ marginBottom: 12 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="模型">{call.request?.model || call.modelId}</Descriptions.Item>
                <Descriptions.Item label="Temperature">{call.request?.temperature}</Descriptions.Item>
                <Descriptions.Item label="Prompt长度">{call.request?.promptLength?.toLocaleString()} 字符</Descriptions.Item>
                <Descriptions.Item label="PDF内容长度">{call.request?.pdfContentLength?.toLocaleString()} 字符</Descriptions.Item>
                <Descriptions.Item label="发送图片">{call.request?.imageCount || 0} 张</Descriptions.Item>
                <Descriptions.Item label="开始时间">{formatTimestamp(call.startTime)}</Descriptions.Item>
              </Descriptions>

              {/* Prompt内容 */}
              <Divider orientation="left" plain style={{ margin: '12px 0' }}>
                Prompt内容
                <Button
                  type="link"
                  size="small"
                  icon={showFullPrompt[call.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullPrompt(prev => ({ ...prev, [call.id]: !prev[call.id] }))
                  }}
                >
                  {showFullPrompt[call.id] ? '收起' : '展开'}
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(call.request?.prompt || '', 'Prompt')
                  }}
                >
                  复制
                </Button>
              </Divider>
              <Paragraph
                ellipsis={!showFullPrompt[call.id] ? { rows: 3, expandable: true } : false}
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  fontSize: 12,
                  maxHeight: showFullPrompt[call.id] ? 400 : 'auto',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {call.request?.prompt || '-'}
              </Paragraph>

              {/* PDF内容预览 */}
              {call.request?.pdfContent && (
                <>
                  <Divider orientation="left" plain style={{ margin: '12px 0' }}>
                    PDF文本内容 (前2000字符)
                  </Divider>
                  <Paragraph
                    ellipsis={{ rows: 5, expandable: true }}
                    style={{
                      backgroundColor: '#fffbe6',
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {call.request.pdfContent.substring(0, 2000)}
                    {call.request.pdfContent.length > 2000 && '...'}
                  </Paragraph>
                </>
              )}
            </Card>

            {/* 响应信息 */}
            {call.response && (
              <Card size="small" title="📤 响应信息" style={{ marginBottom: 12 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="响应长度">{call.response.responseLength?.toLocaleString()} 字符</Descriptions.Item>
                  <Descriptions.Item label="结束原因">{call.response.finishReason || '-'}</Descriptions.Item>
                  {call.response.tokens && (
                    <>
                      <Descriptions.Item label="输入Token">{call.response.tokens.input_tokens?.toLocaleString() || call.response.tokens.prompt_tokens?.toLocaleString() || '-'}</Descriptions.Item>
                      <Descriptions.Item label="输出Token">{call.response.tokens.output_tokens?.toLocaleString() || call.response.tokens.completion_tokens?.toLocaleString() || '-'}</Descriptions.Item>
                    </>
                  )}
                </Descriptions>

                {/* 原始响应 */}
                <Divider orientation="left" plain style={{ margin: '12px 0' }}>
                  原始响应
                  <Button
                    type="link"
                    size="small"
                    icon={showFullResponse[call.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowFullResponse(prev => ({ ...prev, [call.id]: !prev[call.id] }))
                    }}
                  >
                    {showFullResponse[call.id] ? '收起' : '展开'}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(call.response?.rawText || '', '响应内容')
                    }}
                  >
                    复制
                  </Button>
                </Divider>
                <Paragraph
                  ellipsis={!showFullResponse[call.id] ? { rows: 5, expandable: true } : false}
                  style={{
                    backgroundColor: '#f6ffed',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: showFullResponse[call.id] ? 400 : 'auto',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}
                >
                  {call.response?.rawText || '-'}
                </Paragraph>

                {/* 解析后的数据摘要 */}
                {call.response?.parsedData && (
                  <>
                    <Divider orientation="left" plain style={{ margin: '12px 0' }}>
                      解析结果摘要
                    </Divider>
                    <Descriptions column={2} size="small">
                      {call.response.parsedData.companyInfo && (
                        <>
                          <Descriptions.Item label="公司名称">{call.response.parsedData.companyInfo.name || '-'}</Descriptions.Item>
                          <Descriptions.Item label="股票代码">{call.response.parsedData.companyInfo.stockCode || '-'}</Descriptions.Item>
                        </>
                      )}
                      {call.response.parsedData.financialMetrics && (
                        <Descriptions.Item label="财务指标数量">{call.response.parsedData.financialMetrics.length} 个</Descriptions.Item>
                      )}
                    </Descriptions>
                  </>
                )}
              </Card>
            )}

            {/* 错误信息 */}
            {call.error && (
              <Card size="small" title="❌ 错误信息" style={{ marginBottom: 12, borderColor: '#ff4d4f' }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="错误消息">
                    <Text type="danger">{call.error.message}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="错误代码">{call.error.code}</Descriptions.Item>
                  {call.error.details && (
                    <Descriptions.Item label="详细信息">
                      <Paragraph
                        style={{
                          backgroundColor: '#fff2f0',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 12,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {JSON.stringify(call.error.details, null, 2)}
                      </Paragraph>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </Panel>
        ))}
      </Collapse>

      {/* 无调用记录时的提示 */}
      {(!modelCalls || modelCalls.length === 0) && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无AI调用记录
        </div>
      )}
    </Modal>
  )
}

export default AIDebugPanel
