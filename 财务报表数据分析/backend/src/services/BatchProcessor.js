/**
 * 批量处理服务
 * V2.2 新增
 * 支持多PDF批量上传、队列处理、进度跟踪
 */
import { v4 as uuidv4 } from 'uuid'

class BatchProcessor {
  constructor(apiClient, options = {}) {
    this.apiClient = apiClient
    this.options = options
    this.concurrency = options.concurrency || 3
    this.queue = []
    this.results = new Map()
    this.processing = false
    this.onProgressCallback = null
    this.onCompleteCallback = null
    this.onErrorCallback = null
  }

  /**
   * 添加文件到处理队列
   * @param {File} file - PDF文件对象
   * @param {Object} metadata - 文件元数据
   * @returns {string} 任务ID
   */
  addFile(file, metadata = {}) {
    const taskId = uuidv4()
    const task = {
      id: taskId,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      ...metadata,
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      startTime: null,
      endTime: null
    }

    this.queue.push(task)
    return taskId
  }

  /**
   * 获取队列状态
   * @returns {Object}
   */
  getStatus() {
    return {
      queue: this.queue.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        progress: t.progress,
        error: t.error
      })),
      processing: this.processing,
      total: this.queue.length,
      completed: this.queue.filter(t => t.status === 'completed').length,
      failed: this.queue.filter(t => t.status === 'failed').length,
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing_count: this.queue.filter(t => t.status === 'processing').length
    }
  }

  /**
   * 开始处理队列
   * @param {Function} onProgress - 进度回调
   * @param {Function} onComplete - 完成回调
   * @param {Function} onError - 错误回调
   */
  async start(onProgressCallback = null, onCompleteCallback = null, onErrorCallback = null) {
    this.onProgressCallback = onProgressCallback
    this.onCompleteCallback = onCompleteCallback
    this.onErrorCallback = onErrorCallback

    if (this.processing) {
      console.warn('BatchProcessor: 已有任务在处理中')
      return this.results
    }

    this.processing = true
    const processingTasks = []

    // 并行处理队列中的文件
    for (const task of this.queue) {
      if (task.status === 'pending') {
        task.status = 'processing'
        task.startTime = Date.now()

        const promise = this.processFile(task)
          .then(result => {
            task.result = result
            task.status = 'completed'
            task.endTime = Date.now()
            task.progress = 100
            this.results.set(task.id, result)

            if (this.onProgressCallback) {
              this.onProgressCallback({
                taskId: task.id,
                fileName: task.name,
                status: 'completed',
                progress: 100,
                result: result
              })
            }
          })
          .catch(error => {
            task.status = 'failed'
            task.error = error.message
            task.endTime = Date.now()
            this.results.set(task.id, { error: error.message })

            if (this.onErrorCallback) {
              this.onErrorCallback({
                taskId: task.id,
                fileName: task.name,
                status: 'failed',
                error: error.message
              })
            }
          })

        processingTasks.push(promise)

        // 控制并发数
        if (processingTasks.length >= this.concurrency) {
          await Promise.race(processingTasks.filter(p => p !== null))
        }
      }
    }

    // 等待所有任务完成
    await Promise.allSettled(processingTasks)

    this.processing = false

    // 保存结果到本地存储
    await this.saveResults()

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.results)
    }

    return this.results
  }

  /**
   * 处理单个文件
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>}
   */
  async processFile(task) {
    try {
      const formData = new FormData()
      formData.append('file', task.file)
      formData.append('displayUnit', this.options.displayUnit || 'wan')

      const response = await this.apiClient.post('/api/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            task.progress = Math.round((progressEvent.loaded / progressEvent.total) * 50)
            if (this.onProgressCallback) {
              this.onProgressCallback({
                taskId: task.id,
                fileName: task.name,
                status: 'uploading',
                progress: task.progress
              })
            }
          }
        }
      })

      task.progress = 100
      const result = response.data

      return result
    } catch (error) {
      task.progress = 0
      throw error
    }
  }

  /**
   * 保存结果到本地存储
   */
  async saveResults() {
    try {
      const resultsArray = Array.from(this.results.entries()).map(([id, result]) => ({
        taskId: id,
        result,
        savedAt: new Date().toISOString()
      }))
      localStorage.setItem('batchResults', JSON.stringify(resultsArray))
    } catch (error) {
      console.error('保存批量结果失败:', error)
    }
  }

  /**
   * 加载保存的结果
   */
  loadSavedResults() {
    try {
      const saved = localStorage.getItem('batchResults')
      if (saved) {
        const resultsArray = JSON.parse(saved)
        resultsArray.forEach(({ taskId, result }) => {
          this.results.set(taskId, result)
        })
      }
    } catch (error) {
      console.error('加载批量结果失败:', error)
    }
  }

  /**
   * 获取结果
   * @param {string} taskId - 任务ID
   * @returns {Object|null}
   */
  getResult(taskId) {
    return this.results.get(taskId)
  }

  /**
   * 获取所有结果
   * @returns {Map}
   */
  getAllResults() {
    return this.results
  }

  /**
   * 取消任务
   * @param {string} taskId - 任务ID
   * @returns {boolean}
   */
  cancelTask(taskId) {
    const taskIndex = this.queue.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return false

    const task = this.queue[taskIndex]

    // 只能取消待处理的任务
    if (task.status === 'pending') {
      this.queue.splice(taskIndex, 1)
      this.results.delete(taskId)
      return true
    }

    return false
  }

  /**
   * 重试失败的任务
   * @param {string} taskId - 任务ID
   * @returns {boolean}
   */
  async retryTask(taskId) {
    const task = this.queue.find(t => t.id === taskId)
    if (!task || task.status !== 'failed') return false

    // 重置任务状态
    task.status = 'pending'
    task.error = null
    task.progress = 0
    task.startTime = null
    task.endTime = null

    return true
  }

  /**
   * 清空队列和结果
   */
  clear() {
    this.queue = []
    this.results.clear()
    this.processing = false
  }

  /**
   * 清除已完成和失败的任务
   */
  clearCompleted() {
    this.queue = this.queue.filter(t => t.status === 'pending' || t.status === 'processing')
  }
}

export default BatchProcessor
