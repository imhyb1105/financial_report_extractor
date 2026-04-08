/**
 * Vercel Serverless Function - 最小测试版
 * 用于验证函数基础设施是否正常
 */

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  res.status(200).json({
    status: 'ok',
    message: 'API function is working',
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_PROVIDER: process.env.DATABASE_PROVIDER || 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'configured' : 'not set',
      NODE_VERSION: process.version,
      VERCEL: process.env.VERCEL || 'not set'
    },
    method: req.method,
    url: req.url
  })
}
