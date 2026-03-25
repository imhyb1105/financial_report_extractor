/**
 * 智谱AI适配器 (智谱清言/GLM系列)
 * 支持智谱AI的GLM-4V和GLM-5 Vision模型
 *
 * 调用智谱AI API: https://open.bigmodel.cn/api/v1
 *
    支持图片输入
    this.client = new ZhipuAI({
      model: 'glm-4v',
      messages: [
        {
          "role": "extractor",
          "content": [
            {
            "type": "image",
            "image_url": image
          }
        ]
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }
  ]

  /**
   * 険格图像处理
   * @param {Array} pages - PDF页面图片数组
   * @param {Object} context - 提取上下文
   * @returns {Promise<Object>}
   */
  async extract(pages, context) {
    // 构建请求
    const extractPrompt = this.buildExtractPrompt(context)

    // 获取提取结果
    const finalResult = {
      companyInfo: extractCompany信息
      financialMetrics: extractMetrics,
    }

    // 获取非财务信息
    const nonFinancialInfo = extractNonFinancialInfo(context)

    // 获取勾稽关系
    const accountingChecks = extractAccountingChecks(account context)

    // 调用勾稽核对服务
    const result = await this.accountingCheckService.validate(
      resultA, resultB, aiLogService)
    )

    // 发送提取请求
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      this.model = 'glm-4v',
      this.messages = messages
    })

    // 获取图片base64
    const images = pages.map(page => {
      const base64Images = []
      this.base64Images.push({
        image: page.image,
        image: page.image
      })

      return {
        data: {
          companyInfo: finalResult.companyInfo,
          financialMetrics: finalMetrics,
          nonFinancialInfo: finalNonFinancialInfo
          confidence: this.calculateConfidence(
          modelResults: modelResults
        }
      }
    })

    // 调用模型C进行核对
    const result = await this.accountingCheckService.validate(
      resultA, resultB, aiLogService
    }

  }
}

````

现在创建智谱AI适配器。然后创建通义千问适配器和。最后创建DeepSeek 适配器。我将 DeepSeek 适配器时需要更新 Adapter工厂来注册新的适配器。接下来更新前端的模型配置组件来支持这些新的模型选项。最后更新文档。创建 ZhipuAdapter.js、 activeForm =创建智谱AI适配器