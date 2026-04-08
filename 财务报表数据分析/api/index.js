/**
 * Vercel Serverless Function 入口
 * 将 Express 应用适配为 Vercel Function
 */

// 数据库初始化标志（在函数实例生命周期内保持）
let dbInitialized = false
let appHandler = null

export default async function handler(req, res) {
  // 延迟初始化（只执行一次）
  if (!dbInitialized) {
    const { initDatabase } = await import('../backend/database/db.js')
    await initDatabase()
    dbInitialized = true
  }

  // 延迟加载 Express 应用（避免启动时监听端口）
  if (!appHandler) {
    const { default: app } = await import('../backend/src/app-handler.js')
    appHandler = app
  }

  // 将请求传递给 Express 应用
  return new Promise((resolve, reject) => {
    appHandler(req, res, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
