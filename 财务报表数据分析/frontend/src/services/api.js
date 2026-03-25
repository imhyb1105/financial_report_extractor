/**
 * API 服务
 * 统一管理所有 API 请求
 */
import axios from 'axios'

// API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分钟超时（处理大文件）
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回错误
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error('Network Error:', error.message)
    } else {
      // 请求配置错误
      console.error('Request Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
