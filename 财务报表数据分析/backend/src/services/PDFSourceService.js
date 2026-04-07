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
    // 使用已验证可用的东方财富搜索API
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
    // 响应结构是 QuotationCodeTable.Data
    const results = data?.QuotationCodeTable?.Data || []

    if (results.length === 0) {
      return []
    }

    return results
      .filter(item => item.Classify === 'AStock') // 只返回A股
      .map(item => ({
        code: item.Code,
        name: item.Name,
        market: this.getMarketFromCode(item.Code),
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
    // 响应结构是 QuotationCodeTable.Data
    const results = data?.QuotationCodeTable?.Data || data?.Data || []

    return results
      .filter(item => item.Classify === 'AStock' || item.Type === 'stock') // 只返回A股
      .map(item => ({
        code: item.Code || item.UnifiedCode,
        name: item.Name,
        market: this.getMarketFromCode(item.Code || item.UnifiedCode),
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
    // 使用东方财富公告查询API (V2.5.3 更新 - 获取多年报告)
    const annType = market === 'sh' ? 'SHA' : market === 'sz' ? 'SZA' : 'SHA'
    const url = 'https://np-anotice-stock.eastmoney.com/api/security/ann'

    // 获取多页数据以覆盖近两年报告
    const allItems = []
    const maxPages = 3 // 获取3页数据，每页100条

    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
      try {
        const response = await axios.get(url, {
          params: {
            cb: 'jQuery',
            page_size: 100,
            page_index: pageIndex,
            ann_type: annType,
            client_source: 'web',
            stock_list: code
          },
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            'Referer': 'https://data.eastmoney.com/',
            'Accept': '*/*'
          }
        })

        let data = response.data
        if (typeof data === 'string') {
          const match = data.match(/^jQuery\((.*)\)$/)
          if (match) {
            data = JSON.parse(match[1])
          } else {
            break
          }
        }

        const list = data?.data?.list || []
        allItems.push(...list)

        // 如果返回数量少于100，说明没有更多数据
        if (list.length < 100) break
      } catch (error) {
        console.error(`获取第${pageIndex}页数据失败:`, error.message)
        break
      }
    }

    console.log(`获取到 ${allItems.length} 条公告数据`)

    // 过滤年报和季报
    const allReports = allItems
      .filter(item => this.isFinancialReport(item.title))
      .map(item => {
        const artCode = item.art_code
        const pdfUrl = `https://pdf.dfcfw.com/pdf/H2_${artCode}_1.pdf`
        const year = this.extractYear(item.title)
        const reportType = this.extractReportType(item.title)

        return {
          title: item.title,
          code: item.codes?.[0]?.stock_code || code,
          name: item.codes?.[0]?.short_name || '',
          publishDate: item.notice_date,
          url: pdfUrl,
          artCode: artCode,
          year: year,
          reportType: reportType,
          source: 'eastmoney',
          sourceName: '东方财富'
        }
      })

    console.log(`筛选出 ${allReports.length} 条财务报告`)

    // 按年份和报告类型分组，每类只保留最新的
    const grouped = {}
    allReports.forEach(report => {
      if (!report.year || report.reportType === '其他') return
      const key = `${report.year}_${report.reportType}`
      if (!grouped[key] || new Date(report.publishDate) > new Date(grouped[key].publishDate)) {
        grouped[key] = report
      }
    })

    // 转换为数组并排序（按年份降序，同年份按类型排序）
    const result = Object.values(grouped)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        const typeOrder = { '年报': 1, '半年报': 2, '三季报': 3, '一季报': 4 }
        return (typeOrder[a.reportType] || 99) - (typeOrder[b.reportType] || 99)
      })

    return result
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
   * 判断是否为财务报告（年报、季报等）
   * @param {string} title - 报告标题
   * @returns {boolean}
   */
  isFinancialReport(title) {
    if (!title) return false
    const keywords = ['年度报告', '年报', '季度报告', '季报', '半年度报告', '半年报']
    const excludeKeywords = ['摘要', '更正', '补充', '取消', '英文版', '港股', '督导', '现场检查', '自查']

    const hasKeyword = keywords.some(k => title.includes(k))
    const hasExclude = excludeKeywords.some(k => title.includes(k))

    return hasKeyword && !hasExclude
  }

  /**
   * 从标题中提取年份
   * @param {string} title - 报告标题
   * @returns {number|null}
   */
  extractYear(title) {
    if (!title) return null
    // 匹配 2023年、2024年 等格式
    const match = title.match(/(20\d{2})年/)
    return match ? parseInt(match[1]) : null
  }

  /**
   * 从标题中提取报告类型
   * @param {string} title - 报告标题
   * @returns {string}
   */
  extractReportType(title) {
    if (!title) return '其他'
    // 注意：必须先检查"半年度"，否则会被"年度报告"误匹配
    if (title.includes('半年度') || title.includes('半年报') || title.includes('中报')) return '半年报'
    if (title.includes('第三季度') || title.includes('三季报')) return '三季报'
    if (title.includes('第一季度') || title.includes('一季报')) return '一季报'
    // 年报：必须包含"年度报告"或"年报"但不包含"半年度"
    if ((title.includes('年度报告') || title.includes('年报')) && !title.includes('半年度')) return '年报'
    return '其他'
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
   * 判断是否为财务报告（年报、季报等）
   * @param {string} title - 报告标题
   * @returns {boolean}
   */
  isFinancialReport(title) {
    if (!title) return false
    const keywords = ['年度报告', '年报', '季度报告', '季报', '半年度报告', '半年报', '中报']
    const excludeKeywords = ['摘要', '更正', '补充', '取消', '英文版', '港股', '督导', '现场检查', '自查', '提示性']

    const hasKeyword = keywords.some(k => title.includes(k))
    const hasExclude = excludeKeywords.some(k => title.includes(k))

    return hasKeyword && !hasExclude
  }

  /**
   * 判断是否为年报或季报
   * @param {string} title - 报告标题
   * @param {string} type - 报告类型: 'annual' | 'quarterly' | 'all'
   * @returns {boolean}
   */
  isReport(title, type = 'all') {
    if (!title) return false

    const annualKeywords = ['年度报告', '年报']
    const quarterlyKeywords = ['季度报告', '季报', '第一季度报告', '半年度报告', '第三季度报告']
    const excludeKeywords = ['摘要', '更正', '补充', '取消', '英文版', '港股', '业绩预告', '业绩快报']

    const hasExclude = excludeKeywords.some(k => title.includes(k))

    if (hasExclude) return false

    if (type === 'annual') {
      return annualKeywords.some(k => title.includes(k))
    } else if (type === 'quarterly') {
      return quarterlyKeywords.some(k => title.includes(k))
    } else {
      // 'all' - 返回年报和季报
      return annualKeywords.some(k => title.includes(k)) || quarterlyKeywords.some(k => title.includes(k))
    }
  }

  /**
   * 判断是否为年报
   * @param {string} title - 报告标题
   * @returns {boolean}
   */
  isAnnualReport(title) {
    return this.isReport(title, 'annual')
  }

  /**
   * 从标题中提取年份
   * @param {string} title - 报告标题
   * @returns {string|null}
   */
  extractYear(title) {
    if (!title) return null
    // 匹配 2023年、2024年 等格式
    const match = title.match(/(20\d{2})年/)
    return match ? match[1] : null
  }

  /**
   * 从标题中提取报告类型
   * @param {string} title - 报告标题
   * @returns {string}
   */
  extractReportType(title) {
    if (!title) return '其他'
    // 注意：必须先检查"半年度"，否则会被"年度报告"误匹配
    if (title.includes('半年度') || title.includes('半年报') || title.includes('中报')) return '半年报'
    if (title.includes('第三季度') || title.includes('三季报')) return '三季报'
    if (title.includes('第一季度') || title.includes('一季报')) return '一季报'
    // 年报：必须包含"年度报告"或"年报"但不包含"半年度"
    if ((title.includes('年度报告') || title.includes('年报')) && !title.includes('半年度')) return '年报'
    return '其他'
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
