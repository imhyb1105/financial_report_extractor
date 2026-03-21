import React, { useState } from 'react'
import { Card, Select, Input, Button, Space, message, Spin, Tag } from 'antd'
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, KeyOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { validateApiKey } from '../../services/apiService'

const { Password } = Input

const MODEL_PROVIDERS = [
  { value: 'claude', label: 'Anthropic Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { value: 'openai', label: 'OpenAI GPT-4', models: ['gpt-4o', 'gpt-4-turbo'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { value: 'kimi', label: 'Moonshot Kimi', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { value: 'glm', label: '智谱AI GLM-4', models: ['glm-4', 'glm-4-flash'] },
  { value: 'minimax', label: 'MiniMax', models: ['abab6.5-chat', 'abab5.5-chat'] },
  { value: 'doubao', label: '豆包(火山引擎)', models: ['doubao-seed-2-0-pro-260215'] }
]

function ModelConfig() {
  const { modelConfigs, setModelConfig, encryptionPassword, setEncryptionPassword } = useStore()
  const [testing, setTesting] = useState({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const handleTestConnection = async (role) => {
    const config = modelConfigs[role]
    if (!config.provider || !config.apiKey) {
      message.warning('请先选择模型并输入API Key')
      return
    }

    setTesting(prev => ({ ...prev, [role]: true }))
    try {
      const result = await validateApiKey(config.provider, config.apiKey)
      if (result.success) {
        setModelConfig(role, { valid: true })
        message.success(`${role === 'modelA' ? '模型A' : role === 'modelB' ? '模型B' : '模型C'} 连接成功！`)
      } else {
        setModelConfig(role, { valid: false })
        message.error(`连接失败: ${result.error}`)
      }
    } catch (error) {
      setModelConfig(role, { valid: false })
      message.error(`连接失败: ${error.message}`)
    } finally {
      setTesting(prev => ({ ...prev, [role]: false }))
    }
  }

  const renderModelItem = (role, label) => {
    const config = modelConfigs[role]
    const isTesting = testing[role]

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          <Space>
            {label}
            {config.valid && <Tag color="success" icon={<CheckCircleOutlined />}>已验证</Tag>}
          </Space>
        </div>

        <Select
          placeholder="选择模型提供商"
          value={config.provider || undefined}
          onChange={(value) => setModelConfig(role, { provider: value, valid: false })}
          style={{ width: '100%', marginBottom: 8 }}
          options={MODEL_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
        />

        <Space.Compact style={{ width: '100%' }}>
          <Password
            placeholder="输入API Key"
            value={config.apiKey}
            onChange={(e) => setModelConfig(role, { apiKey: e.target.value, valid: false })}
            style={{ flex: 1 }}
            iconRender={(visible) => visible ? <KeyOutlined /> : <KeyOutlined />}
          />
          <Button
            type="primary"
            icon={isTesting ? <Spin size="small" /> : <ApiOutlined />}
            onClick={() => handleTestConnection(role)}
            loading={isTesting}
          >
            测试
          </Button>
        </Space.Compact>
      </div>
    )
  }

  return (
    <Card title="模型配置" size="small">
      {renderModelItem('modelA', '模型A (提取)')}
      {renderModelItem('modelB', '模型B (提取)')}
      {renderModelItem('modelC', '模型C (裁决)')}

      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, color: '#666' }}>
          <p style={{ margin: '4px 0' }}>💡 提示：</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>单模型模式：只配置模型A</li>
            <li>双模型模式：配置A和B</li>
            <li>三模型验证：配置全部三个</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

export default ModelConfig
