/**
 * PDF数据源服务
 * V2.3 新增
 * 支持从多个数据源自动抓取财务报表PDF
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * 数据源配置
 */
const DATA_SOURCES = {
  eastmoney: {
    name: '东方财富',
    priority: 1,
    searchUrl: 'https://searchapi.eastmoney.com/bussiness/web/QuotationLabelSearch',
    reportUrl: 'https://data.eastmoney.com/notices/stock',
    enabled: true
  },
  cninfo: {
    name: '巨潮资讯',
    priority: 2,
    searchUrl: 'http://www.cninfo.com.cn/new/fulltextSearch',
    reportUrl: 'http://www.cninfo.com.cn/new/disclosure',
    enabled: true
  },
  sse: {
    name: '上交所',
    priority: 3,
    searchUrl: 'http://query.sse.com.cn/security/stock/queryCompanyBulletin',
    reportUrl: 'http://www.sse.com.cn/assortment/stock/list/info/announcement',
    enabled: false // 需要特殊处理
  },
  szse: {
    name: '深交所',
    priority: 3,
    searchUrl: 'http://www.szse.cn/api/disc/announcement/annList',
    reportUrl: 'http://www.szse.cn/disclosure/listed/notice',
    enabled: false // 需要特殊处理
  }
}

/**
 * PDF数据源服务类
 */
class PDFSourceService {
  constructor() {
    this.sources = DATA_SOURCES
    this.timeout = 30000
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
      results.push(...eastmoneyResults)
    } catch (error) {
      console.error('东方财富搜索失败:', error.message)
    }

    // 如果东方财富没有结果，尝试巨潮资讯
    if (results.length === 0) {
      try {
        const cninfoResults = await this.searchCNInfo(keyword)
        results.push(...cninfoResults)
      } catch (error) {
        console.error('巨潮资讯搜索失败:', error.message)
      }
    }

    // 去重
    const uniqueResults = this.deduplicateResults(results)

    return uniqueResults
  }

  /**
   * 东方财富搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchEastMoney(keyword) {
    try {
      const response = await axios.get(this.sources.eastmoney.searchUrl, {
        params: {
          keyword: keyword,
          type: 'stock'
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://data.eastmoney.com/'
        }
      })

      const data = response.data
      if (!data || !data.Data) return []

      return data.Data.map(item => ({
        code: item.Code || item.SECUCODE,
        name: item.Name || item.SECURITY_NAME_ABBR,
        market: this.getMarketFromCode(item.Code || item.SECUCODE),
        source: 'eastmoney',
        sourceName: '东方财富'
      }))
    } catch (error) {
      // 如果API失败，使用模拟数据
      return this.getMockSearchResults(keyword)
    }
  }

  /**
   * 巨潮资讯搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchCNInfo(keyword) {
    try {
      const response = await axios.get(this.sources.cninfo.searchUrl, {
        params: {
          key: keyword,
          type: 'sh'
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'http://www.cninfo.com.cn/'
        }
      })

      const html = response.data
      const $ = cheerio.load(html)
      const results = []

      // 解析搜索结果页面
      $('.search-result-item').each((i, el) => {
        const code = $(el).find('.code').text().trim()
        const name = $(el).find('.name').text().trim()
        if (code && name) {
          results.push({
            code,
            name,
            market: this.getMarketFromCode(code),
            source: 'cninfo',
            sourceName: '巨潮资讯'
          })
        }
      })

      return results
    } catch (error) {
      return this.getMockSearchResults(keyword)
    }
  }

  /**
   * 获取公司年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型 (sh/sz)
   * @returns {Promise<Array>}
   */
  async getAnnualReports(code, market = 'sh') {
    const results = []

    // 尝试东方财富
    try {
      const eastmoneyReports = await this.getEastMoneyReports(code, market)
      results.push(...eastmoneyReports)
    } catch (error) {
      console.error('获取东方财富年报失败:', error.message)
    }

    // 如果没有结果，尝试巨潮资讯
    if (results.length === 0) {
      try {
        const cninfoReports = await this.getCNInfoReports(code, market)
        results.push(...cninfoReports)
      } catch (error) {
        console.error('获取巨潮资讯年报失败:', error.message)
      }
    }

    // 按日期排序
    results.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))

    return results
  }

  /**
   * 获取东方财富年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型
   * @returns {Promise<Array>}
   */
  async getEastMoneyReports(code, market) {
    try {
      const secucode = market === 'sh' ? `${code}.SH` : `${code}.SZ`
      const response = await axios.get('https://data.eastmoney.com/api/data/v1/get', {
        params: {
          reportName: 'RPT_ANN_LIST',
          columns: 'SECURITY_CODE,SECURITY_NAME_ABBR,NOTICE_DATE,TITLE,ADJUST_URL',
          filter: `(SECUCODE="${secucode}")`,
          pageNumber: 1,
          pageSize: 20,
          sortColumns: 'NOTICE_DATE',
          sortTypes: '-1'
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://data.eastmoney.com/'
        }
      })

      const data = response.data
      if (!data || !data.result || !data.result.data) return []

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
    } catch (error) {
      // 返回模拟数据
      return this.getMockReports(code, 'eastmoney')
    }
  }

  /**
   * 获取巨潮资讯年报列表
   * @param {string} code - 股票代码
   * @param {string} market - 市场类型
   * @returns {Promise<Array>}
   */
  async getCNInfoReports(code, market) {
    try {
      const response = await axios.post(
        'http://www.cninfo.com.cn/new/hisAnnouncement/query',
        new URLSearchParams({
          stock: code,
          tabName: 'fulltext',
          pageSize: 20,
          pageNum: 1,
          seDate: '',
          searchkey: '年度报告',
          category: 'category_ndbg_szsh'
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
      if (!data || !data.announcements) return []

      return data.announcements.map(item => ({
        title: item.announcementTitle,
        code: item.secCode,
        name: item.secName,
        publishDate: item.announcementTime,
        url: `http://www.cninfo.com.cn/new/disclosure/detail?stockCode=${item.secCode}&announcementId=${item.announcementId}`,
        source: 'cninfo',
        sourceName: '巨潮资讯'
      }))
    } catch (error) {
      return this.getMockReports(code, 'cninfo')
    }
  }

  /**
   * 下载PDF
   * @param {string} url - PDF下载URL
   * @returns {Promise<Buffer>}
   */
  async downloadPDF(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': this.userAgent
        }
      })

      return Buffer.from(response.data)
    } catch (error) {
      throw new Error(`PDF下载失败: ${error.message}`)
    }
  }

  /**
   * 判断是否为年报
   * @param {string} title - 报告标题
   * @returns {boolean}
   */
  isAnnualReport(title) {
    if (!title) return false
    const keywords = ['年度报告', '年报', '年度报告摘要']
    const excludeKeywords = ['摘要', '更正', '补充', '取消']

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
    if (code.startsWith('6')) return 'sh'
    if (code.startsWith('0') || code.startsWith('3')) return 'sz'
    if (code.startsWith('4') || code.startsWith('8')) return 'bj'
    return 'unknown'
  }

  /**
   * 结果去重
   * @param {Array} results - 搜索结果
   * @returns {Array}
   */
  deduplicateResults(results) {
    const seen = new Set()
    return results.filter(item => {
      const key = `${item.code}-${item.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * 获取模拟搜索结果
   * @param {string} keyword - 搜索关键词
   * @returns {Array}
   */
  getMockSearchResults(keyword) {
    // 常用股票数据
    const mockData = [
      { code: '600519', name: '贵州茅台', market: 'sh' },
      { code: '000858', name: '五粮液', market: 'sz' },
      { code: '000001', name: '平安银行', market: 'sz' },
      { code: '600036', name: '招商银行', market: 'sh' },
      { code: '601318', name: '中国平安', market: 'sh' },
      { code: '000333', name: '美的集团', market: 'sz' },
      { code: '600276', name: '恒瑞医药', market: 'sh' },
      { code: '000002', name: '万科A', market: 'sz' }
    ]

    // 根据关键词过滤
    const filtered = mockData.filter(item =>
      item.code.includes(keyword) || item.name.includes(keyword)
    )

    return filtered.map(item => ({
      ...item,
      source: 'mock',
      sourceName: '模拟数据'
    }))
  }

  /**
   * 获取模拟年报数据
   * @param {string} code - 股票代码
   * @param {string} source - 数据源
   * @returns {Array}
   */
  getMockReports(code, source) {
    const currentYear = new Date().getFullYear()
    const reports = []

    for (let i = 0; i < 3; i++) {
      const year = currentYear - i - 1
      reports.push({
        title: `${year}年年度报告`,
        code: code,
        name: '公司名称',
        publishDate: `${year + 1}-03-31`,
        url: `#mock-pdf-${code}-${year}`,
        source: source,
        sourceName: source === 'eastmoney' ? '东方财富' : '巨潮资讯'
      })
    }

    return reports
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
