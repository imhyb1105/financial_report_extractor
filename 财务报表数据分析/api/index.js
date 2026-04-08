/**
 * Vercel Serverless Function - 诊断版
 * 使用纯动态 import + 错误捕获定位 500 错误原因
 */

let app = null
let initError = null

async function initialize() {
  try {
    console.log('[diag] 开始初始化...')
    console.log('[diag] DATABASE_PROVIDER:', process.env.DATABASE_PROVIDER || 'not set')
    console.log('[diag] SUPABASE_URL:', process.env.SUPABASE_URL ? 'configured' : 'not set')

    // 动态导入数据库模块
    console.log('[diag] 正在导入 db.js...')
    const db = await import('../backend/database/db.js')
    console.log('[diag] db.js 导入成功, 导出:', Object.keys(db))

    // 动态导入 Express app
    console.log('[diag] 正在导入 app-handler.js...')
    const appModule = await import('../backend/src/app-handler.js')
    app = appModule.default
    console.log('[diag] app-handler.js 导入成功')
  } catch (error) {
    console.error('[diag] 初始化失败:', error.message)
    console.error('[diag] 错误堆栈:', error.stack)
    initError = error
  }
}

// ESM top-level await - 在模块加载时初始化
await initialize()

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 如果初始化失败，返回诊断信息
  if (initError) {
    return res.status(500).json({
      status: 'error',
      phase: 'initialization',
      error: initError.message,
      stack: initError.stack?.split('\n').slice(0, 15),
      env: {
        DATABASE_PROVIDER: process.env.DATABASE_PROVIDER || 'not set',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'configured' : 'not set',
        NODE_VERSION: process.version
      }
    })
  }

  // 委托给 Express app
  return app(req, res)
}
