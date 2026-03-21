/**
 * 错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err)

  // Multer错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: '文件大小超过限制（最大50MB）'
      }
    })
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNEXPECTED_FILE',
        message: '意外的文件字段'
      }
    })
  }

  // 文件类型错误
  if (err.message.includes('只支持PDF文件')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message
      }
    })
  }

  // API错误
  if (err.response) {
    return res.status(err.response.status || 500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: err.response.data?.message || '外部API调用失败'
      }
    })
  }

  // 默认错误
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误'
    }
  })
}

export default errorHandler
