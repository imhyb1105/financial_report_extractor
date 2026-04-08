/**
 * 数据库统一入口
 * V2.7 重构 - 支持 SQLite 和 Supabase 切换
 *
 * 使用环境变量 DATABASE_PROVIDER 选择:
 * - 'sqlite' (默认，本地开发)
 * - 'supabase' (生产环境)
 *
 * 使用动态 import 避免在 Vercel 上加载 sql.js WASM 模块
 */

const provider = process.env.DATABASE_PROVIDER || 'sqlite'

let db

if (provider === 'supabase') {
  console.log('📌 使用 Supabase 数据库')
  const mod = await import('./db.impl.supabase.js')
  db = mod.default
} else {
  console.log('📌 使用 SQLite 数据库 (sql.js)')
  const mod = await import('./db.impl.sqlite.js')
  db = mod.default
}

// 导出统一的 API
export const getDatabase = db.getDatabase
export const initDatabase = db.initDatabase
export const closeDatabase = db.closeDatabase
export const query = db.query
export const queryOne = db.queryOne
export const run = db.run
export const transaction = db.transaction

export default {
  getDatabase,
  initDatabase,
  closeDatabase,
  query,
  queryOne,
  run,
  transaction
}
