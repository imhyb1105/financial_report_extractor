/**
 * 文件存储服务
 * V2.7 新增 - 支持 Supabase Storage
 * 本地开发使用本地文件系统，生产环境使用 Supabase Storage
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import supabase, { STORAGE_BUCKETS } from '../config/supabase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 本地存储路径
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads')
const LOCAL_LOG_DIR = path.join(__dirname, '../../logs')

// 是否使用 Supabase Storage
const useSupabase = process.env.DATABASE_PROVIDER === 'supabase' && supabase

/**
 * 确保本地目录存在
 */
async function ensureLocalDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // 目录已存在
  }
}

/**
 * 上传文件
 * @param {string} bucket - 存储桶名称
 * @param {string} filename - 文件名
 * @param {Buffer|Blob} content - 文件内容
 * @param {Object} options - 选项
 * @returns {Promise<{path: string, url: string}>}
 */
export async function uploadFile(bucket, filename, content, options = {}) {
  if (useSupabase) {
    // 使用 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, content, {
        contentType: options.contentType,
        upsert: options.upsert || false
      })

    if (error) {
      console.error('❌ 上传文件到 Supabase 失败:', error.message)
      throw new Error(error.message)
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename)

    return {
      path: data.path,
      url: urlData.publicUrl
    }
  } else {
    // 使用本地文件系统
    const dir = bucket === STORAGE_BUCKETS.PDF_FILES ? LOCAL_UPLOAD_DIR : LOCAL_LOG_DIR
    await ensureLocalDir(dir)

    const filePath = path.join(dir, filename)
    await fs.writeFile(filePath, content)

    return {
      path: filePath,
      url: `/uploads/${bucket}/${filename}`
    }
  }
}

/**
 * 下载文件
 * @param {string} bucket - 存储桶名称
 * @param {string} filename - 文件名
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(bucket, filename) {
  if (useSupabase) {
    // 使用 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filename)

    if (error) {
      console.error('❌ 从 Supabase 下载文件失败:', error.message)
      throw new Error(error.message)
    }

    // data 是 Blob，转换为 Buffer
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } else {
    // 使用本地文件系统
    const dir = bucket === STORAGE_BUCKETS.PDF_FILES ? LOCAL_UPLOAD_DIR : LOCAL_LOG_DIR
    const filePath = path.join(dir, filename)
    return await fs.readFile(filePath)
  }
}

/**
 * 删除文件
 * @param {string} bucket - 存储桶名称
 * @param {string} filename - 文件名
 * @returns {Promise<boolean>}
 */
export async function deleteFile(bucket, filename) {
  if (useSupabase) {
    // 使用 Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filename])

    if (error) {
    console.error('❌ 从 Supabase 删除文件失败:', error.message)
    return false
    }

    return true
  } else {
    // 使用本地文件系统
    const dir = bucket === STORAGE_BUCKETS.PDF_FILES ? LOCAL_UPLOAD_DIR : LOCAL_LOG_DIR
    const filePath = path.join(dir, filename)
    try {
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  }
}

/**
 * 列出文件
 * @param {string} bucket - 存储桶名称
 * @param {string} prefix - 文件前缀
 * @returns {Promise<Array>}
 */
export async function listFiles(bucket, prefix = '') {
  if (useSupabase) {
    // 使用 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('❌ 列出 Supabase 文件失败:', error.message)
      return []
    }

    return data.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }))
  } else {
    // 使用本地文件系统
    const dir = bucket === STORAGE_BUCKETS.PDF_FILES ? LOCAL_UPLOAD_DIR : LOCAL_LOG_DIR
    const targetDir = prefix ? path.join(dir, prefix) : dir

    try {
    const files = await fs.readdir(targetDir, { withFileTypes: true })
      const fileInfos = await Promise.all(
        files
          .filter(f => f.isFile())
          .map(async f => {
            const filePath = path.join(targetDir, f.name)
            const stats = await fs.stat(filePath)
            return {
              name: f.name,
              size: stats.size,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime
            }
          })
      )

      return fileInfos
    } catch {
      return []
    }
  }
}

/**
 * 获取文件公开URL
 * @param {string} bucket - 存储桶名称
 * @param {string} filename - 文件名
 * @returns {string}
 */
export function getPublicUrl(bucket, filename) {
  if (useSupabase) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename)

    return data.publicUrl
  } else {
    return `/api/files/${bucket}/${filename}`
  }
}

/**
 * 生成唯一文件名
 * @param {string} originalName - 原始文件名
 * @param {string} prefix - 前缀
 * @returns {string}
 */
export function generateUniqueFilename(originalName, prefix = '') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName) || ''
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .substring(0, 50)

  const parts = [timestamp, random, baseName].filter(Boolean)
  const filename = parts.join('_') + ext

  return prefix ? `${prefix}/${filename}` : filename
}

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  getPublicUrl,
  generateUniqueFilename,
  STORAGE_BUCKETS
}
