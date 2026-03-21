import React from 'react'
import { Card, List, Typography, Tag, Empty, Button, Popconfirm } from 'antd'
import { DeleteOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'

const { Text } = Typography

function HistoryPanel() {
  const { history, clearHistory } = useStore()

  if (history.length === 0) {
    return (
      <Card title="历史记录" size="small">
        <Empty description="暂无历史记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  return (
    <Card
      title="历史记录"
      size="small"
      extra={
        <Popconfirm
          title="确定清空所有历史记录？"
          onConfirm={clearHistory}
          okText="确定"
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            清空
          </Button>
        </Popconfirm>
      }
    >
      <List
        dataSource={history.slice(0, 10)}
        renderItem={(item) => (
          <List.Item style={{ padding: '8px 0', cursor: 'pointer' }}>
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
              title={
                <Text ellipsis style={{ maxWidth: 200 }}>
                  {item.companyName || item.fileName}
                </Text>
              }
              description={
                <>
                  <Tag>{item.reportPeriod || '未知期间'}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </>
              }
            />
            <Tag color={item.success ? 'success' : 'error'}>
              {item.success ? '成功' : '失败'}
            </Tag>
          </List.Item>
        )}
      />
    </Card>
  )
}

export default HistoryPanel
