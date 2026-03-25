import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import PDFParser from 'pdf2json'

/**
 * PDF处理服务
 * V1.6: 增强文本提取，保留表格结构
 */
class PDFService {
  constructor() {
    this.maxPages = 100 // 最大处理页数
  }

  /**
   * 将PDF转换为页面数组（增强版，保留表格结构）
   * @param {string} pdfPath - PDF文件路径
   * @returns {Promise<Object>} { pages: 页面数组, fullText: 完整文本 }
   */
  async convertToImages(pdfPath) {
    console.log(`[PDFService] Converting PDF with enhanced extraction: ${pdfPath}`)

    // 检查文件是否存在
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF文件不存在: ${pdfPath}`)
    }

    // 方法1: 使用pdf2json提取带位置信息的文本
    let formattedText = ''
    let pdf2jsonPages = []

    try {
      const pdf2jsonResult = await this.extractWithPdf2Json(pdfPath)
      formattedText = pdf2jsonResult.fullText
      pdf2jsonPages = pdf2jsonResult.pages
      console.log(`[PDFService] pdf2json extracted ${formattedText.length} characters`)
    } catch (error) {
      console.warn(`[PDFService] pdf2json failed, falling back to pdf-parse: ${error.message}`)
    }

    // 方法2: 使用pdf-parse作为备选
    const dataBuffer = fs.readFileSync(pdfPath)
    const pdfData = await pdf(dataBuffer)
    const plainText = pdfData.text

    console.log(`[PDFService] PDF has ${pdfData.numpages} pages`)
    console.log(`[PDFService] Plain text length: ${plainText.length} characters`)

    // 使用格式化后的文本（如果有），否则使用纯文本
    const finalText = formattedText.length > plainText.length * 0.5 ? formattedText : plainText

    // 识别关键页面
    const keyPages = await this.identifyKeyPages(pdfData, finalText)

    // 构建页面数组
    const images = []
    for (let i = 0; i < Math.min(pdfData.numpages, this.maxPages); i++) {
      // 获取该页的格式化内容
      const pageContent = pdf2jsonPages[i] || this.extractPageContent(pdfData, i)

      images.push({
        type: 'text',
        pageNumber: i + 1,
        content: pageContent,
        isKeyPage: keyPages.includes(i + 1)
      })
    }

    // 返回页面数组和完整文本（用于后续验证）
    return {
      pages: images,
      fullText: finalText,
      plainText: plainText,
      pageCount: pdfData.numpages,
      keyPages: keyPages
    }
  }

  /**
   * 使用pdf2json提取带位置信息的文本（保留表格结构）
   * @param {string} pdfPath - PDF文件路径
   */
  async extractWithPdf2Json(pdfPath) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser()

      pdfParser.on('pdfParser_dataError', (errData) => {
        reject(new Error(errData.parserError))
      })

      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          const pages = []
          let fullText = ''

          for (let i = 0; i < pdfData.Pages.length; i++) {
            const page = pdfData.Pages[i]
            const pageText = this.formatPageText(page, i + 1)
            pages.push(pageText)
            fullText += `\n\n--- 第 ${i + 1} 页 ---\n${pageText}`
          }

          resolve({ pages, fullText })
        } catch (error) {
          reject(error)
        }
      })

      pdfParser.loadPDF(pdfPath)
    })
  }

  /**
   * 格式化单页文本（保留表格结构）
   * pdf2json返回的文本带有位置信息，我们可以利用这个来重建表格
   */
  formatPageText(page, pageNumber) {
    if (!page.Texts || page.Texts.length === 0) {
      return ''
    }

    // 按Y坐标分组（同一行的文本Y坐标相近）
    const lines = new Map()

    for (const text of page.Texts) {
      // Y坐标转换为行号（四舍五入到整数）
      const yKey = Math.round(text.y * 2) // 使用2倍精度来区分行
      const x = text.x

      // 解码URL编码的文本
      let content = ''
      try {
        content = decodeURIComponent(text.R[0].T)
      } catch {
        content = text.R[0].T
      }

      if (!lines.has(yKey)) {
        lines.set(yKey, [])
      }

      lines.get(yKey).push({ x, content })
    }

    // 按Y坐标排序（从上到下）
    const sortedLines = Array.from(lines.entries())
      .sort((a, b) => a[0] - b[0])

    // 构建格式化文本
    const formattedLines = []

    for (const [, items] of sortedLines) {
      // 按X坐标排序（从左到右）
      items.sort((a, b) => a.x - b.x)

      // 用空格连接同一行的内容
      // 使用制表符对齐（简单方式）
      let lineText = ''
      let lastX = 0

      for (const item of items) {
        const gap = item.x - lastX
        // 根据间距添加空格或制表符
        if (gap > 5) {
          lineText += '\t'
        } else if (gap > 1) {
          lineText += '  '
        }
        lineText += item.content
        lastX = item.x + item.content.length * 0.5 // 估算字符宽度
      }

      formattedLines.push(lineText.trim())
    }

    return formattedLines.join('\n')
  }

  /**
   * 识别关键页面（包含财务报表的页面）
   */
  async identifyKeyPages(pdfData, formattedText) {
    const keyPages = []
    const text = formattedText || pdfData.text

    // 查找关键财务报表的页码
    const keywords = [
      '资产负债表',
      '利润表',
      '现金流量表',
      '财务报表',
      '合并资产负债表',
      '合并利润表',
      '合并现金流量表',
      '所有者权益',
      '营业收入',
      '净利润',
      '总资产'
    ]

    // 简化处理：前20页和包含关键词的页面
    for (let i = 1; i <= Math.min(30, pdfData.numpages); i++) {
      keyPages.push(i)
    }

    console.log(`[PDFService] Identified ${keyPages.length} key pages`)
    return keyPages
  }

  /**
   * 提取页面内容（pdf-parse方式）
   */
  extractPageContent(pdfData, pageIndex) {
    // pdf-parse 返回的是完整文本，需要按页分割
    const text = pdfData.text
    const pageLength = Math.ceil(text.length / pdfData.numpages)
    const start = pageIndex * pageLength
    const end = start + pageLength

    return text.slice(start, end)
  }

  /**
   * 获取PDF基本信息
   */
  async getInfo(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath)
    const pdfData = await pdf(dataBuffer)
    const stats = fs.statSync(pdfPath)

    return {
      path: pdfPath,
      fileName: path.basename(pdfPath),
      fileSize: stats.size,
      pageCount: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
      textLength: pdfData.text.length
    }
  }
}

export default PDFService
