import React from 'react'
import { Card, Radio, Space } from 'antd'
import { useStore } from '../../store/useStore'

const UNIT_OPTIONS = [
  { value: 'yuan', label: '元', description: '精确到分' },
  { value: 'wan', label: '万元', description: '保留2位小数' },
  { value: 'yi', label: '亿元', description: '保留2位小数' }
]

function UnitSelector() {
  const { displayUnit, setDisplayUnit } = useStore()

  return (
    <Card title="金额单位" size="small">
      <Radio.Group
        value={displayUnit}
        onChange={(e) => setDisplayUnit(e.target.value)}
        buttonStyle="solid"
        style={{ width: '100%' }}
      >
        {UNIT_OPTIONS.map(option => (
          <Radio.Button
            key={option.value}
            value={option.value}
            style={{ width: '33.33%', textAlign: 'center' }}
          >
            <Space direction="vertical" size={0}>
              <span style={{ fontWeight: 500 }}>{option.label}</span>
              <span style={{ fontSize: 10, color: '#999' }}>{option.description}</span>
            </Space>
          </Radio.Button>
        ))}
      </Radio.Group>
    </Card>
  )
}

export default UnitSelector
