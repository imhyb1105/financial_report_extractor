/**
 * 用户反馈页面
 * V2.4 新增
 */
import React, { useState } from 'react'
import { Card, Form, Input, Select, Button, message, Typography, Space, Result, Grid } from 'antd'
import { BugOutlined, BulbOutlined, BookOutlined, MessageOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const feedbackTypes = [
  { value: 'bug', label: '问题报告', icon: <BugOutlined />, description: '功能异常、错误报告' },
  { value: 'suggestion', label: '功能建议', icon: <BulbOutlined />, description: '新功能想法、改进建议' },
  { value: 'consultation', label: '使用咨询', icon: <BookOutlined />, description: '如何使用、操作指南' },
  { value: 'other', label: '其他反馈', icon: <MessageOutlined />, description: '其他意见建议' }
]

function FeedbackPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedbackNo, setFeedbackNo] = useState('')
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const response = await api.post('/feedback', values)
      if (response.data.success) {
        setFeedbackNo(response.data.data.feedbackNo)
        setSubmitted(true)
        message.success('反馈提交成功！')
      }
    } catch (err) {
      message.error(err.response?.data?.message || '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: isMobile ? '12px' : '24px',
        background: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Card style={{ width: '100%' }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="感谢您的反馈！"
            subTitle={
              <div>
                <Paragraph>您的反馈编号: <Text strong>{feedbackNo}</Text></Paragraph>
                <Paragraph type="secondary">
                  我们会尽快处理，如有需要会通过您留下的方式联系您。
                </Paragraph>
              </div>
            }
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/')}>
                返回首页
              </Button>,
              <Button key="another" onClick={() => {
                setSubmitted(false)
                setFeedbackNo('')
                form.resetFields()
              }}>
                继续反馈
              </Button>
            ]}
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 700,
      margin: '0 auto',
      padding: isMobile ? '12px' : '24px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          <MessageOutlined style={{ marginRight: 8 }} />
          提交反馈
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          感谢您使用本工具！如有任何问题或建议，请告诉我们。
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'bug' }}
        >
          <Form.Item
            name="type"
            label="反馈类型"
            rules={[{ required: true, message: '请选择反馈类型' }]}
          >
            <Select placeholder="请选择反馈类型">
              {feedbackTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {type.icon}
                    {type.label}
                    <Text type="secondary" style={{ fontSize: 12 }}>- {type.description}</Text>
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 100, message: '标题不能超过100个字符' }
            ]}
          >
            <Input placeholder="请简要描述您的问题或建议" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="详细描述"
            rules={[
              { required: true, message: '请输入详细描述' },
              { min: 10, message: '描述至少10个字符' }
            ]}
          >
            <TextArea
              placeholder="请详细描述您遇到的问题或建议，包括操作步骤、截图等（如有）"
              rows={6}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="contact"
            label="联系方式"
            extra="选填，用于回复您的反馈（邮箱或电话）"
          >
            <Input placeholder="请输入您的联系方式（选填）" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error('请阅读并同意隐私政策'))
              }
            ]}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" />
              <Text>
                我已阅读并同意
                <a onClick={() => navigate('/disclaimer')}>隐私政策</a>
              </Text>
            </label>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
                返回首页
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={loading}
              >
                提交反馈
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default FeedbackPage
