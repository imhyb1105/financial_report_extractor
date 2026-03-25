/**
 * AI日志服务 - V1.7
 * 记录所有AI模型交互的详细信息，用于调试和问题诊断
 */

class AILogService {
  constructor() {
    // 日志存储（内存中）
    this.logs = []
    // 当前提取会话ID
    this.currentSessionId = null
    // 当前会话的日志
    this.sessionLogs = []
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 开始新的提取会话
   */
  startSession() {
    this.currentSessionId = `session-${Date.now()}`
    this.sessionLogs = []
    console.log(`[AILogService] Started session: ${this.currentSessionId}`)
    return this.currentSessionId
  }

  /**
   * 结束当前会话，返回完整的调试日志
   */
  endSession(summary = {}) {
    const sessionLog = {
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      ...summary,
      modelCalls: this.sessionLogs
    }

    // 存储到历史日志
    this.logs.push(sessionLog)

    console.log(`[AILogService] Ended session: ${this.currentSessionId}, ${this.sessionLogs.length} model calls`)

    // 重置会话
    this.currentSessionId = null
    this.sessionLogs = []

    return sessionLog
  }

  /**
   * 记录AI请求开始
   * @param {string} modelId - 模型标识
   * @param {string} role - 角色 (extractor/validator/judge)
   * @param {Object} requestData - 请求数据
   * @returns {string} 日志条目ID
   */
  logRequest(modelId, role, requestData) {
    const logEntry = {
      id: this.generateId(),
      modelId,
      role,
      timestamp: Date.now(),
      startTime: new Date().toISOString(),
      request: {
        prompt: requestData.prompt || '',
        promptLength: requestData.prompt?.length || 0,
        pdfContent: requestData.pdfContent || '',
        pdfContentLength: requestData.pdfContent?.length || 0,
        temperature: requestData.temperature,
        imageCount: requestData.images?.length || 0,
        model: requestData.model
      },
      response: null,
      status: 'pending',
      duration: null,
      error: null
    }

    this.sessionLogs.push(logEntry)

    console.log(`[AILogService] Logged request: ${logEntry.id}, model=${modelId}, role=${role}, promptLength=${logEntry.request.promptLength}`)

    return logEntry.id
  }

  /**
   * 记录AI响应
   * @param {string} logId - 日志条目ID
   * @param {Object} responseData - 响应数据
   */
  logResponse(logId, responseData) {
    const log = this.sessionLogs.find(l => l.id === logId)
    if (!log) {
      console.warn(`[AILogService] Log entry not found: ${logId}`)
      return
    }

    log.response = {
      rawText: responseData.rawText || '',
      responseLength: responseData.rawText?.length || 0,
      parsedData: responseData.parsedData || null,
      tokens: responseData.tokens || null,
      finishReason: responseData.finishReason || null
    }
    log.status = 'completed'
    log.duration = Date.now() - log.timestamp
    log.endTime = new Date().toISOString()

    console.log(`[AILogService] Logged response: ${logId}, duration=${log.duration}ms, responseLength=${log.response.responseLength}`)
  }

  /**
   * 记录AI错误
   * @param {string} logId - 日志条目ID
   * @param {Error} error - 错误对象
   */
  logError(logId, error) {
    const log = this.sessionLogs.find(l => l.id === logId)
    if (!log) {
      console.warn(`[AILogService] Log entry not found: ${logId}`)
      return
    }

    log.status = 'error'
    log.error = {
      message: error.message,
      code: error.code || error.response?.status || 'UNKNOWN',
      details: error.response?.data || null
    }
    log.duration = Date.now() - log.timestamp
    log.endTime = new Date().toISOString()

    console.log(`[AILogService] Logged error: ${logId}, error=${error.message}`)
  }

  /**
   * 获取当前会话的日志
   */
  getCurrentSessionLogs() {
    return {
      sessionId: this.currentSessionId,
      logs: this.sessionLogs
    }
  }

  /**
   * 获取指定日志条目
   */
  getLogEntry(logId) {
    return this.sessionLogs.find(l => l.id === logId)
  }

  /**
   * 构建前端可用的调试日志对象
   */
  buildDebugLog(extractionResult) {
    const totalDuration = this.sessionLogs.reduce((sum, log) => sum + (log.duration || 0), 0)

    return {
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      totalDuration,
      pdfInfo: extractionResult?.metadata?.pdfInfo || null,
      modelCalls: this.sessionLogs.map(log => ({
        id: log.id,
        modelId: log.modelId,
        role: log.role,
        status: log.status,
        duration: log.duration,
        startTime: log.startTime,
        endTime: log.endTime,
        request: {
          prompt: log.request.prompt,
          promptLength: log.request.promptLength,
          pdfContent: log.request.pdfContent,
          pdfContentLength: log.request.pdfContentLength,
          imageCount: log.request.imageCount,
          temperature: log.request.temperature,
          model: log.request.model
        },
        response: log.response ? {
          rawText: log.response.rawText,
          responseLength: log.response.responseLength,
          parsedData: log.response.parsedData,
          tokens: log.response.tokens
        } : null,
        error: log.error
      }))
    }
  }

  /**
   * 清理历史日志（保留最近100条）
   */
  cleanup() {
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
  }
}

// 导出单例实例
const aiLogService = new AILogService()
export default aiLogService
