import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Typography, Button, Space, Result, Drawer, Grid } from 'antd'
import { MenuOutlined, MessageOutlined, SafetyOutlined } from '@ant-design/icons'
import ModelConfig from './components/ModelConfig'
import FileUploader from './components/FileUploader'
import UnitSelector from './components/UnitSelector'
import ExtractionResult from './components/ExtractionResult'
import HistoryPanel from './components/HistoryPanel'
import PDFAutoCapture from './components/PDFAutoCapture'
import DisclaimerModal, { hasAgreedDisclaimer } from './components/DisclaimerModal'
import DisclaimerPage from './pages/DisclaimerPage'
import FeedbackPage from './pages/FeedbackPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import { useStore } from './store/useStore'

const { Header, Content, Sider, Footer } = Layout
const { Title, Text } = Typography
const { useBreakpoint } = Grid

// 主页面组件
function HomePage() {
  const { extractionResult, isExtracting, setSelectedFile, clearSelectedFile } = useStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handlePDFSelected = useCallback((file, report) => {
    // 当从PDF自动抓取选择文件时，设置文件到store
    setSelectedFile(file, {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type,
      lastModified: new Date().toLocaleString(),
      source: report.sourceName,
      reportTitle: report.title
    })
  }, [setSelectedFile])

  const sidebarContent = (
    <>
      <ModelConfig />
      <div style={{ marginTop: 16 }}>
        <UnitSelector />
      </div>
      <div style={{ marginTop: 16 }}>
        <PDFAutoCapture onPDFSelected={handlePDFSelected} />
      </div>
      <div style={{ marginTop: 16 }}>
        <HistoryPanel />
      </div>
    </>
  )

  const mainContent = (
    <>
      <FileUploader />

      {isExtracting && (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '24px 12px' : '40px',
          background: '#fff',
          borderRadius: '8px',
          marginTop: 16
        }}>
          <Title level={4}>正在提取数据，请稍候...</Title>
          <p>AI模型正在分析财务报表，预计需要30-60秒</p>
        </div>
      )}

      {extractionResult && !isExtracting && (
        <ExtractionResult />
      )}
    </>
  )

  // 移动端：侧边栏放入 Drawer，用普通div避免Layout嵌套flex问题
  if (isMobile) {
    return (
      <>
        <Drawer
          title="配置面板"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width="85%"
          styles={{ body: { padding: 16 } }}
        >
          {sidebarContent}
        </Drawer>
        <div style={{ padding: 12, background: '#f5f5f5', width: '100%' }}>
          <Button
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            style={{ marginBottom: 12 }}
          >
            配置面板
          </Button>
          {mainContent}
        </div>
      </>
    )
  }

  // 桌面端：保持原有布局
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout>
        <Sider width={320} theme="light" style={{ padding: '16px', overflow: 'auto' }}>
          {sidebarContent}
        </Sider>
        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          {mainContent}
        </Content>
      </Layout>
    </Layout>
  )
}

// 导航栏组件
function AppHeader() {
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const isAdminPage = location.pathname.startsWith('/admin')

  if (isAdminPage) {
    return null // 管理员页面有自己的头部
  }

  return (
    <Header style={{
      background: '#001529',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 24px'
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Title level={isMobile ? 5 : 3} style={{ color: '#fff', margin: 0 }}>
          {isMobile ? '财务报表提取' : '智能财务报表数据提取工具'}
        </Title>
      </Link>
      <Space>
        <Link to="/feedback">
          <Button type="text" icon={<MessageOutlined />} style={{ color: '#fff' }}>
            {!isMobile && '反馈'}
          </Button>
        </Link>
        <Link to="/disclaimer">
          <Button type="text" icon={<SafetyOutlined />} style={{ color: '#fff' }}>
            {!isMobile && '免责声明'}
          </Button>
        </Link>
      </Space>
    </Header>
  )
}

// 主应用布局
function AppLayout() {
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const isAdminPage = location.pathname.startsWith('/admin')
  const isDisclaimerPage = location.pathname === '/disclaimer'
  const isFeedbackPage = location.pathname === '/feedback'

  // 这些页面使用独立布局
  if (isAdminPage || isDisclaimerPage || isFeedbackPage) {
    return (
      <Routes>
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Routes>
    )
  }

  // 主页面布局
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Routes>
      <Footer style={{ textAlign: 'center', background: '#f5f5f5', padding: isMobile ? '16px 12px' : undefined }}>
        {!isMobile ? (
          <Space split={<Text type="secondary">|</Text>}>
            <Link to="/disclaimer">免责声明</Link>
            <Link to="/feedback">用户反馈</Link>
            <Link to="/admin/login">管理员入口</Link>
          </Space>
        ) : (
          <Space direction="vertical" size={4}>
            <Space split={<Text type="secondary">|</Text>}>
              <Link to="/disclaimer">免责声明</Link>
              <Link to="/feedback">用户反馈</Link>
              <Link to="/admin/login">管理员入口</Link>
            </Space>
          </Space>
        )}
        <br />
        <Text type="secondary">© 2026 智能财务报表数据提取工具 V2.13</Text>
      </Footer>
    </Layout>
  )
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disagreed, setDisagreed] = useState(false)

  useEffect(() => {
    // 检查是否已同意免责声明
    if (!hasAgreedDisclaimer()) {
      setShowDisclaimer(true)
    }
  }, [])

  const handleAgree = () => {
    setShowDisclaimer(false)
  }

  const handleDisagree = () => {
    setDisagreed(true)
  }

  // 用户不同意免责声明
  if (disagreed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <Result
          status="info"
          title="感谢您的访问"
          subTitle="您需要同意免责声明才能使用本工具。如有疑问，请联系我们。"
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {showDisclaimer && (
        <DisclaimerModal
          onAgree={handleAgree}
          onDisagree={handleDisagree}
        />
      )}
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
