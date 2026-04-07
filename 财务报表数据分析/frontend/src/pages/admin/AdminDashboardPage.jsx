/**
 * 管理员仪表盘页面
 * V2.4 新增
 */
import React, { useState, useEffect } from 'react'
import { Layout, Card, Row, Col, Statistic, Table, Tag, Button, message, Typography, Tabs, Modal, Input, Select, Empty, Spin, Form } from 'antd'
import {
  DashboardOutlined, MessageOutlined, BarChartOutlined,
  BugOutlined, BulbOutlined, BookOutlined, CommentOutlined,
  ClockCircleOutlined, ApiOutlined, CheckCircleOutlined,
  CloseCircleOutlined, LogoutOutlined, EyeOutlined, SendOutlined,
  KeyOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography
const { TabPane } = Tabs
const { TextArea } = Input
const { Option } = Select

// 反馈类型映射
const feedbackTypeMap = {
  bug: { icon: <BugOutlined />, text: '问题报告', color: 'red' },
  suggestion: { icon: <BulbOutlined />, text: '功能建议', color: 'blue' },
  consultation: { icon: <BookOutlined />, text: '使用咨询', color: 'green' },
  other: { icon: <CommentOutlined />, text: '其他', color: 'default' }
}

// 反馈状态映射
const feedbackStatusMap = {
  pending: { text: '待处理', color: 'orange' },
  replied: { text: '已回复', color: 'blue' },
  resolved: { text: '已解决', color: 'green' },
  closed: { text: '已关闭', color: 'default' }
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [dailyTrend, setDailyTrend] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackPagination, setFeedbackPagination] = useState({ page: 1, pageSize: 10, total: 0 })
  const [activeTab, setActiveTab] = useState('overview')
  const [replyModalVisible, setReplyModalVisible] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login')
      return
    }
    fetchData()
  }, [navigate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const headers = { Authorization: `Bearer ${token}` }

      // 并行获取数据
      const [overviewRes, trendRes, feedbackRes] = await Promise.all([
        api.get('/admin/stats/overview?days=7', { headers }),
        api.get('/admin/stats/daily?days=7', { headers }),
        api.get('/admin/feedbacks?page=1&pageSize=10', { headers })
      ])

      if (overviewRes.data.success) setOverview(overviewRes.data.data)
      if (trendRes.data.success) setDailyTrend(trendRes.data.data)
      if (feedbackRes.data.success) {
        setFeedbacks(feedbackRes.data.data.list)
        setFeedbackPagination(feedbackRes.data.data.pagination)
      }
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('登录已过期，请重新登录')
        localStorage.removeItem('adminToken')
        navigate('/admin/login')
      } else {
        message.error('获取数据失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    message.success('已退出登录')
    navigate('/admin/login')
  }

  const handlePasswordChange = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm

    if (!oldPassword || !newPassword || !confirmPassword) {
      message.error('请填写所有密码字段')
      return
    }

    if (newPassword !== confirmPassword) {
      message.error('两次输入的新密码不一致')
      return
    }

    if (newPassword.length < 6) {
      message.error('新密码长度至少6位')
      return
    }

    setPasswordLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await api.put('/admin/password', {
        oldPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        message.success('密码修改成功，请重新登录')
        handleLogout()
      }
    } catch (err) {
      message.error(err.response?.data?.message || '密码修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleViewFeedback = (record) => {
    setCurrentFeedback(record)
    setReplyContent(record.admin_reply || '')
    setReplyModalVisible(true)
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      message.error('请输入回复内容')
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      await api.put(`/admin/feedbacks/${currentFeedback.id}`, {
        status: 'replied',
        adminReply: replyContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      message.success('回复成功')
      setReplyModalVisible(false)
      fetchData()
    } catch (err) {
      message.error('回复失败')
    }
  }

  // 反馈表格列
  const feedbackColumns = [
    {
      title: '编号',
      dataIndex: 'feedback_no',
      key: 'feedback_no',
      width: 130
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const config = feedbackTypeMap[type] || feedbackTypeMap.other
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => {
        const config = feedbackStatusMap[status] || feedbackStatusMap.pending
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewFeedback(record)}
        >
          查看
        </Button>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>
            <DashboardOutlined /> 管理后台
          </Title>
        </div>
        <div style={{ padding: '8px' }}>
          <Button
            type={activeTab === 'overview' ? 'primary' : 'text'}
            block
            icon={<BarChartOutlined />}
            onClick={() => setActiveTab('overview')}
            style={{ marginBottom: 4, textAlign: 'left' }}
          >
            数据概览
          </Button>
          <Button
            type={activeTab === 'feedbacks' ? 'primary' : 'text'}
            block
            icon={<MessageOutlined />}
            onClick={() => setActiveTab('feedbacks')}
            style={{ marginBottom: 4, textAlign: 'left' }}
          >
            用户反馈
          </Button>
        </div>
        <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 8px' }}>
          <Button
            block
            icon={<KeyOutlined />}
            onClick={() => setPasswordModalVisible(true)}
            style={{ marginBottom: 8 }}
          >
            修改密码
          </Button>
          <Button
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
            {activeTab === 'overview' ? '数据概览' : '用户反馈'}
          </Title>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            欢迎回来，{localStorage.getItem('adminUsername') || '管理员'}
          </Text>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          {activeTab === 'overview' && (
            <>
              {/* 统计卡片 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="今日反馈"
                      value={overview?.today?.feedbacks_count || 0}
                      prefix={<MessageOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="今日提取"
                      value={overview?.today?.total_extractions || 0}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="今日Token"
                      value={overview?.today?.total_tokens || 0}
                      prefix={<ApiOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="平均耗时"
                      value={overview?.today?.avg_duration || 0}
                      suffix="ms"
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 每日趋势 */}
              <Card title="最近7天趋势" style={{ marginBottom: 24 }}>
                {dailyTrend.length > 0 ? (
                  <Table
                    dataSource={dailyTrend}
                    rowKey="stat_date"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '日期', dataIndex: 'stat_date', key: 'stat_date' },
                      { title: '提取次数', dataIndex: 'total_extractions', key: 'total_extractions' },
                      { title: '成功率', key: 'success_rate', render: (_, r) =>
                        r.total_extractions > 0 ? `${((r.successful_extractions / r.total_extractions) * 100).toFixed(1)}%` : '-' },
                      { title: 'Token消耗', dataIndex: 'total_tokens', key: 'total_tokens' },
                      { title: '平均耗时', key: 'avg_duration', render: (_, r) =>
                        `${Math.round(r.avg_duration || 0)}ms` }
                    ]}
                  />
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </>
          )}

          {activeTab === 'feedbacks' && (
            <Card title="用户反馈列表">
              <Table
                dataSource={feedbacks}
                columns={feedbackColumns}
                rowKey="id"
                pagination={{
                  ...feedbackPagination,
                  onChange: (page) => {
                    setFeedbackPagination(prev => ({ ...prev, page }))
                  }
                }}
              />
            </Card>
          )}
        </Content>
      </Layout>

      {/* 回复弹窗 */}
      <Modal
        title="反馈详情"
        open={replyModalVisible}
        onCancel={() => setReplyModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setReplyModalVisible(false)}>取消</Button>,
          <Button key="submit" type="primary" icon={<SendOutlined />} onClick={handleSubmitReply}>
            回复
          </Button>
        ]}
        width={600}
      >
        {currentFeedback && (
          <div>
            <p><strong>编号:</strong> {currentFeedback.feedback_no}</p>
            <p><strong>类型:</strong> {feedbackTypeMap[currentFeedback.type]?.text}</p>
            <p><strong>标题:</strong> {currentFeedback.title}</p>
            <p><strong>内容:</strong></p>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 16 }}>
              {currentFeedback.content}
            </div>
            {currentFeedback.contact && (
              <p><strong>联系方式:</strong> {currentFeedback.contact}</p>
            )}
            <p><strong>管理员回复:</strong></p>
            <TextArea
              rows={4}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="请输入回复内容..."
            />
          </div>
        )}
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false)
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setPasswordModalVisible(false)
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
          }}>取消</Button>,
          <Button key="submit" type="primary" loading={passwordLoading} onClick={handlePasswordChange}>
            确认修改
          </Button>
        ]}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="原密码" required>
            <Input.Password
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              placeholder="请输入原密码"
            />
          </Form.Item>
          <Form.Item label="新密码" required>
            <Input.Password
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="请输入新密码（至少6位）"
            />
          </Form.Item>
          <Form.Item label="确认新密码" required>
            <Input.Password
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="请再次输入新密码"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default AdminDashboardPage
