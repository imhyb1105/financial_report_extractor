/**
 * 用户反馈路由
 * V2.4 新增
 */
import express from 'express'
import FeedbackService from '../services/FeedbackService.js'

const router = express.Router()

/**
 * 提交反馈
 * POST /api/feedback
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, content, contact } = req.body

    const result = await FeedbackService.submitFeedback({
      type,
      title,
      content,
      contact
    })

    res.json({
      success: true,
      data: result,
      message: '感谢您的反馈！我们会尽快处理。'
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || '提交失败，请稍后重试'
    })
  }
})

export default router
