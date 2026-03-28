import React, { useState } from 'react'
import { Card, Select, Input, Button, Space, message, Spin, Tag } from 'antd'
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, KeyOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { validateApiKey } from '../../services/apiService'

const { Password } = Input

const MODEL_PROVIDERS = [
  { value: 'claude', label: 'Anthropic（Claude系列）', defaultModel: 'claude-3-5-sonnet-20241022', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'], helpText: '支持 Claude-3.5-Sonnet、Claude-3-Opus 等' },
  { value: 'openai', label: 'OpenAI（GPT系列）', defaultModel: 'gpt-4o', models: ['gpt-4o', 'gpt-4-turbo'], helpText: '支持 GPT-4o, GPT-4-Turbo 等' },
  { value: 'gemini', label: 'Google（Gemini系列）', defaultModel: 'gemini-1.5-pro', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], helpText: '支持 Gemini-1.5-Pro, Gemini-1.5-Flash 等' },
  { value: 'deepseek', label: 'DeepSeek（深度求索）', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-coder'], helpText: '支持 DeepSeek-Chat, DeepSeek-Coder 等' },
  { value: 'kimi', label: 'Moonshot（Kimi系列）', defaultModel: 'moonshot-v1-8k', models: ['moonshot-v1-8k', 'moonshot-v1-32k'], helpText: '支持 moonshot-v1-8k, moonshot-v1-32k 等' },
  { value: 'glm', label: '智谱AI（GLM系列）', defaultModel: 'glm-5', models: ['glm-5', 'glm-4', 'glm-4-flash'], helpText: '支持 GLM-5(最新), GLM-4, GLM-4-Flash 等' },
  { value: 'minimax', label: 'MiniMax', defaultModel: 'abab6.5-chat', models: ['abab6.5-chat', 'abab5.5-chat'], helpText: '支持 abab6.5-chat, abab5.5-chat 等' },
  { value: 'doubao', label: '豆包（火山方舟）', defaultModel: 'doubao-seed-2-0-pro-260215', models: ['doubao-seed-2-0-pro-260215'], helpText: '支持 Doubao-Seed-2.0-pro/lite/mini 等' }
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
    const selectedProvider = MODEL_PROVIDERS.find(p => p.value === config.provider)

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
          style={{ width: '100%', marginBottom: 4 }}
          options={MODEL_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
        />

        {selectedProvider && (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, paddingLeft: 4 }}>
            💡 {selectedProvider.helpText}
          </div>
        )}

        {/* V2.7: 模型版本选择 */}
        {selectedProvider && selectedProvider.models?.length > 1 && (
          <Select
            placeholder="选择模型版本（默认最新）"
            value={config.model || selectedProvider.defaultModel || undefined}
            onChange={(value) => setModelConfig(role, { model: value, valid: false })}
            style={{ width: '100%', marginBottom: 8 }}
            options={selectedProvider.models.map(m => ({ value: m, label: m }))}
          />
        )}

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
