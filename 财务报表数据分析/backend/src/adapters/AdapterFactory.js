import BaseAdapter from './BaseAdapter.js'
import ClaudeAdapter from './ClaudeAdapter.js'
import OpenAIAdapter from './OpenAIAdapter.js'
import GeminiAdapter from './GeminiAdapter.js'
import DeepSeekAdapter from './DeepSeekAdapter.js'
import KimiAdapter from './KimiAdapter.js'
import GLMAdapter from './GLMAdapter.js'
import MiniMaxAdapter from './MiniMaxAdapter.js'
import DoubaoAdapter from './DoubaoAdapter.js'

/**
 * 适配器工厂
 * 根据provider创建对应的适配器实例
 */
class AdapterFactory {
  static adapters = {
    claude: ClaudeAdapter,
    openai: OpenAIAdapter,
    gemini: GeminiAdapter,
    deepseek: DeepSeekAdapter,
    kimi: KimiAdapter,
    glm: GLMAdapter,
    minimax: MiniMaxAdapter,
    doubao: DoubaoAdapter
  }

  /**
   * 创建适配器实例
   * @param {string} provider - 模型提供商
   * @param {string} apiKey - API密钥
   * @param {Object} options - 可选配置
   * @returns {BaseAdapter|null}
   */
  static createAdapter(provider, apiKey, options = {}) {
    const AdapterClass = this.adapters[provider.toLowerCase()]

    if (!AdapterClass) {
      console.warn(`Unsupported provider: ${provider}`)
      return null
    }

    return new AdapterClass(apiKey, options)
  }

  /**
   * 获取支持的提供商列表
   * @returns {string[]}
   */
  static getSupportedProviders() {
    return Object.keys(this.adapters)
  }

  /**
   * 检查提供商是否支持
   * @param {string} provider
   * @returns {boolean}
   */
  static isProviderSupported(provider) {
    return provider.toLowerCase() in this.adapters
  }
}

export default AdapterFactory
