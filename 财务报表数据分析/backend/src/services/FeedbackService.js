/**
 * 用户反馈服务
 * V2.4 新增
 * 负责处理用户反馈的提交、查询、更新
 */
import db from '../../database/db.js'

class FeedbackService {
  /**
   * 生成反馈编号
   * 格式: FB-YYYYMMDDXX (如 FB-2026032501)
   */
  async generateFeedbackNo() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // 获取今日已有反馈数量
    const result = await db.queryOne(
      `SELECT COUNT(*) as count FROM feedbacks
       WHERE feedback_no LIKE ?`,
      [`FB-${today}%`]
    )

    const seq = String((result?.count || 0) + 1).padStart(2, '0')
    return `FB-${today}${seq}`
  }

  /**
   * 提交反馈
   * @param {Object} params
   * @param {string} params.type - 反馈类型: bug/suggestion/consultation/other
   * @param {string} params.title - 标题
   * @param {string} params.content - 详细内容
   * @param {string} params.contact - 联系方式(选填)
   */
  async submitFeedback({ type, title, content, contact }) {
    try {
      // 验证必填字段
      if (!type || !title || !content) {
        throw new Error('缺少必填字段')
      }

      // 验证反馈类型
      const validTypes = ['bug', 'suggestion', 'consultation', 'other']
      if (!validTypes.includes(type)) {
        throw new Error('无效的反馈类型')
      }

      // 生成反馈编号
      const feedbackNo = await this.generateFeedbackNo()

      // 插入反馈记录
      const result = await db.run(
        `INSERT INTO feedbacks (feedback_no, type, title, content, contact, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [feedbackNo, type, title, content, contact || null]
      )

      // 更新今日反馈统计
      await this.updateDailyFeedbackStats()

      return {
        id: result.id,
        feedbackNo,
        message: '反馈提交成功'
      }
    } catch (err) {
      console.error('❌ 提交反馈失败:', err)
      throw err
    }
  }

  /**
   * 更新每日反馈统计
   */
  async updateDailyFeedbackStats() {
    const today = new Date().toISOString().split('T')[0]

    try {
      await db.run(
        `UPDATE daily_stats SET
          feedbacks_count = feedbacks_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE stat_date = ?`,
        [today]
      )
    } catch (err) {
      console.error('❌ 更新反馈统计失败:', err)
    }
  }

  /**
   * 获取反馈列表 (管理员)
   * @param {Object} params
   * @param {string} params.type - 筛选类型(可选)
   * @param {string} params.status - 筛选状态(可选)
   * @param {string} params.keyword - 搜索关键词(可选)
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   */
  async getFeedbacks({ type, status, keyword, page = 1, pageSize = 20 }) {
    try {
      let sql = 'SELECT * FROM feedbacks WHERE 1=1'
      const params = []

      if (type) {
        sql += ' AND type = ?'
        params.push(type)
      }

      if (status) {
        sql += ' AND status = ?'
        params.push(status)
      }

      if (keyword) {
        sql += ' AND (title LIKE ? OR content LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`)
      }

      // 获取总数
      const countResult = await db.queryOne(
        sql.replace('SELECT *', 'SELECT COUNT(*) as total'),
        params
      )
      const total = countResult?.total || 0

      // 分页查询
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(pageSize, (page - 1) * pageSize)

      const list = await db.query(sql, params)

      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    } catch (err) {
      console.error('❌ 获取反馈列表失败:', err)
      throw err
    }
  }

  /**
   * 获取反馈详情
   */
  async getFeedbackById(id) {
    try {
      const feedback = await db.queryOne(
        'SELECT * FROM feedbacks WHERE id = ?',
        [id]
      )

      if (!feedback) {
        throw new Error('反馈不存在')
      }

      return feedback
    } catch (err) {
      console.error('❌ 获取反馈详情失败:', err)
      throw err
    }
  }

  /**
   * 更新反馈状态 (管理员)
   * @param {number} id - 反馈ID
   * @param {string} status - 新状态
   * @param {string} adminReply - 管理员回复(可选)
   */
  async updateFeedbackStatus(id, status, adminReply = null) {
    try {
      const validStatuses = ['pending', 'replied', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        throw new Error('无效的状态')
      }

      let sql = 'UPDATE feedbacks SET status = ?, updated_at = CURRENT_TIMESTAMP'
      const params = [status]

      if (adminReply) {
        sql += ', admin_reply = ?'
        params.push(adminReply)
      }

      sql += ' WHERE id = ?'
      params.push(id)

      const result = await db.run(sql, params)

      if (result.changes === 0) {
        throw new Error('反馈不存在')
      }

      return { message: '更新成功' }
    } catch (err) {
      console.error('❌ 更新反馈状态失败:', err)
      throw err
    }
  }

  /**
   * 删除反馈 (管理员)
   */
  async deleteFeedback(id) {
    try {
      const result = await db.run('DELETE FROM feedbacks WHERE id = ?', [id])

      if (result.changes === 0) {
        throw new Error('反馈不存在')
      }

      return { message: '删除成功' }
    } catch (err) {
      console.error('❌ 删除反馈失败:', err)
      throw err
    }
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats() {
    try {
      const stats = await db.query(
        `SELECT
          type,
          COUNT(*) as count
        FROM feedbacks
        GROUP BY type`
      )

      const statusStats = await db.query(
        `SELECT
          status,
          COUNT(*) as count
        FROM feedbacks
        GROUP BY status`
      )

      const pendingCount = await db.queryOne(
        `SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'`
      )

      return {
        byType: stats,
        byStatus: statusStats,
        pendingCount: pendingCount?.count || 0
      }
    } catch (err) {
      console.error('❌ 获取反馈统计失败:', err)
      return { byType: [], byStatus: [], pendingCount: 0 }
    }
  }
}

export default new FeedbackService()
