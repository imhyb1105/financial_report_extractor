/**
 * 免责声明弹窗组件
 * V2.5.1 新增 - 首次访问必须同意免责声明
 */
import React, { useState, useEffect } from 'react'
import { Modal, Typography, Divider, Checkbox, Space, message } from 'antd'
import { SafetyOutlined, LockOutlined, WarningOutlined, FileTextOutlined, StopOutlined, CopyrightOutlined, SyncOutlined, CustomerServiceOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

const DISCLAIMER_AGREED_KEY = 'disclaimer_agreed'
const DISCLAIMER_VERSION = '1.0'

const disclaimerSections = [
  {
    icon: <FileTextOutlined style={{ fontSize: 18, color: '#1890ff' }} />,
    title: '一、服务性质声明',
    content: `本工具为AI辅助的数据提取工具，提取结果由人工智能模型生成，仅供参考。用户应当对提取结果进行独立核实，不应完全依赖AI生成的内容做出任何决策。`
  },
  {
    icon: <LockOutlined style={{ fontSize: 18, color: '#52c41a' }} />,
    title: '二、隐私保护声明',
    content: null,
    list: [
      '本工具不收集、不存储、不上传任何用户的个人信息',
      '用户上传的PDF文件仅在本地处理，不会上传到服务器',
      '用户的API Key仅存储在用户本地浏览器中',
      '所有AI模型调用均为用户自行发起，直接发送至对应AI服务商'
    ]
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 18, color: '#faad14' }} />,
    title: '三、API Key安全提醒',
    content: null,
    list: [
      '请妥善保管您的API Key，不要分享给他人',
      '建议定期更换API Key以确保安全',
      '因API Key保管不当造成的损失，本工具不承担责任'
    ]
  },
  {
    icon: <WarningOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />,
    title: '四、数据准确性声明',
    content: null,
    list: [
      'AI模型可能产生幻觉或错误，提取的数据可能不准确',
      '用户应当对照原始PDF文件核实所有提取结果',
      '因使用本工具产生的数据错误导致的任何损失，本工具不承担责任'
    ]
  },
  {
    icon: <StopOutlined style={{ fontSize: 18, color: '#722ed1' }} />,
    title: '五、使用限制',
    content: null,
    list: [
      '本工具仅供个人学习、研究使用',
      '不得使用本工具处理涉及国家秘密、商业秘密等敏感信息',
      '不得利用本工具从事任何违法违规活动'
    ]
  }
]

function DisclaimerModal({ onAgree, onDisagree }) {
  const [checked, setChecked] = useState(false)

  const handleAgree = () => {
    if (!checked) {
      message.warning('请先阅读并勾选同意条款')
      return
    }
    localStorage.setItem(DISCLAIMER_AGREED_KEY, DISCLAIMER_VERSION)
    onAgree()
  }

  const handleDisagree = () => {
    Modal.confirm({
      title: '确认退出？',
      content: '您需要同意免责声明才能使用本工具。不同意将关闭页面。',
      okText: '退出',
      cancelText: '返回阅读',
      onOk: () => {
        onDisagree()
      }
    })
  }

  return (
    <Modal
      open={true}
      closable={false}
      maskClosable={false}
      width={700}
      footer={null}
      style={{ top: 20 }}
    >
      <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
        <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        免责声明
      </Title>
      <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>
        最后更新日期：2026-03-25
      </Paragraph>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
        {disclaimerSections.map((section, index) => (
          <div key={index} style={{ marginBottom: 16 }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {section.icon}
              {section.title}
            </Title>
            {section.content && (
              <Paragraph style={{ marginLeft: 26, marginBottom: 8, fontSize: 13 }}>
                {section.content}
              </Paragraph>
            )}
            {section.list && (
              <ul style={{ marginLeft: 26, marginBottom: 8, fontSize: 13 }}>
                {section.list.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <Text>{item}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Divider style={{ margin: '16px 0 12px' }} />

      <div style={{ marginBottom: 16 }}>
        <Checkbox
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        >
          <Text strong>我已阅读并同意以上免责声明</Text>
        </Checkbox>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Space size="large">
          <button
            onClick={handleDisagree}
            style={{
              padding: '8px 32px',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            不同意
          </button>
          <button
            onClick={handleAgree}
            style={{
              padding: '8px 32px',
              border: 'none',
              borderRadius: 6,
              background: checked ? '#1890ff' : '#d9d9d9',
              color: '#fff',
              cursor: checked ? 'pointer' : 'not-allowed',
              fontSize: 14
            }}
          >
            同意并继续
          </button>
        </Space>
      </div>
    </Modal>
  )
}

// 检查是否已同意免责声明
export function hasAgreedDisclaimer() {
  const agreed = localStorage.getItem(DISCLAIMER_AGREED_KEY)
  return agreed === DISCLAIMER_VERSION
}

export default DisclaimerModal
