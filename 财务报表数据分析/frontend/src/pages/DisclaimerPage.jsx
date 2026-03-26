/**
 * 免责声明页面
 * V2.5 新增
 */
import React from 'react'
import { Card, Typography, Divider, Button, Space } from 'antd'
import { SafetyOutlined, LockOutlined, WarningOutlined, FileTextOutlined, StopOutlined, CopyrightOutlined, SyncOutlined, CustomerServiceOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const disclaimerSections = [
  {
    icon: <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
    title: '一、服务性质声明',
    content: `本工具为AI辅助的数据提取工具，提取结果由人工智能模型生成，仅供参考。用户应当对提取结果进行独立核实，不应完全依赖AI生成的内容做出任何决策。`
  },
  {
    icon: <LockOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
    title: '二、隐私保护声明',
    content: null,
    list: [
      '本工具不收集、不存储、不上传任何用户的个人信息',
      '用户上传的PDF文件仅在本地处理，不会上传到服务器',
      '用户的API Key仅存储在用户本地浏览器中，不会传输到任何服务器',
      '所有AI模型调用均为用户自行发起，直接发送至对应AI服务商'
    ]
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 20, color: '#faad14' }} />,
    title: '三、API Key安全提醒',
    content: null,
    list: [
      '请妥善保管您的API Key，不要分享给他人',
      '建议定期更换API Key以确保安全',
      '如发现API Key泄露，请立即到对应平台撤销并重新生成',
      '因API Key保管不当造成的损失，本工具不承担责任'
    ]
  },
  {
    icon: <WarningOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />,
    title: '四、数据准确性声明',
    content: null,
    list: [
      'AI模型可能产生幻觉或错误，提取的数据可能不准确',
      '本工具提供的勾稽核对功能仅作为辅助验证手段',
      '用户应当对照原始PDF文件核实所有提取结果',
      '因使用本工具产生的数据错误导致的任何损失，本工具不承担责任'
    ]
  },
  {
    icon: <StopOutlined style={{ fontSize: 20, color: '#722ed1' }} />,
    title: '五、使用限制',
    content: null,
    list: [
      '本工具仅供个人学习、研究使用',
      '未经授权，不得将本工具用于任何商业用途',
      '不得使用本工具处理涉及国家秘密、商业秘密等敏感信息',
      '不得利用本工具从事任何违法违规活动'
    ]
  },
  {
    icon: <CopyrightOutlined style={{ fontSize: 20, color: '#13c2c2' }} />,
    title: '六、知识产权声明',
    content: null,
    list: [
      '用户上传的PDF文件版权归原作者/出版方所有',
      '本工具不主张对提取结果的所有权',
      '本工具的软件代码遵循MIT开源协议'
    ]
  },
  {
    icon: <SyncOutlined style={{ fontSize: 20, color: '#eb2f96' }} />,
    title: '七、服务变更与终止',
    content: null,
    list: [
      '本工具保留随时修改、暂停或终止服务的权利',
      '重大变更将提前在页面公告'
    ]
  },
  {
    icon: <CustomerServiceOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
    title: '八、联系方式',
    content: '如有问题或建议，请通过【用户反馈】功能联系我们。'
  }
]

function DisclaimerPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '24px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
          <SafetyOutlined style={{ marginRight: 8 }} />
          免责声明
        </Title>
        <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
          最后更新日期：2026-03-25
        </Paragraph>

        <Divider />

        {disclaimerSections.map((section, index) => (
          <div key={index} style={{ marginBottom: 24 }}>
            <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {section.icon}
              {section.title}
            </Title>
            {section.content && (
              <Paragraph style={{ marginLeft: 28 }}>
                {section.content}
              </Paragraph>
            )}
            {section.list && (
              <ul style={{ marginLeft: 28, color: '#333' }}>
                {section.list.map((item, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <Text>{item}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <Divider />

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
            <Button type="primary" onClick={() => navigate('/feedback')}>
              提交反馈
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default DisclaimerPage
