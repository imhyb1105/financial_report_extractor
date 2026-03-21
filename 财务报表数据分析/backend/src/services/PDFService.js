import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import sharp from 'sharp'

/**
 * PDF处理服务
 */
class PDFService {
  constructor() {
    this.maxPages = 100 // 最大处理页数
  }

  /**
   * 将PDF转换为图片数组
   * @param {string} pdfPath - PDF文件路径
   * @returns {Promise<Array>} 图片数组 [{type: 'base64', data: '...'}]
   */
  async convertToImages(pdfPath) {
    console.log(`[PDFService] Converting PDF to images: ${pdfPath}`)

    // 检查文件是否存在
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF文件不存在: ${pdfPath}`)
    }

    // 读取PDF
    const dataBuffer = fs.readFileSync(pdfPath)
    const pdfData = await pdf(dataBuffer)

    console.log(`[PDFService] PDF has ${pdfData.numpages} pages`)

    // 由于pdf-parse不直接支持图片提取，这里使用简化方案
    // 实际项目中应该使用 pdf2pic + GraphicsMagick

    const images = []

    // 获取关键页面（目录、主要财务报表页）
    const keyPages = await this.identifyKeyPages(pdfData)

    // 对于演示目的，我们返回PDF的文本信息作为"图片"
    // 实际部署时需要真正的PDF转图片功能
    for (let i = 0; i < Math.min(pdfData.numpages, this.maxPages); i++) {
      // 生成一个模拟的图片数据（实际应该是真实的PDF页面图片）
      images.push({
        type: 'text',
        pageNumber: i + 1,
        content: this.extractPageContent(pdfData, i),
        isKeyPage: keyPages.includes(i + 1)
      })
    }

    return images
  }

  /**
   * 识别关键页面
   */
  async identifyKeyPages(pdfData) {
    const keyPages = []
    const text = pdfData.text

    // 查找关键财务报表的页码
    const keywords = [
      '资产负债表',
      '利润表',
      '现金流量表',
      '财务报表',
      '合并资产负债表',
      '合并利润表',
      '合并现金流量表'
    ]

    // 简化处理：假设前20页包含关键信息
    for (let i = 1; i <= Math.min(20, pdfData.numpages); i++) {
      keyPages.push(i)
    }

    return keyPages
  }

  /**
   * 提取页面内容
   */
  extractPageContent(pdfData, pageIndex) {
    // pdf-parse 返回的是完整文本，需要按页分割
    // 这里简化处理，返回部分文本
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

  /**
   * 使用外部工具转换PDF（需要GraphicsMagick）
   */
  async convertWithGraphicsMagick(pdfPath, outputDir) {
    // 这个方法需要系统安装GraphicsMagick
    // 使用 pdf2pic 库实现
    const { fromPath } = await import('pdf2pic')

    const options = {
      density: 150,
      saveFilename: 'page',
      savePath: outputDir,
      format: 'png',
      width: 1200,
      height: 1600
    }

    const convert = fromPath(pdfPath, options)
    const results = await convert.bulk(-1) // 转换所有页

    return results.map((result, index) => ({
      type: 'file',
      path: result.path,
      pageNumber: index + 1
    }))
  }
}

export default PDFService
