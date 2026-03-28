import axios from 'axios'

const API_BASE_URL = '/api'

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
export async function extractData(file, models, displayUnit, onProgress) {
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
