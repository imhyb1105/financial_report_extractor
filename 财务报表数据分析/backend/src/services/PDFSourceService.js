/**
 * PDF数据源服务
 * V2.5.1 重构 - 通过后端代理访问真实API
 * 支持从多个数据源自动抓取财务报表PDF
 */

import axios from 'axios'

/**
 * 数据源配置
 */
const DATA_SOURCES = {
  eastmoney: {
    name: '东方财富',
    priority: 1,
    enabled: true
  },
  cninfo: {
    name: '巨潮资讯',
    priority: 2,
    enabled: true
  }
}

/**
 * PDF数据源服务类
 */
class PDFSourceService {
  constructor() {
    this.sources = DATA_SOURCES
    this.timeout = 30000
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }

  /**
   * 搜索公司
   * @param {string} keyword - 股票代码或公司名称
   * @returns {Promise<Array>}
   */
  async searchCompany(keyword) {
    const results = []

    // 优先使用东方财富搜索
    try {
      const eastmoneyResults = await this.searchEastMoney(keyword)
      if (eastmoneyResults.length > 0) {
        return eastmoneyResults
      }
    } catch (error) {
      console.error('东方财富搜索失败:', error.message)
    }

    // 如果东方财富没有结果，尝试巨潮资讯
    try {
      const cninfoResults = await this.searchCNInfo(keyword)
      results.push(...cninfoResults)
    } catch (error) {
      console.error('巨潮资讯搜索失败:', error.message)
    }

    return results
  }

  /**
   * 东方财富搜索 - 使用正确的API
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchEastMoney(keyword) {
    // 东方财富股票搜索API
    const url = 'https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch'

    const response = await axios.get(url, {
      params: {
        keyword: keyword,
        type: 'stock',
        pi: 'qt'
      },
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://data.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*'
      }
    })

    const data = response.data
    if (!data || !data.Data || data.Data.length === 0) {
      // 尝试备用API
      return await this.searchEastMoneyBackup(keyword)
    }

    return data.Data.map(item => ({
      code: item.Code || item.SECUCODE?.split('.')[0],
      name: item.Name || item.SECURITY_NAME_ABBR,
      market: this.getMarketFromCode(item.Code || item.SECUCODE?.split('.')[0]),
      source: 'eastmoney',
      sourceName: '东方财富'
    }))
  }

  /**
   * 东方财富备用搜索API
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchEastMoneyBackup(keyword) {
    const url = 'https://searchapi.eastmoney.com/api/suggest/get'

    const response = await axios.get(url, {
      params: {
        input: keyword,
        type: '14',
        token: 'D43BF722C8E33BDC906FB84D85E326E8',
        count: 10
      },
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://quote.eastmoney.com/',
        'Accept': '*/*'
      }
    })

    const data = response.data
    if (!data || !data.Data) {
      return []
    }

    return data.Data
      .filter(item => item.Type === 'stock') // 只返回股票
      .map(item => ({
        code: item.Code,
        name: item.Name,
        market: this.getMarketFromCode(item.Code),
        source: 'eastmoney',
        sourceName: '东方财富'
      }))
  }

  /**
   * 巨潮资讯搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchCNInfo(keyword) {
    const url = 'http://www.cninfo.com.cn/new/information/topSearch'

    const response = await axios.post(
      url,
      new URLSearchParams({
        key: keyword,
        maxNum: 10
      }),
      {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'http://www.cninfo.com.cn/'
        }
      }
    )

    const data = response.data
    if (!data || !Array.isArray(data)) {
      return []
    }

    return data
      .filter(item => item.code) // 确保有股票代码
      .map(item => ({
        code: item.code,
        name: item.name || item.title,
        market: this.getMarketFromCode(item.code),
        source: 'cninfo',
        sourceName: '巨潮资讯'
      }))
  }

  /**
   * 获取公司年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型 (sh/sz)
   * @returns {Promise<Array>}
   */
  async getAnnualReports(code, market = 'sh') {
    // 优先尝试东方财富
    try {
      const reports = await this.getEastMoneyReports(code, market)
      if (reports.length > 0) {
        return reports
      }
    } catch (error) {
      console.error('获取东方财富年报失败:', error.message)
    }

    // 尝试巨潮资讯
    try {
      const reports = await this.getCNInfoReports(code, market)
      return reports
    } catch (error) {
      console.error('获取巨潮资讯年报失败:', error.message)
    }

    return []
  }

  /**
   * 获取东方财富年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型
   * @returns {Promise<Array>}
   */
  async getEastMoneyReports(code, market) {
    const secucode = market === 'sh' ? `${code}.SH` : `${code}.SZ`

    // 东方财富公告API
    const url = 'https://data.eastmoney.com/api/data/v1/get'

    const response = await axios.get(url, {
      params: {
        reportName: 'RPT_ANN_LIST',
        columns: 'SECURITY_CODE,SECURITY_NAME_ABBR,NOTICE_DATE,TITLE,ADJUST_URL',
        filter: `(SECUCODE="${secucode}")`,
        pageNumber: 1,
        pageSize: 30,
        sortColumns: 'NOTICE_DATE',
        sortTypes: '-1'
      },
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://data.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*'
      }
    })

    const data = response.data
    if (!data || !data.result || !data.result.data) {
      return []
    }

    // 过滤年报
    return data.result.data
      .filter(item => this.isAnnualReport(item.TITLE))
      .map(item => ({
        title: item.TITLE,
        code: item.SECURITY_CODE,
        name: item.SECURITY_NAME_ABBR,
        publishDate: item.NOTICE_DATE,
        url: item.ADJUST_URL,
        source: 'eastmoney',
        sourceName: '东方财富'
      }))
  }

  /**
   * 获取巨潮资讯年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型
   * @returns {Promise<Array>}
   */
  async getCNInfoReports(code, market) {
    const url = 'http://www.cninfo.com.cn/new/hisAnnouncement/query'

    const secCode = market === 'sh' ? `sh${code}` : `sz${code}`

    const response = await axios.post(
      url,
      new URLSearchParams({
        stock: secCode,
        tabName: 'fulltext',
        pageSize: 30,
        pageNum: 1,
        seDate: '',
        searchkey: '年度报告',
        category: 'category_ndbg_szsh',
        isHLtitle: 'true'
      }),
      {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'http://www.cninfo.com.cn/'
        }
      }
    )

    const data = response.data
    if (!data || !data.announcements) {
      return []
    }

    return data.announcements
      .filter(item => this.isAnnualReport(item.announcementTitle))
      .map(item => ({
        title: item.announcementTitle,
        code: item.secCode,
        name: item.secName,
        publishDate: this.formatTimestamp(item.announcementTime),
        url: `http://www.cninfo.com.cn/new/disclosure/detail?stockCode=${item.secCode}&announcementId=${item.announcementId}&orgId=${item.orgId}`,
        source: 'cninfo',
        sourceName: '巨潮资讯'
      }))
  }

  /**
   * 下载PDF
   * @param {string} url - PDF下载URL
   * @returns {Promise<Buffer>}
   */
  async downloadPDF(url) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/pdf,*/*'
      }
    })

    return Buffer.from(response.data)
  }

  /**
   * 判断是否为年报
   * @param {string} title - 报告标题
   * @returns {boolean}
   */
  isAnnualReport(title) {
    if (!title) return false
    const keywords = ['年度报告', '年报']
    const excludeKeywords = ['摘要', '更正', '补充', '取消', '英文版', '港股']

    const hasKeyword = keywords.some(k => title.includes(k))
    const hasExclude = excludeKeywords.some(k => title.includes(k))

    return hasKeyword && !hasExclude
  }

  /**
   * 根据股票代码判断市场
   * @param {string} code - 股票代码
   * @returns {string}
   */
  getMarketFromCode(code) {
    if (!code) return 'unknown'
    const cleanCode = code.replace(/^[a-zA-Z]+/, '') // 移除前缀
    if (cleanCode.startsWith('6')) return 'sh'
    if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) return 'sz'
    if (cleanCode.startsWith('4') || cleanCode.startsWith('8')) return 'bj'
    return 'unknown'
  }

  /**
   * 格式化时间戳
   * @param {number|string} timestamp - 时间戳
   * @returns {string}
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return ''
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toISOString().split('T')[0]
      }
      return timestamp.split(' ')[0] // 如果是字符串格式
    } catch {
      return ''
    }
  }

  /**
   * 获取数据源配置
   * @returns {Object}
   */
  getSourceConfig() {
    return this.sources
  }

  /**
   * 更新数据源优先级
   * @param {string} sourceId - 数据源ID
   * @param {number} priority - 优先级
   */
  updateSourcePriority(sourceId, priority) {
    if (this.sources[sourceId]) {
      this.sources[sourceId].priority = priority
    }
  }

  /**
   * 启用/禁用数据源
   * @param {string} sourceId - 数据源ID
   * @param {boolean} enabled - 是否启用
   */
  toggleSource(sourceId, enabled) {
    if (this.sources[sourceId]) {
      this.sources[sourceId].enabled = enabled
    }
  }
}

export default PDFSourceService
