import React from 'react'
import { Layout, Typography } from 'antd'
import ModelConfig from './components/ModelConfig'
import FileUploader from './components/FileUploader'
import UnitSelector from './components/UnitSelector'
import ExtractionResult from './components/ExtractionResult'
import HistoryPanel from './components/HistoryPanel'
import { useStore } from './store/useStore'

const { Header, Content, Sider } = Layout
const { Title } = Typography

function App() {
  const { extractionResult, isExtracting } = useStore()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#001529',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px'
      }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          智能财务报表数据提取工具
        </Title>
      </Header>

      <Layout>
        <Sider width={320} theme="light" style={{ padding: '16px', overflow: 'auto' }}>
          <ModelConfig />
          <div style={{ marginTop: 16 }}>
            <UnitSelector />
          </div>
          <div style={{ marginTop: 16 }}>
            <HistoryPanel />
          </div>
        </Sider>

        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <FileUploader />

          {isExtracting && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
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
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
