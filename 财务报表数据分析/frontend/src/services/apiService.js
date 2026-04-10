import axios from 'axios'

const API_BASE_URL = '/api'

// Vercel Hobby plan 请求体大小限制为4.5MB，预留安全余量
const PDF_SIZE_THRESHOLD = 4 * 1024 * 1024 // 4MB

// 验证 API Key
export async function validateApiKey(provider, apiKey) {
  try {
    const response = await axios.post(`${API_BASE_URL}/validate`, {
      provider,
      apiKey
    })
    return response.data
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

// 提取数据
// V1.7: 返回 { data, debugLog } 结构
// V2.6: 大文件（>4MB）使用客户端文本提取，绕过Vercel body size限制
export async function extractData(file, models, displayUnit, onProgress) {
  if (file.size > PDF_SIZE_THRESHOLD) {
    return extractDataFromText(file, models, displayUnit, onProgress)
  }

  const formData = new FormData()
  formData.append('pdf', file)
  formData.append('models', JSON.stringify(models))
  formData.append('displayUnit', displayUnit)

  // 模拟进度更新（实际项目中应该使用 SSE 或 WebSocket）
  let progress = 0
  const progressInterval = setInterval(() => {
    progress += 5
    if (progress <= 90) {
      onProgress?.(progress)
    }
  }, 1000)

  try {
    const response = await axios.post(`${API_BASE_URL}/extract`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 600000 // 10分钟超时（三模型流程需要~7分钟）
    })

    clearInterval(progressInterval)
    onProgress?.(100)

    // V1.7: 后端返回 { success: true, data, debugLog }
    const { success, data, debugLog } = response.data

    if (!success) {
      throw new Error(response.data.error?.message || '提取失败')
    }

    return { data, debugLog }
  } catch (error) {
    clearInterval(progressInterval)
    throw new Error(error.response?.data?.error?.message || error.message)
  }
}

/**
 * 大文件提取：客户端先提取PDF文本，再发送文本到后端处理
 * 解决Vercel Hobby plan 4.5MB请求体限制
 */
async function extractDataFromText(file, models, displayUnit, onProgress) {
  // 动态导入pdfjs-dist（仅大文件时加载，避免增加主bundle体积）
  const { extractPDFText } = await import('../utils/pdfTextExtractor.js')

  // 阶段1：客户端提取PDF文本（占0-30%进度）
  let pdfResult
  try {
    pdfResult = await extractPDFText(file, (p) => {
      onProgress?.(Math.round(p * 0.3))
    })
  } catch (error) {
    throw new Error(`PDF文本提取失败: ${error.message}`)
  }

  // 阶段2：模拟30-90%进度
  let progress = 30
  const progressInterval = setInterval(() => {
    progress += 5
    if (progress <= 90) {
      onProgress?.(progress)
    }
  }, 1000)

  try {
    // 发送提取的文本到后端（JSON格式，通常<2MB）
    const response = await axios.post(`${API_BASE_URL}/extract`, {
      textContent: pdfResult.fullText,
      pages: pdfResult.pages,
      pageCount: pdfResult.pageCount,
      fileName: file.name,
      models,
      displayUnit
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 600000
    })

    clearInterval(progressInterval)
    onProgress?.(100)

    const { success, data, debugLog } = response.data

    if (!success) {
      throw new Error(response.data.error?.message || '提取失败')
    }

    return { data, debugLog }
  } catch (error) {
    clearInterval(progressInterval)
    throw new Error(error.response?.data?.error?.message || error.message)
  }
}

// 获取支持的模型列表
export async function getSupportedModels() {
  try {
    const response = await axios.get(`${API_BASE_URL}/models`)
    return response.data
  } catch (error) {
    console.error('Failed to get supported models:', error)
    return { success: false, models: [] }
  }
}
