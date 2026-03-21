/**
 * 请求限流中间件
 */

const requestCounts = new Map()
const WINDOW_MS = 60 * 1000 // 1分钟
const MAX_REQUESTS = 100 // 每分钟最大请求数

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress
  const now = Date.now()

  // 清理过期记录
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.timestamp > WINDOW_MS) {
      requestCounts.delete(key)
    }
  }

  // 获取或创建记录
  let record = requestCounts.get(ip)
  if (!record || now - record.timestamp > WINDOW_MS) {
    record = { count: 0, timestamp: now }
  }

  record.count++
  requestCounts.set(ip, record)

  // 设置响应头
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - record.count))
  res.setHeader('X-RateLimit-Reset', new Date(record.timestamp + WINDOW_MS).toISOString())

  // 检查是否超限
  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试'
      }
    })
  }

  next()
}

export default rateLimiter
