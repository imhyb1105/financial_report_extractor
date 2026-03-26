/**
 * SQLite 数据库连接模块
 * V2.0 新增
 * 使用 sql.js (纯 JavaScript 实现，无需编译)
 */
import initSqlJs from 'sql.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

let db = null
let SQL = null

/**
 * 获取数据库连接 (单例模式)
 */
export async function getDatabase() {
  if (!db) {
    // 初始化 sql.js
    SQL = await initSqlJs()

    // 确保 database 目录存在
    const dbDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // 尝试加载现有数据库
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    console.log('✅ 数据库连接成功:', DB_PATH)
  }

  return db
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

/**
 * 初始化数据库表结构
 */
export async function initDatabase() {
  await getDatabase()

  try {
    // 读取 schema.sql
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')

    // 处理SQL语句：移除注释，正确分割
    const statements = schema
      // 先按行分割，移除注释行
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('--')
      })
      // 重新组合成字符串
      .join('\n')
      // 按分号分割成独立语句
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`📝 准备执行 ${statements.length} 条SQL语句...`)

    for (const sql of statements) {
      try {
        db.run(sql + ';')
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error('❌ SQL 执行失败:', err.message)
        }
      }
    }

    // 保存数据库
    saveDatabase()

    console.log('✅ 数据库表结构初始化完成')
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err)
    throw err
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
    console.log('✅ 数据库连接已关闭')
    db = null
  }
}

/**
 * 执行查询 (返回多行)
 */
export async function query(sql, params = []) {
  await getDatabase()
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)

    const results = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(row)
    }
    stmt.free()

    return results
  } catch (err) {
    console.error('❌ 查询失败:', err.message)
    throw err
  }
}

/**
 * 执行查询 (返回单行)
 */
export async function queryOne(sql, params = []) {
  await getDatabase()
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)

    let result = null
    if (stmt.step()) {
      result = stmt.getAsObject()
    }
    stmt.free()

    return result
  } catch (err) {
    console.error('❌ 查询失败:', err.message)
    throw err
  }
}

/**
 * 执行插入/更新/删除
 */
export async function run(sql, params = []) {
  await getDatabase()
  try {
    db.run(sql, params)

    // 保存更改
    saveDatabase()

    return {
      id: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0,
      changes: db.getRowsModified()
    }
  } catch (err) {
    console.error('❌ 执行失败:', err.message)
    throw err
  }
}

/**
 * 执行事务
 */
export async function transaction(callback) {
  await getDatabase()

  try {
    db.run('BEGIN TRANSACTION')
    const result = await callback({ query, queryOne, run })
    db.run('COMMIT')
    saveDatabase()
    return result
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
}

export default {
  getDatabase,
  initDatabase,
  closeDatabase,
  query,
  queryOne,
  run,
  transaction
}
