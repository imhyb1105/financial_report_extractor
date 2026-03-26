/**
 * API测试 - 健康检查和基础端点
 * L4 测试级别
 */

import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll } from '@jest/globals'

// 创建测试应用
const createTestApp = () => {
  const app = express()
  app.use(express.json())

  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '2.5.0',
      timestamp: new Date().toISOString()
    })
  })

  // 模型列表端点
  app.get('/api/models', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 'doubao', name: '豆包' },
        { id: 'zhipu', name: '智谱AI' },
        { id: 'qwen', name: '通义千问' }
      ]
    })
  })

  // 反馈端点
  app.post('/api/feedback', (req, res) => {
    if (!req.body.type || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: '请填写完整的反馈信息'
      })
    }
    res.status(201).json({
      success: true,
      message: '反馈提交成功'
    })
  })

  // 管理员登录
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      })
    }
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        data: { token: 'test-token' }
      })
    }
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    })
  })

  // PDF源搜索
  app.get('/api/pdf-source/search', (req, res) => {
    const { keyword } = req.query
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入股票代码或公司名称'
      })
    }
    res.json({
      success: true,
      data: [{ code: '600519', name: '贵州茅台' }],
      count: 1
    })
  })

  // PDF源配置
  app.get('/api/pdf-source/config', (req, res) => {
    res.json({
      success: true,
      data: {
        eastmoney: { name: '东方财富', priority: 1, enabled: true },
        cninfo: { name: '巨潮资讯', priority: 2, enabled: true }
      }
    })
  })

  return app
}

describe('API Health Check', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/health')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('status', 'ok')
      expect(res.body).toHaveProperty('version')
      expect(res.body).toHaveProperty('timestamp')
    })
  })
})

describe('API Models Endpoint', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('GET /api/models', () => {
    it('should return list of supported models', async () => {
      const res = await request(app).get('/api/models')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('should return models with required fields', async () => {
      const res = await request(app).get('/api/models')

      if (res.body.data.length > 0) {
        const model = res.body.data[0]
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('name')
      }
    })
  })
})

describe('API Feedback Endpoint', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('POST /api/feedback', () => {
    it('should reject empty feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should accept valid feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({
          type: 'suggestion',
          content: 'This is a test feedback'
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('success', true)
    })
  })
})

describe('API Admin Endpoints', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('POST /api/admin/login', () => {
    it('should reject login without credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'invalid',
          password: 'invalid'
        })

      expect(res.status).toBe(401)
    })

    it('should accept valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
    })
  })
})

describe('API PDF Source Endpoints', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('GET /api/pdf-source/search', () => {
    it('should reject empty keyword', async () => {
      const res = await request(app)
        .get('/api/pdf-source/search')

      expect(res.status).toBe(400)
    })

    it('should accept valid keyword', async () => {
      const res = await request(app)
        .get('/api/pdf-source/search')
        .query({ keyword: '600519' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
    })
  })

  describe('GET /api/pdf-source/config', () => {
    it('should return data source configuration', async () => {
      const res = await request(app)
        .get('/api/pdf-source/config')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
      expect(res.body.data).toHaveProperty('eastmoney')
    })
  })
})
