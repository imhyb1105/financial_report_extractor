/**
 * Supabase 客户端配置
 * V2.7 新增 - 支持 Supabase PostgreSQL + Storage
 */

import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY // 服务端使用

// 验证配置
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase 配置缺失，请设置 SUPABASE_URL 和 SUPABASE_ANON_KEY 环境变量')
}

/**
 * Supabase 客户端（服务端使用，拥有完全权限）
 */
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null

/**
 * 存储桶名称
 */
export const STORAGE_BUCKETS = {
  PDF_FILES: 'pdf-files',
  AUDIT_LOGS: 'audit-logs'
}

/**
 * 初始化存储桶
 */
export async function initStorageBuckets() {
  if (!supabase) {
    console.warn('⚠️ Supabase 未配置，跳过存储桶初始化')
    return
  }

  try {
    // 检查并创建 PDF 存储桶
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ 获取存储桶列表失败:', error.message)
      return
    }

    const bucketNames = buckets.map(b => b.name)

    // 创建 pdf-files 存储桶
    if (!bucketNames.includes(STORAGE_BUCKETS.PDF_FILES)) {
      const { error: createError } = await supabase.storage.createBucket(
        STORAGE_BUCKETS.PDF_FILES,
        {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        }
      )
      if (createError) {
        console.error('❌ 创建 pdf-files 存储桶失败:', createError.message)
      } else {
        console.log('✅ 创建 pdf-files 存储桶成功')
      }
    }

    console.log('✅ Supabase 存储桶初始化完成')
  } catch (err) {
    console.error('❌ 初始化存储桶失败:', err)
  }
}

/**
 * 检查 Supabase 连接状态
 */
export async function checkConnection() {
  if (!supabase) {
    return { connected: false, message: 'Supabase 未配置' }
  }

  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1)
    // 如果表不存在会返回错误，但说明连接成功
    return { connected: true, message: 'Supabase 连接正常' }
  } catch (err) {
    return { connected: false, message: err.message }
  }
}

export default supabase
