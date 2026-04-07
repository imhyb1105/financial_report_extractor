import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import CryptoJS from 'crypto-js'

// API Key 加密存储
const encryptApiKey = (key, password) => {
  const salt = CryptoJS.lib.WordArray.random(128 / 8)
  const keyDerived = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 100000 })
  const encrypted = CryptoJS.AES.encrypt(key, keyDerived.toString())
  return { encrypted: encrypted.toString(), salt: salt.toString() }
}

const decryptApiKey = (encrypted, salt, password) => {
  const keyDerived = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), { keySize: 256 / 32, iterations: 100000 })
  const decrypted = CryptoJS.AES.decrypt(encrypted, keyDerived.toString())
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export const useStore = create(
  persist(
    (set, get) => ({
      // 模型配置
      modelConfigs: {
        modelA: { provider: '', apiKey: '', model: '', valid: false },
        modelB: { provider: '', apiKey: '', model: '', valid: false },
        modelC: { provider: '', apiKey: '', model: '', valid: false }
      },

      // 单位设置
      displayUnit: 'wan', // yuan, wan, yi

      // 提取状态
      isExtracting: false,
      extractionProgress: 0,
      extractionResult: null,
      extractionError: null,
      debugLog: null, // V1.7: AI调试日志

      // 历史记录
      history: [],

      // 选中的文件（用于PDF自动抓取和上传）
      selectedFile: null,
      fileInfo: null,

      // 密码（会话级）
      encryptionPassword: null,

      // Actions
      setModelConfig: (role, config) => set(state => ({
        modelConfigs: { ...state.modelConfigs, [role]: { ...state.modelConfigs[role], ...config } }
      })),

      setDisplayUnit: (unit) => set({ displayUnit: unit }),

      setEncryptionPassword: (password) => set({ encryptionPassword: password }),

      startExtraction: () => set({
        isExtracting: true,
        extractionProgress: 0,
        extractionResult: null,
        extractionError: null
      }),

      setExtractionProgress: (progress) => set({ extractionProgress: progress }),

      setExtractionResult: (result, debugLog = null) => set({
        isExtracting: false,
        extractionProgress: 100,
        extractionResult: result,
        debugLog // V1.7: 存储调试日志
      }),

      setExtractionError: (error) => set({
        isExtracting: false,
        extractionError: error,
        debugLog: null
      }),

      // V1.7: 清除调试日志
      clearDebugLog: () => set({ debugLog: null }),

      addToHistory: (record) => set(state => ({
        history: [record, ...state.history].slice(0, 50) // 保留最近50条
      })),

      clearHistory: () => set({ history: [] }),

      // 设置选中的文件
      setSelectedFile: (file, info = null) => set({
        selectedFile: file,
        fileInfo: info
      }),

      // 清除选中的文件
      clearSelectedFile: () => set({
        selectedFile: null,
        fileInfo: null
      }),

      // 获取有效的模型配置
      getValidModels: () => {
        const { modelConfigs } = get()
        const validModels = []
        if (modelConfigs.modelA.valid && modelConfigs.modelA.apiKey) {
          validModels.push({ role: 'A', ...modelConfigs.modelA })
        }
        if (modelConfigs.modelB.valid && modelConfigs.modelB.apiKey) {
          validModels.push({ role: 'B', ...modelConfigs.modelB })
        }
        if (modelConfigs.modelC.valid && modelConfigs.modelC.apiKey) {
          validModels.push({ role: 'C', ...modelConfigs.modelC })
        }
        return validModels
      }
    }),
    {
      name: 'financial-extractor-storage',
      partialize: (state) => ({
        modelConfigs: state.modelConfigs,
        displayUnit: state.displayUnit,
        history: state.history
      })
    }
  )
)
