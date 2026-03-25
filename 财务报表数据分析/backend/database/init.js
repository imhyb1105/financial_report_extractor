/**
 * 数据库初始化脚本
 * 运行方式: node database/init.js
 */
import db from './db.js'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🚀 开始初始化数据库...')

  try {
    // 1. 初始化表结构
    await db.initDatabase()

    // 2. 检查是否已有管理员
    const admin = await db.queryOne('SELECT id FROM admins LIMIT 1')

    if (!admin) {
      // 3. 创建默认管理员
      const defaultPassword = 'admin123'
      const passwordHash = await bcrypt.hash(defaultPassword, 10)

      await db.run(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        ['admin', passwordHash]
      )

      console.log('✅ 默认管理员创建成功')
      console.log('   用户名: admin')
      console.log('   密码: admin123')
      console.log('   ⚠️ 请登录后立即修改密码!')
    } else {
      console.log('ℹ️  管理员已存在，跳过创建')
    }

    // 4. 创建今日统计记录
    const today = new Date().toISOString().split('T')[0]
    await db.run(
      `INSERT OR IGNORE INTO daily_stats (stat_date) VALUES (?)`,
      [today]
    )

    console.log('✅ 数据库初始化完成!')

    // 关闭数据库
    db.closeDatabase()

    process.exit(0)
  } catch (err) {
    console.error('❌ 初始化失败:', err)
    process.exit(1)
  }
}

main()
