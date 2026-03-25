/**
 * 使用统计服务
 * V2.0 新增
 * 负责记录和查询使用统计数据
 */
import db from '../../database/db.js'
import { v4 as uuidv4 } from 'uuid'

class StatsService {
  /**
   * 生成匿名会话ID
   */
  generateSessionId() {
    return uuidv4().split('-')[0] // 取前8位作为简短ID
  }

  /**
   * 格式化时长为友好格式
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}毫秒`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}秒`
    } else {
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return `${minutes}分${seconds}秒`
    }
  }

  /**
   * 记录使用统计
   */
  async recordUsage({
    sessionId,
    extractionMode,
    totalDuration,
    totalTokens,
    tokenBreakdown = {},
    confidenceScore,
    success = true,
    errorMessage = null
  }) {
    try {
      // 插入使用统计记录
      await db.run(
        `INSERT INTO usage_stats (
          session_id, extraction_mode, total_duration, total_tokens,
          model_a_tokens, model_b_tokens, model_c_tokens,
          confidence_score, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId || this.generateSessionId(),
          extractionMode,
          totalDuration,
          totalTokens,
          tokenBreakdown.modelA || 0,
          tokenBreakdown.modelB || 0,
          tokenBreakdown.modelC || 0,
          confidenceScore || 0,
          success ? 1 : 0,
          errorMessage
        ]
      )

      // 更新每日统计
      await this.updateDailyStats(extractionMode, success, totalDuration, totalTokens, confidenceScore)

      return { success: true }
    } catch (err) {
      console.error('❌ 记录使用统计失败:', err)
      // 不抛出错误，避免影响主流程
      return { success: false, error: err.message }
    }
  }

  /**
   * 更新每日统计汇总
   */
  async updateDailyStats(extractionMode, success, duration, tokens, confidence) {
    const today = new Date().toISOString().split('T')[0]

    try {
      // 先尝试插入今日记录
      await db.run(
        `INSERT OR IGNORE INTO daily_stats (stat_date) VALUES (?)`,
        [today]
      )

      // 更新统计数据
      const modeColumn = {
        'single': 'single_mode_count',
        'dual': 'dual_mode_count',
        'tri': 'tri_mode_count'
      }[extractionMode] || 'single_mode_count'

      await db.run(
        `UPDATE daily_stats SET
          total_extractions = total_extractions + 1,
          successful_extractions = successful_extractions + ?,
          failed_extractions = failed_extractions + ?,
          total_tokens = total_tokens + ?,
          avg_duration = (avg_duration * total_extractions + ?) / (total_extractions + 1),
          avg_confidence = (avg_confidence * total_extractions + ?) / (total_extractions + 1),
          ${modeColumn} = ${modeColumn} + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE stat_date = ?`,
        [
          success ? 1 : 0,
          success ? 0 : 1,
          tokens,
          duration,
          confidence,
          today
        ]
      )
    } catch (err) {
      console.error('❌ 更新每日统计失败:', err)
    }
  }

  /**
   * 获取统计概览
   */
  async getOverview(days = 7) {
    try {
      // 获取指定天数内的统计
      const stats = await db.query(
        `SELECT
          SUM(total_extractions) as total_extractions,
          SUM(successful_extractions) as successful_extractions,
          SUM(failed_extractions) as failed_extractions,
          SUM(total_tokens) as total_tokens,
          AVG(avg_duration) as avg_duration,
          AVG(avg_confidence) as avg_confidence,
          SUM(single_mode_count) as single_mode_count,
          SUM(dual_mode_count) as dual_mode_count,
          SUM(tri_mode_count) as tri_mode_count
        FROM daily_stats
        WHERE stat_date >= date('now', '-${days} days')`
      )

      // 获取今日统计
      const todayStats = await db.queryOne(
        `SELECT * FROM daily_stats WHERE stat_date = date('now', 'localtime')`
      )

      // 获取反馈数量
      const feedbackCount = await db.queryOne(
        `SELECT COUNT(*) as count FROM feedbacks WHERE created_at >= date('now', '-${days} days')`
      )

      return {
        period: `${days}天`,
        summary: stats[0] || {},
        today: todayStats || {},
        feedbackCount: feedbackCount?.count || 0
      }
    } catch (err) {
      console.error('❌ 获取统计概览失败:', err)
      return null
    }
  }

  /**
   * 获取每日统计趋势
   */
  async getDailyTrend(days = 7) {
    try {
      const stats = await db.query(
        `SELECT
          stat_date,
          total_extractions,
          successful_extractions,
          total_tokens,
          avg_duration,
          avg_confidence,
          single_mode_count,
          dual_mode_count,
          tri_mode_count
        FROM daily_stats
        WHERE stat_date >= date('now', '-${days} days')
        ORDER BY stat_date ASC`
      )

      return stats
    } catch (err) {
      console.error('❌ 获取每日趋势失败:', err)
      return []
    }
  }

  /**
   * 获取最近的使用记录
   */
  async getRecentUsage(limit = 50) {
    try {
      const records = await db.query(
        `SELECT
          id,
          session_id,
          extraction_mode,
          total_duration,
          total_tokens,
          confidence_score,
          success,
          error_message,
          created_at
        FROM usage_stats
        ORDER BY created_at DESC
        LIMIT ?`,
        [limit]
      )

      return records.map(r => ({
        ...r,
        formatted_duration: this.formatDuration(r.total_duration)
      }))
    } catch (err) {
      console.error('❌ 获取最近使用记录失败:', err)
      return []
    }
  }
}

export default new StatsService()
