import React, { useState } from 'react'
import { Upload, Button, message, Progress, Alert, Typography, Space } from 'antd'
import { InboxOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { extractData } from '../../services/apiService'

const { Dragger } = Upload
const { Text } = Typography

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function FileUploader() {
  const {
    startExtraction,
    setExtractionProgress,
    setExtractionResult,
    setExtractionError,
    isExtracting,
    extractionProgress,
    modelConfigs,
    displayUnit,
    addToHistory
  } = useStore()

  const [file, setFile] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)

  const beforeUpload = (file) => {
    if (file.type !== 'application/pdf') {
      message.error('只能上传PDF文件！')
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过50MB！')
      return false
    }
    return false // 阻止自动上传
  }

  const handleFileChange = (info) => {
    if (info.fileList.length > 0) {
      const selectedFile = info.fileList[0].originFileObj
      setFile(selectedFile)
      setFileInfo({
        name: selectedFile.name,
        size: (selectedFile.size / 1024 / 1024).toFixed(2),
        type: selectedFile.type,
        lastModified: new Date(selectedFile.lastModified).toLocaleString()
      })
    } else {
      setFile(null)
      setFileInfo(null)
    }
  }

  const handleExtract = async () => {
    if (!file) {
      message.warning('请先上传PDF文件')
      return
    }

    const validModels = Object.entries(modelConfigs)
      .filter(([_, config]) => config.valid && config.apiKey)
      .map(([role, config]) => ({ role, ...config }))

    if (validModels.length === 0) {
      message.warning('请至少配置并验证一个模型')
      return
    }

    startExtraction()

    try {
      const result = await extractData(file, validModels, displayUnit, (progress) => {
        setExtractionProgress(progress)
      })

      setExtractionResult(result)

      // 添加到历史记录
      addToHistory({
        id: Date.now(),
        fileName: file.name,
        timestamp: new Date().toISOString(),
        companyName: result.companyInfo?.name || '未知公司',
        reportPeriod: result.companyInfo?.reportPeriod || '',
        success: true
      })

      message.success('数据提取完成！')
    } catch (error) {
      setExtractionError(error.message)
      message.error(`提取失败: ${error.message}`)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setFileInfo(null)
  }

  return (
    <div className="upload-area">
      <Dragger
        beforeUpload={beforeUpload}
        onChange={handleFileChange}
        fileList={file ? [{
          uid: '-1',
          name: file.name,
          status: 'done',
          originFileObj: file
        }] : []}
        onRemove={handleRemove}
        accept=".pdf"
        maxCount={1}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽PDF文件到此区域</p>
        <p className="ant-upload-hint">
          支持财务年报PDF，最大50MB
        </p>
      </Dragger>

      {fileInfo && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          icon={<FilePdfOutlined />}
          message={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>{fileInfo.name}</Text>
              <Text type="secondary">
                大小: {fileInfo.size} MB | 最后修改: {fileInfo.lastModified}
              </Text>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleRemove}
              >
                移除文件
              </Button>
            </Space>
          }
        />
      )}

      {isExtracting && (
        <div style={{ marginTop: 16 }}>
          <Progress
            percent={extractionProgress}
            status="active"
            format={(percent) => `正在处理... ${percent}%`}
          />
        </div>
      )}

      <Button
        type="primary"
        size="large"
        block
        style={{ marginTop: 16 }}
        onClick={handleExtract}
        disabled={!file || isExtracting}
        loading={isExtracting}
      >
        {isExtracting ? '正在提取数据...' : '开始提取数据'}
      </Button>
    </div>
  )
}

export default FileUploader
