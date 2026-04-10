/**
 * 管理员登录页面
 * V2.4 新增
 */
import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography, Grid } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const { Title, Text } = Typography

function AdminLoginPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const response = await api.post('/admin/login', values)
      if (response.data.success) {
        // 保存 token
        localStorage.setItem('adminToken', response.data.data.token)
        localStorage.setItem('adminUsername', response.data.data.username)
        message.success('登录成功')
        navigate('/admin/dashboard')
      }
    } catch (err) {
      message.error(err.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: isMobile ? '90%' : 400, maxWidth: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          <LockOutlined style={{ marginRight: 8 }} />
          管理员登录
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ username: '' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="link" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default AdminLoginPage
