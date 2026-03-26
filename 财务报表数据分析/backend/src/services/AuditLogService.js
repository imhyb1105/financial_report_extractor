/**
 * 审计日志服务
 * V2.5 新增
 * 记录用户操作和系统事件
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 审计日志级别
 */
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  AUDIT: 'AUDIT'
}

/**
 * 审计事件类型
 */
const AUDIT_EVENTS = {
  // 用户操作
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_FEEDBACK: 'USER_FEEDBACK',

  // 管理员操作
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  ADMIN_VIEW_FEEDBACK: 'ADMIN_VIEW_FEEDBACK',
  ADMIN_UPDATE_FEEDBACK: 'ADMIN_UPDATE_FEEDBACK',
  ADMIN_VIEW_STATS: 'ADMIN_VIEW_STATS',

  // 数据操作
  DATA_EXTRACT: 'DATA_EXTRACT',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_COMPARE: 'DATA_COMPARE',

  // PDF操作
  PDF_UPLOAD: 'PDF_UPLOAD',
  PDF_DOWNLOAD: 'PDF_DOWNLOAD',
  PDF_AUTO_CAPTURE: 'PDF_AUTO_CAPTURE',

  // 系统事件
  SYSTEM_START: 'SYSTEM_START',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  API_ERROR: 'API_ERROR'
}

/**
 * 审计日志服务类
 */
class AuditLogService {
  constructor() {
    this.logDir = path.join(__dirname, '../../../logs')
    this.logFile = path.join(this.logDir, 'audit.log')
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.initialized = false
  }

  /**
   * 初始化日志目录
   */
  async init() {
    if (this.initialized) return

    try {
      await fs.mkdir(this.logDir, { recursive: true })
      this.initialized = true
    } catch (error) {
      console.error('初始化审计日志目录失败:', error)
    }
  }

  /**
   * 记录审计日志
   * @param {Object} entry - 日志条目
   */
  async log(entry) {
    await this.init()

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: entry.level || LOG_LEVELS.INFO,
      event: entry.event,
      userId: entry.userId || 'anonymous',
      ip: entry.ip || 'unknown',
      userAgent: entry.userAgent || 'unknown',
      details: entry.details || {},
      message: entry.message || ''
    }

    const logLine = JSON.stringify(logEntry) + '\n'

    try {
      // 检查文件大小，必要时轮转
      await this.rotateIfNeeded()

      // 追加日志
      await fs.appendFile(this.logFile, logLine, 'utf8')

      // 同时输出到控制台
      this.logToConsole(logEntry)
    } catch (error) {
      console.error('写入审计日志失败:', error)
    }
  }

  /**
   * 控制台输出
   */
  logToConsole(entry) {
    const timestamp = entry.timestamp
    const level = entry.level.padEnd(5)
    const event = entry.event.padEnd(25)
    const user = entry.userId.padEnd(15)
    const message = entry.message

    console.log(`[${timestamp}] [${level}] [${event}] [${user}] ${message}`)
  }

  /**
   * 日志文件轮转
   */
  async rotateIfNeeded() {
    try {
      const stats = await fs.stat(this.logFile)
      if (stats.size >= this.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedFile = path.join(this.logDir, `audit-${timestamp}.log`)
        await fs.rename(this.logFile, rotatedFile)
        console.log(`日志已轮转: ${rotatedFile}`)
      }
    } catch (error) {
      // 文件不存在，无需轮转
      if (error.code !== 'ENOENT') {
        console.error('检查日志文件失败:', error)
      }
    }
  }

  /**
   * 记录用户操作
   */
  async logUserAction(event, userId, req, details = {}) {
    await this.log({
      level: LOG_LEVELS.AUDIT,
      event,
      userId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      details,
      message: details.message || event
    })
  }

  /**
   * 记录错误
   */
  async logError(event, error, req, details = {}) {
    await this.log({
      level: LOG_LEVELS.ERROR,
      event,
      userId: details.userId || 'system',
      ip: this.getClientIp(req),
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      details: {
        error: error.message,
        stack: error.stack,
        ...details
      },
      message: error.message
    })
  }

  /**
   * 记录API调用
   */
  async logApiCall(event, req, details = {}) {
    await this.log({
      level: LOG_LEVELS.INFO,
      event,
      userId: details.userId || 'anonymous',
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        ...details
      },
      message: `${req.method} ${req.path}`
    })
  }

  /**
   * 获取客户端IP
   */
  getClientIp(req) {
    if (!req) return 'unknown'
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.ip ||
           'unknown'
  }

  /**
   * 查询审计日志
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>}
   */
  async queryLogs(options = {}) {
    await this.init()

    const {
      startDate,
      endDate,
      event,
      userId,
      level,
      limit = 100,
      offset = 0
    } = options

    try {
      const content = await fs.readFile(this.logFile, 'utf8')
      const lines = content.trim().split('\n')

      let logs = lines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(log => log !== null)

      // 过滤
      if (startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate))
      }
      if (endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate))
      }
      if (event) {
        logs = logs.filter(log => log.event === event)
      }
      if (userId) {
        logs = logs.filter(log => log.userId === userId)
      }
      if (level) {
        logs = logs.filter(log => log.level === level)
      }

      // 排序（最新优先）
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      // 分页
      const total = logs.length
      logs = logs.slice(offset, offset + limit)

      return {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { logs: [], pagination: { total: 0, limit, offset, hasMore: false } }
      }
      throw error
    }
  }

  /**
   * 清理旧日志
   * @param {number} daysToKeep - 保留天数
   */
  async cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    try {
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.startsWith('audit-') && f.endsWith('.log'))

      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file)
        const stats = await fs.stat(filePath)
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath)
          console.log(`已删除旧日志: ${file}`)
        }
      }
    } catch (error) {
      console.error('清理旧日志失败:', error)
    }
  }
}

// 导出单例
const auditLogService = new AuditLogService()

export { auditLogService, AUDIT_EVENTS, LOG_LEVELS }
export default auditLogService
