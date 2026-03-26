/**
 * PDF数据源路由
 * V2.3 新增
 * 提供PDF自动抓取相关API
 */

import express from 'express'
import PDFSourceService from '../services/PDFSourceService.js'

const router = express.Router()
const pdfSourceService = new PDFSourceService()

/**
 * 搜索公司
 * GET /api/pdf-source/search
 * Query: keyword - 股票代码或公司名称
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '请输入股票代码或公司名称'
      })
    }

    const results = await pdfSourceService.searchCompany(keyword.trim())

    res.json({
      success: true,
      data: results,
      count: results.length
    })
  } catch (error) {
    console.error('搜索公司失败:', error)
    res.status(500).json({
      success: false,
      error: '搜索失败，请稍后重试'
    })
  }
})

/**
 * 获取年报列表
 * GET /api/pdf-source/reports
 * Query: code - 股票代码, market - 市场类型
 */
router.get('/reports', async (req, res) => {
  try {
    const { code, market } = req.query

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码'
      })
    }

    const reports = await pdfSourceService.getAnnualReports(code, market || 'sh')

    res.json({
      success: true,
      data: reports,
      count: reports.length
    })
  } catch (error) {
    console.error('获取年报列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取年报列表失败，请稍后重试'
    })
  }
})

/**
 * 下载PDF
 * GET /api/pdf-source/download
 * Query: url - PDF下载URL
 */
router.get('/download', async (req, res) => {
  try {
    const { url } = req.query

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '请提供PDF下载链接'
      })
    }

    // 验证URL格式
    if (!url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: '无效的PDF链接'
      })
    }

    const pdfBuffer = await pdfSourceService.downloadPDF(url)

    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.setHeader('Content-Disposition', 'attachment; filename="annual_report.pdf"')

    res.send(pdfBuffer)
  } catch (error) {
    console.error('下载PDF失败:', error)
    res.status(500).json({
      success: false,
      error: '下载PDF失败，请稍后重试'
    })
  }
})

/**
 * 获取数据源配置
 * GET /api/pdf-source/config
 */
router.get('/config', (req, res) => {
  try {
    const config = pdfSourceService.getSourceConfig()

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('获取数据源配置失败:', error)
    res.status(500).json({
      success: false,
      error: '获取配置失败'
    })
  }
})

/**
 * 更新数据源配置
 * PUT /api/pdf-source/config
 */
router.put('/config', (req, res) => {
  try {
    const { sourceId, priority, enabled } = req.body

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: '请提供数据源ID'
      })
    }

    if (typeof priority === 'number') {
      pdfSourceService.updateSourcePriority(sourceId, priority)
    }

    if (typeof enabled === 'boolean') {
      pdfSourceService.toggleSource(sourceId, enabled)
    }

    const config = pdfSourceService.getSourceConfig()

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('更新数据源配置失败:', error)
    res.status(500).json({
      success: false,
      error: '更新配置失败'
    })
  }
})

export default router
