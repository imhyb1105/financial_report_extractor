/**
 * 管理员路由
 * V2.4 新增
 * V2.5 新增审计日志
 */
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import db from '../../database/db.js'
import FeedbackService from '../services/FeedbackService.js'
import StatsService from '../services/StatsService.js'
import auditLogService, { AUDIT_EVENTS } from '../services/AuditLogService.js'

const router = express.Router()

// JWT 密钥 (生产环境应从环境变量读取)
const JWT_SECRET = process.env.JWT_SECRET || 'financial-report-extractor-secret-key-2026'
const JWT_EXPIRES_IN = '24h'

/**
 * 管理员登录
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      })
    }

    // 查询管理员
    const admin = await db.queryOne(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    )

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, admin.password_hash)

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 更新最后登录时间
    await db.run(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id]
    )

    // 记录审计日志
    await auditLogService.logUserAction(
      AUDIT_EVENTS.ADMIN_LOGIN,
      admin.username,
      req,
      { message: '管理员登录成功' }
    )

    // 生成 JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      data: {
        token,
        username: admin.username,
        expiresIn: JWT_EXPIRES_IN
      },
      message: '登录成功'
    })
  } catch (err) {
    console.error('❌ 管理员登录失败:', err)
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    })
  }
})

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token 无效或已过期，请重新登录'
    })
  }
}

/**
 * 验证 Token
 * GET /api/admin/verify
 */
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      username: req.admin.username
    }
  })
})

/**
 * 获取统计概览
 * GET /api/admin/stats/overview
 */
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const overview = await StatsService.getOverview(days)

    // 记录审计日志
    await auditLogService.logUserAction(
      AUDIT_EVENTS.ADMIN_VIEW_STATS,
      req.admin.username,
      req,
      { days }
    )

    res.json({
      success: true,
      data: overview
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 获取每日趋势
 * GET /api/admin/stats/daily
 */
router.get('/stats/daily', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const trend = await StatsService.getDailyTrend(days)

    res.json({
      success: true,
      data: trend
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 获取最近使用记录
 * GET /api/admin/stats/recent
 */
router.get('/stats/recent', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const records = await StatsService.getRecentUsage(limit)

    res.json({
      success: true,
      data: records
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 获取反馈列表
 * GET /api/admin/feedbacks
 */
router.get('/feedbacks', authMiddleware, async (req, res) => {
  try {
    const { type, status, keyword, page, pageSize } = req.query

    const result = await FeedbackService.getFeedbacks({
      type,
      status,
      keyword,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    })

    // 记录审计日志
    await auditLogService.logUserAction(
      AUDIT_EVENTS.ADMIN_VIEW_FEEDBACK,
      req.admin.username,
      req,
      { type, status, count: result.total }
    )

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 获取反馈详情
 * GET /api/admin/feedbacks/:id
 */
router.get('/feedbacks/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await FeedbackService.getFeedbackById(req.params.id)

    res.json({
      success: true,
      data: feedback
    })
  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 更新反馈状态
 * PUT /api/admin/feedbacks/:id
 */
router.put('/feedbacks/:id', authMiddleware, async (req, res) => {
  try {
    const { status, adminReply } = req.body

    const result = await FeedbackService.updateFeedbackStatus(
      req.params.id,
      status,
      adminReply
    )

    // 记录审计日志
    await auditLogService.logUserAction(
      AUDIT_EVENTS.ADMIN_UPDATE_FEEDBACK,
      req.admin.username,
      req,
      { feedbackId: req.params.id, status }
    )

    res.json({
      success: true,
      message: result.message
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 删除反馈
 * DELETE /api/admin/feedbacks/:id
 */
router.delete('/feedbacks/:id', authMiddleware, async (req, res) => {
  try {
    const result = await FeedbackService.deleteFeedback(req.params.id)

    res.json({
      success: true,
      message: result.message
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 获取反馈统计
 * GET /api/admin/feedbacks/stats
 */
router.get('/feedbacks/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await FeedbackService.getFeedbackStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

/**
 * 修改管理员密码
 * PUT /api/admin/password
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入原密码和新密码'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6位'
      })
    }

    // 查询当前管理员
    const admin = await db.queryOne(
      'SELECT * FROM admins WHERE id = ?',
      [req.admin.id]
    )

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '管理员不存在'
      })
    }

    // 验证原密码
    const isValid = await bcrypt.compare(oldPassword, admin.password_hash)

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '原密码错误'
      })
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    await db.run(
      'UPDATE admins SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.admin.id]
    )

    // 记录审计日志
    await auditLogService.logUserAction(
      AUDIT_EVENTS.ADMIN_PASSWORD_CHANGE,
      req.admin.username,
      req,
      { message: '管理员修改密码成功' }
    )

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (err) {
    console.error('❌ 修改密码失败:', err)
    res.status(500).json({
      success: false,
      message: '密码修改失败'
    })
  }
})

export default router
