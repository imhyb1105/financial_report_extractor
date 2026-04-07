/**
 * 数据库统一入口
 * V2.7 重构 - 支持 SQLite 和 Supabase 切换
 *
 * 使用环境变量 DATABASE_PROVIDER 选择:
 * - 'sqlite' (默认，本地开发)
 * - 'supabase' (生产环境)
 */

import sqliteDb from './db.impl.sqlite.js'
import supabaseDb from './db.impl.supabase.js'

const provider = process.env.DATABASE_PROVIDER || 'sqlite'

// 选择数据库提供者
const db = provider === 'supabase' ? supabaseDb : sqliteDb

if (provider === 'supabase') {
  console.log('📌 使用 Supabase 数据库')
} else {
  console.log('📌 使用 SQLite 数据库 (sql.js)')
}

// 导出统一的 API
export const getDatabase = db.getDatabase
export const initDatabase = db.initDatabase || db.initDatabase
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
