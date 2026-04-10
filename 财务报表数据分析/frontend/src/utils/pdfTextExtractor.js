import * as pdfjsLib from 'pdfjs-dist'

// 使用CDN加载worker，避免Vite打包配置问题
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

/**
 * 客户端PDF文本提取器
 * 从PDF中提取文本，保留表格结构（与后端pdf2json类似的效果）
 * 用于解决Vercel Hobby plan 4.5MB请求体大小限制
 */

/**
 * 从PDF文件中提取文本
 * @param {File} file - PDF文件
 * @param {Function} onProgress - 进度回调 (0-100)
 * @returns {Promise<Object>} { pages, fullText, plainText, pageCount, keyPages }
 */
export async function extractPDFText(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const totalPages = pdf.numPages
  const pages = []
  let fullText = ''

  // 关键页面：前30页（与后端PDFService一致）
  const keyPages = []
  for (let i = 1; i <= Math.min(30, totalPages); i++) {
    keyPages.push(i)
  }

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = formatPageText(textContent)

    pages.push(pageText)
    fullText += `\n\n--- 第 ${i} 页 ---\n${pageText}`

    if (i % 5 === 0 || i === totalPages) {
      onProgress?.(Math.round((i / totalPages) * 100))
    }
  }

  return {
    pages: pages.map((content, index) => ({
      type: 'text',
      pageNumber: index + 1,
      content,
      isKeyPage: keyPages.includes(index + 1)
    })),
    fullText,
    plainText: fullText,
    pageCount: totalPages,
    keyPages
  }
}

/**
 * 格式化页面文本（保留表格结构）
 * 与后端PDFService.formatPageText逻辑一致：
 * - 按Y坐标分组（同一行）
 * - 按X坐标排序（从左到右）
 * - 根据间距添加制表符或空格
 */
function formatPageText(textContent) {
  if (!textContent.items || textContent.items.length === 0) {
    return ''
  }

  // 按Y坐标分组
  const lines = new Map()

  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue

    const y = Math.round(item.transform[5] * 2) // Y坐标，2倍精度
    const x = item.transform[4] // X坐标

    if (!lines.has(y)) {
      lines.set(y, [])
    }
    lines.get(y).push({ x, content: item.str })
  }

  // PDF坐标系Y从下到上，所以要反转排序
  const sortedLines = Array.from(lines.entries())
    .sort((a, b) => b[0] - a[0])

  const formattedLines = []

  for (const [, items] of sortedLines) {
    // 按X坐标排序（从左到右）
    items.sort((a, b) => a.x - b.x)

    let lineText = ''
    let lastX = 0

    for (const item of items) {
      const gap = item.x - lastX
      if (gap > 5) {
        lineText += '\t'
      } else if (gap > 1) {
        lineText += '  '
      }
      lineText += item.content
      lastX = item.x + item.content.length * 0.5
    }

    formattedLines.push(lineText.trim())
  }

  return formattedLines.join('\n')
}
