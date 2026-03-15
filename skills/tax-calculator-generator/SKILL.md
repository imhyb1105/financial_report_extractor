---
name: tax-calculator-generator
description: 中国税种计算器生成器。当用户请求"生成/创建/制作 + 税种名称 + 计算器"时触发（如"生成企业所得税计算器"、"创建印花税计算器"）。自动搜索最新税率政策，生成完整的计算器套件（HTML/JS/配置文件/知识库/PRD），输出到 D:\ai\ai编程\财税小工具\{税种名称}计算器\ 目录。
license: MIT
---

# 税种计算器生成器

## ⚠️ 静默执行协议（必须遵守）

```
┌─────────────────────────────────────────────────────────────┐
│  🔇 ZERO-INTERRUPTION MODE                                  │
├─────────────────────────────────────────────────────────────┤
│  DO NOT ask "是否继续？"                                     │
│  DO NOT ask "税率是否正确？"                                  │
│  DO NOT ask "需要生成哪些文件？"                              │
│  DO NOT pause for user confirmation between steps           │
│  DO NOT stop if network search fails — use fallback         │
│  DO NOT ask before overwriting existing files               │
│                                                             │
│  ✅ Generate ALL files in ONE execution                     │
│  ✅ Use fallback data silently when needed                  │
│  ✅ Output concise summary only at the end                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Overview

本 Skill 用于为中国税种自动生成完整的网页计算器套件，包括：
- 可交互的 HTML 计算器页面
- 计算逻辑 JavaScript
- 税率配置文件（JSON）
- 税法知识库（5-6个 Markdown 文件）
- 产品需求文档（PRD.md）

**输出目录**：`D:\ai\ai编程\财税小工具\{税种名称}计算器\`

---

## 1.1 税种复杂度分层（关键逻辑）

根据税种计算复杂度，自动选择不同的计算器模板：

### 复杂度判定规则

| 复杂度 | 税种 | 特征 | 计算器模式 |
|--------|------|------|-----------|
| **简单** | 印花税、契税、附加税、车船税、车辆购置税、关税 | 税基明确、税率固定、无复杂调整 | 单页简单表单 |
| **中等** | 房产税、土地增值税、消费税、城镇土地使用税、资源税、环境保护税 | 多档税率、需判断适用情形 | 单页增强表单（Tab切换） |
| **复杂** | **企业所得税**、**个人所得税**、增值税 | 应纳税所得额计算复杂、多项调整、分档累进 | **分步向导模式** |

### 复杂税种的核心难点

**企业所得税应纳税所得额计算难点**：

```
应纳税所得额 ≠ 简单的收入 - 成本

实际计算流程：
┌─────────────────────────────────────────────────────────────┐
│ 第一步：会计利润计算                                          │
│   会计利润 = 收入总额 - 成本 - 费用 - 税金 - 损失             │
├─────────────────────────────────────────────────────────────┤
│ 第二步：限额扣除项目调整                                      │
│   - 业务招待费：取实际发生额60% 与营业收入5‰ 较低者          │
│   - 广告费：不超过营业收入15%                                │
│   - 职工福利费：不超过工资总额14%                            │
│   - 工会经费：不超过工资总额2%                               │
│   - 职工教育经费：不超过工资总额8%                           │
│   - 公益性捐赠：不超过年度利润总额12%                        │
├─────────────────────────────────────────────────────────────┤
│ 第三步：不得扣除项目调整                                      │
│   + 罚款、罚金、被没收财物损失                                │
│   + 税收滞纳金                                               │
│   + 赞助支出                                                 │
│   + 与经营无关的支出                                         │
├─────────────────────────────────────────────────────────────┤
│ 第四步：加计扣除项目                                          │
│   - 研发费用加计扣除（100%）                                  │
│   - 残疾人工资加计扣除（100%）                                │
├─────────────────────────────────────────────────────────────┤
│ 第五步：免税/不征税收入调整                                   │
│   - 国债利息收入（免税）                                      │
│   - 符合条件的股息红利（免税）                                │
│   - 财政拨款（不征税）                                        │
├─────────────────────────────────────────────────────────────┤
│ 第六步：亏损弥补                                              │
│   - 弥补以前年度亏损（一般企业5年，高新企业10年）              │
└─────────────────────────────────────────────────────────────┘

应纳税所得额 = 会计利润
              + 超限额扣除额（业务招待费等超限部分）
              + 不得扣除项目金额
              - 加计扣除金额
              - 免税/不征税收入
              - 亏损弥补金额
```

---

## 2. Trigger Conditions

**必须触发的情况：**
- "生成 + {税种} + 计算器"
- "创建 + {税种} + 计算器"
- "制作 + {税种} + 计算器"
- "帮我做一个 + {税种} + 计算器"

**常见税种列表：**
- 企业所得税
- 个人所得税
- 印花税
- 房产税
- 土地增值税
- 城镇土地使用税
- 车船税
- 车辆购置税
- 契税
- 资源税
- 环境保护税
- 消费税
- 关税

---

## 3. Execution Workflow

### Phase 1: 信息收集（静默执行）

**步骤 1.1：解析税种名称**
- 从用户输入中提取税种名称
- 标准化命名（如"个税" → "个人所得税"）

**步骤 1.2：联网搜索（使用 WebSearch）**
搜索内容：
```
1. "{税种名称} 2026 税率表"
2. "{税种名称} 计算公式"
3. "{税种名称} 最新政策 2026"
4. "{税种名称} 征收管理办法"
```

**步骤 1.3：处理搜索失败**
```
IF 搜索失败 OR 结果不可靠:
    使用内置中国税法常识库
    在配置文件中标记 "needs_verification: true"
```

### Phase 2: 文件生成（一次性完成）

**步骤 2.0：判断税种复杂度并选择模板**

```
// 复杂度判断逻辑
FUNCTION determineComplexity(taxName):
    simpleTaxes = ["印花税", "契税", "附加税", "车船税", "车辆购置税", "关税",
                   "城建税", "教育费附加", "地方教育附加"]
    mediumTaxes = ["房产税", "土地增值税", "消费税", "城镇土地使用税",
                   "资源税", "环境保护税", "耕地占用税"]
    complexTaxes = ["企业所得税", "个人所得税", "增值税"]

    IF taxName IN simpleTaxes:
        RETURN "simple"
    ELSE IF taxName IN mediumTaxes:
        RETURN "medium"
    ELSE IF taxName IN complexTaxes:
        RETURN "complex"
    ELSE:
        RETURN "medium"  // 默认中等
```

**步骤 2.1：创建目录结构**

根据复杂度创建不同的目录结构：

**简单/中等复杂度：**
```
D:\ai\ai编程\财税小工具\{税种名称}计算器\
├── PRD.md
├── {税种名称}计算器.html
├── script.js
├── styles.css
├── {tax_type}.config.json
└── {税种名称}知识库\
    ├── 0_索引.md
    ├── 1_{税种名称}基础知识.md
    ├── 2_{税种名称}税率.md
    ├── 3_{税种名称}规定.md
    └── 4_{税种名称}计算方法.md
```

**复杂税种（企业所得税/个人所得税/增值税）：**
```
D:\ai\ai编程\财税小工具\{税种名称}计算器\
├── PRD.md
├── {税种名称}计算器.html          # 分步向导式
├── script.js                      # 复杂计算逻辑
├── styles.css
├── {tax_type}.config.json         # 完整配置
└── {税种名称}知识库\
    ├── 0_索引.md
    ├── 1_{税种名称}基础知识.md
    ├── 2_{税种名称}税率.md
    ├── 3_{税种名称}规定.md
    ├── 4_{税种名称}计算方法.md
    └── 5_{税种名称}纳税调整详解.md   # 复杂税种额外增加
```

**步骤 2.2：生成配置文件 `{tax_type}.config.json`**

```json
{
  "version": "2026.01-001",
  "effective_date": "2026-01-01",
  "last_verified_date": "{当前日期}",
  "needs_verification": false,
  "tax_items": [
    { "key": "item_key", "label": "项目名称", "rate": 0.00 }
  ],
  "notes": ["备注说明"]
}
```

**步骤 2.3：生成知识库文件**

#### A. 简单/中等复杂度税种（5个文件）

| 文件 | 内容要求 |
|------|----------|
| `0_索引.md` | 知识库目录索引 |
| `1_基础知识.md` | 税种定义、纳税人、征税对象、纳税义务发生时间 |
| `2_税率.md` | 税率表、档位说明、优惠政策 |
| `3_规定.md` | 征收管理办法、申报期限、发票规定 |
| `4_计算方法.md` | 计算公式、示例、特殊情形处理 |

#### B. 复杂税种（6个文件）- 额外增加纳税调整详解

| 文件 | 内容要求 |
|------|----------|
| `0_索引.md` | 知识库目录索引 |
| `1_基础知识.md` | 税种定义、纳税人（居民/非居民等）、征税对象、纳税义务发生时间、纳税地点 |
| `2_税率.md` | 法定税率、优惠税率、税率档位说明、优惠政策认定条件、政策有效期 |
| `3_规定.md` | 征收管理办法、申报期限、税前扣除项目、**不得扣除项目**、发票规定 |
| `4_计算方法.md` | 基本计算公式、**应纳税所得额计算流程**、各类情形计算示例、常见问题 |
| `5_纳税调整详解.md` | **复杂税种专用**：限额扣除项目、不得扣除项目、免税/不征税收入、加计扣除、亏损弥补 |

**`5_纳税调整详解.md` 必须包含的内容（企业所得税为例）：**

```markdown
# 企业所得税纳税调整详解

## 一、限额扣除项目

### 1. 业务招待费
- **扣除标准**：按实际发生额60%扣除，但最高不超过当年销售（营业）收入的5‰
- **计算公式**：扣除限额 = Min(实际发生额 × 60%, 销售收入 × 5‰)
- **超限处理**：超过部分调增应纳税所得额，不得结转

### 2. 广告费和业务宣传费
- **扣除标准**：不超过当年销售（营业）收入15%
- **超限处理**：超过部分可结转以后年度扣除

### 3. 职工福利费
- **扣除标准**：不超过工资薪金总额14%
- **超限处理**：超过部分调增应纳税所得额，不得结转

### 4. 工会经费
- **扣除标准**：不超过工资薪金总额2%
- **超限处理**：超过部分调增应纳税所得额，不得结转

### 5. 职工教育经费
- **扣除标准**：不超过工资薪金总额8%
- **超限处理**：超过部分可结转以后年度扣除

### 6. 公益性捐赠
- **扣除标准**：不超过年度利润总额12%
- **超限处理**：超过部分可结转以后三年扣除

---

## 二、不得扣除项目（需全额调增）

| 项目 | 说明 |
|------|------|
| 罚款、罚金 | 行政处罚、刑事处罚 |
| 税收滞纳金 | 逾期缴纳税款产生的滞纳金 |
| 赞助支出 | 与生产经营活动无关的赞助 |
| 与经营无关支出 | 个人消费、家庭支出等 |
| 未经核定准备金 | 未经税务机关核定的资产减值准备 |

---

## 三、免税/不征税收入（需调减）

| 项目 | 类型 | 说明 |
|------|------|------|
| 国债利息收入 | 免税 | 持有国债取得的利息 |
| 符合条件的股息红利 | 免税 | 居民企业之间的股息红利 |
| 财政拨款 | 不征税 | 各级人民政府拨付的财政资金 |
| 行政事业性收费 | 不征税 | 纳入财政管理的收费 |

---

## 四、加计扣除项目

| 项目 | 扣除比例 | 说明 |
|------|----------|------|
| 研发费用 | 100% | 所有企业均可享受 |
| 残疾人工资 | 100% | 安置残疾人员支付的工资 |

---

## 五、亏损弥补

- **一般企业**：可在以后5年内弥补
- **高新技术企业**：可在以后10年内弥补
- **弥补顺序**：先弥补最早年度的亏损
```

**步骤 2.4：生成 PRD.md**
- 参考 `D:\ai\ai编程\财税小工具\增值税计算器\PRD.md` 的格式
- 包含：核心目标、用户画像、功能需求、技术实现、计算公式

**步骤 2.5：生成 HTML 页面**

根据复杂度选择不同的 HTML 模板：

#### A. 简单/中等复杂度模板（单页表单）

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{税种名称}计算器</title>
  <link rel="stylesheet" href="../common/styles.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-4">
    <h1 class="mb-3">{税种名称}计算器</h1>
    <!-- 状态栏：版本 + 生效日期 -->
    <!-- 输入表单 -->
    <!-- 计算结果展示区 -->
    <!-- 知识库链接 -->
    <!-- 页脚 -->
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="./script.js"></script>
</body>
</html>
```

#### B. 复杂税种模板（分步向导式）- 企业所得税专用

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>企业所得税计算器</title>
  <link rel="stylesheet" href="../common/styles.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    /* 向导进度条样式 */
    .wizard-progress { display: flex; justify-content: space-between; margin-bottom: 2rem; }
    .wizard-step { flex: 1; text-align: center; position: relative; }
    .wizard-step::after { content: ''; position: absolute; top: 20px; left: 50%; width: 100%; height: 2px; background: #dee2e6; z-index: -1; }
    .wizard-step:last-child::after { display: none; }
    .wizard-step .step-circle { width: 40px; height: 40px; border-radius: 50%; background: #dee2e6; color: #6c757d; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; }
    .wizard-step.active .step-circle { background: #0d6efd; color: white; }
    .wizard-step.completed .step-circle { background: #198754; color: white; }
    .wizard-step.completed::after { background: #198754; }

    /* 步骤面板 */
    .step-panel { display: none; }
    .step-panel.active { display: block; }

    /* 限额提示 */
    .limit-indicator { font-size: 0.75rem; margin-top: 0.25rem; }
    .limit-ok { color: #198754; }
    .limit-exceeded { color: #dc3545; font-weight: bold; }

    /* 调整汇总 */
    .adjustment-summary { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0.375rem; padding: 1rem; }
    .adjustment-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px dashed #dee2e6; }
    .adjustment-item:last-child { border-bottom: none; }
  </style>
</head>
<body class="bg-light">
  <div class="container py-4">
    <h1 class="mb-3">企业所得税计算器</h1>
    <p class="text-muted">分步向导模式 - 准确计算应纳税所得额</p>

    <!-- 向导进度条 -->
    <div class="wizard-progress">
      <div class="wizard-step active" data-step="1">
        <div class="step-circle">1</div>
        <div class="step-label small mt-1">基础数据</div>
      </div>
      <div class="wizard-step" data-step="2">
        <div class="step-circle">2</div>
        <div class="step-label small mt-1">限额扣除</div>
      </div>
      <div class="wizard-step" data-step="3">
        <div class="step-circle">3</div>
        <div class="step-label small mt-1">纳税调整</div>
      </div>
      <div class="wizard-step" data-step="4">
        <div class="step-circle">4</div>
        <div class="step-label small mt-1">优惠扣除</div>
      </div>
      <div class="wizard-step" data-step="5">
        <div class="step-circle">5</div>
        <div class="step-label small mt-1">计算结果</div>
      </div>
    </div>

    <!-- 步骤1: 基础数据 -->
    <div class="step-panel active" id="step1">
      <div class="card">
        <div class="card-header">步骤1: 收入与成本费用</div>
        <div class="card-body">
          <h6 class="text-muted mb-3">一、收入总额</h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">主营业务收入（元）</label>
              <input type="number" class="form-control" id="mainRevenue" min="0" step="0.01">
            </div>
            <div class="col-md-4">
              <label class="form-label">其他业务收入（元）</label>
              <input type="number" class="form-control" id="otherRevenue" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">营业外收入（元）</label>
              <input type="number" class="form-control" id="nonOperatingRevenue" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">投资收益（元）</label>
              <input type="number" class="form-control" id="investmentIncome" min="0" step="0.01" value="0">
            </div>
          </div>

          <h6 class="text-muted mb-3 mt-4">二、成本费用</h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">主营业务成本（元）</label>
              <input type="number" class="form-control" id="mainCost" min="0" step="0.01">
            </div>
            <div class="col-md-4">
              <label class="form-label">其他业务成本（元）</label>
              <input type="number" class="form-control" id="otherCost" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">税金及附加（元）</label>
              <input type="number" class="form-control" id="taxSurcharge" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">销售费用（元）</label>
              <input type="number" class="form-control" id="salesExpense" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">管理费用（元）</label>
              <input type="number" class="form-control" id="adminExpense" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">财务费用（元）</label>
              <input type="number" class="form-control" id="financeExpense" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">资产减值损失（元）</label>
              <input type="number" class="form-control" id="assetImpairment" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">营业外支出（元）</label>
              <input type="number" class="form-control" id="nonOperatingExpense" min="0" step="0.01" value="0">
            </div>
          </div>

          <div class="alert alert-info mt-3">
            <strong>会计利润：</strong><span id="accountingProfit">0.00</span> 元
            <small class="d-block text-muted">会计利润 = 收入总额 - 成本费用总额</small>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-secondary" disabled>上一步</button>
            <button class="btn btn-primary" onclick="nextStep(2)">下一步：限额扣除项目</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤2: 限额扣除项目 -->
    <div class="step-panel" id="step2">
      <div class="card">
        <div class="card-header">步骤2: 限额扣除项目（自动计算超限部分）</div>
        <div class="card-body">
          <h6 class="text-muted mb-3">需要填写限额扣除项目的实际发生额</h6>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">工资薪金总额（元）</label>
              <input type="number" class="form-control" id="salaryTotal" min="0" step="0.01" value="0">
              <small class="text-muted">作为以下项目的扣除基数</small>
            </div>
          </div>

          <hr class="my-4">

          <div class="row g-3">
            <!-- 业务招待费 -->
            <div class="col-md-6">
              <label class="form-label">业务招待费实际发生额（元）</label>
              <input type="number" class="form-control" id="entertainmentExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="entertainmentLimit"></div>
            </div>

            <!-- 广告费 -->
            <div class="col-md-6">
              <label class="form-label">广告费和业务宣传费（元）</label>
              <input type="number" class="form-control" id="advertisingExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="advertisingLimit"></div>
            </div>

            <!-- 职工福利费 -->
            <div class="col-md-6">
              <label class="form-label">职工福利费（元）</label>
              <input type="number" class="form-control" id="welfareExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="welfareLimit"></div>
            </div>

            <!-- 工会经费 -->
            <div class="col-md-6">
              <label class="form-label">工会经费（元）</label>
              <input type="number" class="form-control" id="unionExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="unionLimit"></div>
            </div>

            <!-- 职工教育经费 -->
            <div class="col-md-6">
              <label class="form-label">职工教育经费（元）</label>
              <input type="number" class="form-control" id="educationExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="educationLimit"></div>
            </div>

            <!-- 公益性捐赠 -->
            <div class="col-md-6">
              <label class="form-label">公益性捐赠（元）</label>
              <input type="number" class="form-control" id="donationExpense" min="0" step="0.01" value="0">
              <div class="limit-indicator" id="donationLimit"></div>
            </div>
          </div>

          <div class="adjustment-summary mt-4">
            <h6>限额扣除调整汇总</h6>
            <div class="adjustment-item">
              <span>业务招待费超限调增：</span>
              <span id="entertainmentAdjust">0.00</span>
            </div>
            <div class="adjustment-item">
              <span>广告费超限调增：</span>
              <span id="advertisingAdjust">0.00</span>
            </div>
            <div class="adjustment-item">
              <span>职工福利费超限调增：</span>
              <span id="welfareAdjust">0.00</span>
            </div>
            <div class="adjustment-item">
              <span>工会经费超限调增：</span>
              <span id="unionAdjust">0.00</span>
            </div>
            <div class="adjustment-item">
              <span>职工教育经费超限调增：</span>
              <span id="educationAdjust">0.00</span>
            </div>
            <div class="adjustment-item">
              <span>公益性捐赠超限调增：</span>
              <span id="donationAdjust">0.00</span>
            </div>
            <div class="adjustment-item fw-bold text-primary">
              <span>限额扣除调增合计：</span>
              <span id="totalLimitAdjust">0.00</span>
            </div>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-secondary" onclick="prevStep(1)">上一步</button>
            <button class="btn btn-primary" onclick="nextStep(3)">下一步：纳税调整</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤3: 纳税调整 -->
    <div class="step-panel" id="step3">
      <div class="card">
        <div class="card-header">步骤3: 不得扣除项目 & 免税收入</div>
        <div class="card-body">
          <h6 class="text-muted mb-3">一、不得扣除项目（需调增应纳税所得额）</h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">罚款、罚金、没收财物损失（元）</label>
              <input type="number" class="form-control" id="fines" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">税收滞纳金（元）</label>
              <input type="number" class="form-control" id="lateFees" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">赞助支出（元）</label>
              <input type="number" class="form-control" id="sponsorship" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">与经营无关的支出（元）</label>
              <input type="number" class="form-control" id="unrelatedExpense" min="0" step="0.01" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">其他不得扣除项目（元）</label>
              <input type="number" class="form-control" id="otherNonDeductible" min="0" step="0.01" value="0">
            </div>
          </div>

          <h6 class="text-muted mb-3 mt-4">二、免税/不征税收入（需调减应纳税所得额）</h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">国债利息收入（元）</label>
              <input type="number" class="form-control" id="bondInterest" min="0" step="0.01" value="0">
              <small class="text-muted">免税</small>
            </div>
            <div class="col-md-4">
              <label class="form-label">符合条件的股息红利（元）</label>
              <input type="number" class="form-control" id="dividendIncome" min="0" step="0.01" value="0">
              <small class="text-muted">免税</small>
            </div>
            <div class="col-md-4">
              <label class="form-label">财政拨款（元）</label>
              <input type="number" class="form-control" id="fiscalAppropriation" min="0" step="0.01" value="0">
              <small class="text-muted">不征税</small>
            </div>
            <div class="col-md-4">
              <label class="form-label">其他免税收入（元）</label>
              <input type="number" class="form-control" id="otherExempt" min="0" step="0.01" value="0">
            </div>
          </div>

          <div class="adjustment-summary mt-4">
            <h6>纳税调整汇总</h6>
            <div class="adjustment-item text-danger">
              <span>不得扣除项目调增：</span>
              <span id="nonDeductibleTotal">0.00</span>
            </div>
            <div class="adjustment-item text-success">
              <span>免税/不征税收入调减：</span>
              <span id="exemptTotal">0.00</span>
            </div>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-secondary" onclick="prevStep(2)">上一步</button>
            <button class="btn btn-primary" onclick="nextStep(4)">下一步：优惠扣除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤4: 优惠扣除 -->
    <div class="step-panel" id="step4">
      <div class="card">
        <div class="card-header">步骤4: 加计扣除 & 亏损弥补</div>
        <div class="card-body">
          <h6 class="text-muted mb-3">一、加计扣除项目</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">研发费用（元）</label>
              <input type="number" class="form-control" id="rdExpense" min="0" step="0.01" value="0">
              <div class="form-text">加计扣除100% = <span id="rdDeduction">0.00</span> 元</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">残疾人工资（元）</label>
              <input type="number" class="form-control" id="disabledWage" min="0" step="0.01" value="0">
              <div class="form-text">加计扣除100% = <span id="disabledDeduction">0.00</span> 元</div>
            </div>
          </div>

          <h6 class="text-muted mb-3 mt-4">二、亏损弥补</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">以前年度亏损（元）</label>
              <input type="number" class="form-control" id="priorYearLoss" min="0" step="0.01" value="0">
              <div class="form-text">一般企业可弥补5年，高新技术企业10年</div>
            </div>
          </div>

          <h6 class="text-muted mb-3 mt-4">三、企业类型选择</h6>
          <div class="row g-3">
            <div class="col-md-12">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="enterpriseType" id="typeGeneral" value="general" checked>
                <label class="form-check-label" for="typeGeneral">一般企业（25%）</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="enterpriseType" id="typeSmall" value="small">
                <label class="form-check-label" for="typeSmall">小型微利企业（2.5%/5%，应纳税所得额≤300万）</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="enterpriseType" id="typeHighTech" value="hightech">
                <label class="form-check-label" for="typeHighTech">高新技术企业（15%）</label>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-secondary" onclick="prevStep(3)">上一步</button>
            <button class="btn btn-primary" onclick="calculate()">计算应纳税额</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤5: 计算结果 -->
    <div class="step-panel" id="step5">
      <div class="card">
        <div class="card-header bg-success text-white">步骤5: 计算结果</div>
        <div class="card-body">
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <small class="text-muted">会计利润</small>
                  <h4 id="resultAccountingProfit" class="mb-0">0.00</h4>
                  <small>元</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center bg-warning">
                <div class="card-body">
                  <small>纳税调整额</small>
                  <h4 id="resultAdjustment" class="mb-0">0.00</h4>
                  <small>元</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center bg-info text-white">
                <div class="card-body">
                  <small>应纳税所得额</small>
                  <h4 id="resultTaxableIncome" class="mb-0">0.00</h4>
                  <small>元</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center bg-primary text-white">
                <div class="card-body">
                  <small>应纳税额</small>
                  <h4 id="resultTaxPayable" class="mb-0">0.00</h4>
                  <small>元</small>
                </div>
              </div>
            </div>
          </div>

          <!-- 详细计算过程 -->
          <div class="adjustment-summary">
            <h6>应纳税所得额计算过程</h6>
            <div id="calculationProcess"></div>
          </div>

          <!-- 纳税调整明细 -->
          <div class="mt-4">
            <h6>纳税调整明细</h6>
            <table class="table table-sm">
              <thead>
                <tr><th>调整项目</th><th>金额（元）</th><th>调整方向</th></tr>
              </thead>
              <tbody id="adjustmentDetails"></tbody>
            </table>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-secondary" onclick="prevStep(4)">返回修改</button>
            <button class="btn btn-success" onclick="exportResult()">导出结果</button>
            <button class="btn btn-primary" onclick="resetAll()">重新计算</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="./script.js"></script>
</body>
</html>
```

**步骤 2.6：生成 script.js**

根据复杂度生成不同的计算逻辑：

#### A. 简单/中等复杂度 script.js

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // 1. 加载配置文件
    // 2. 绑定计算按钮事件
    // 3. 实现计算逻辑
    // 4. 渲染结果
    // 5. 复制/导出功能
});
```

#### B. 复杂税种 script.js（企业所得税专用）

```javascript
// 企业所得税计算器 - 分步向导版
// 核心功能：准确计算应纳税所得额

document.addEventListener('DOMContentLoaded', function() {
    // ==================== 配置数据 ====================
    const CONFIG = {
        // 限额扣除比例
        limits: {
            entertainment: { rate: 0.005, actualRate: 0.6, desc: '业务招待费：取实际60%与收入5‰较低者' },
            advertising: { rate: 0.15, desc: '广告费：不超过营业收入15%' },
            welfare: { rate: 0.14, desc: '职工福利费：不超过工资总额14%' },
            union: { rate: 0.02, desc: '工会经费：不超过工资总额2%' },
            education: { rate: 0.08, desc: '职工教育经费：不超过工资总额8%' },
            donation: { rate: 0.12, desc: '公益性捐赠：不超过年度利润12%' }
        },
        // 税率
        taxRates: {
            general: 0.25,
            small_tier1: 0.025,  // ≤100万
            small_tier2: 0.05,   // 100-300万
            hightech: 0.15
        },
        // 小微企业分档
        smallThreshold: {
            tier1: 1000000,
            tier2: 3000000
        }
    };

    // ==================== 步骤切换 ====================
    let currentStep = 1;

    function showStep(step) {
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('step' + step).classList.add('active');

        document.querySelectorAll('.wizard-step').forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i + 1 < step) s.classList.add('completed');
            if (i + 1 === step) s.classList.add('active');
        });
        currentStep = step;
    }

    function nextStep(step) {
        if (validateStep(currentStep)) {
            if (currentStep === 1) calculateAccountingProfit();
            if (currentStep === 2) calculateLimitAdjustments();
            showStep(step);
        }
    }

    function prevStep(step) { showStep(step); }

    // ==================== 步骤1：计算会计利润 ====================
    function calculateAccountingProfit() {
        const revenue = getInputValue('mainRevenue') + getInputValue('otherRevenue')
                      + getInputValue('nonOperatingRevenue') + getInputValue('investmentIncome');
        const cost = getInputValue('mainCost') + getInputValue('otherCost')
                   + getInputValue('taxSurcharge') + getInputValue('salesExpense')
                   + getInputValue('adminExpense') + getInputValue('financeExpense')
                   + getInputValue('assetImpairment') + getInputValue('nonOperatingExpense');

        const profit = revenue - cost;
        document.getElementById('accountingProfit').textContent = formatMoney(profit);
        return profit;
    }

    // ==================== 步骤2：限额扣除计算 ====================
    function calculateLimitAdjustments() {
        const revenue = getInputValue('mainRevenue') + getInputValue('otherRevenue');
        const salaryTotal = getInputValue('salaryTotal');
        const profit = parseFloat(document.getElementById('accountingProfit').textContent.replace(/,/g, '')) || 0;

        const adjustments = {};

        // 业务招待费：取实际60%与收入5‰较低者
        const entertainment = getInputValue('entertainmentExpense');
        const entertainmentLimit = Math.min(entertainment * 0.6, revenue * 0.005);
        adjustments.entertainment = {
            actual: entertainment,
            limit: entertainmentLimit,
            exceeded: Math.max(0, entertainment - entertainmentLimit)
        };

        // 广告费：不超过营业收入15%
        const advertising = getInputValue('advertisingExpense');
        const advertisingLimit = revenue * 0.15;
        adjustments.advertising = {
            actual: advertising,
            limit: advertisingLimit,
            exceeded: Math.max(0, advertising - advertisingLimit)
        };

        // 职工福利费：不超过工资总额14%
        const welfare = getInputValue('welfareExpense');
        const welfareLimit = salaryTotal * 0.14;
        adjustments.welfare = {
            actual: welfare,
            limit: welfareLimit,
            exceeded: Math.max(0, welfare - welfareLimit)
        };

        // 工会经费：不超过工资总额2%
        const union = getInputValue('unionExpense');
        const unionLimit = salaryTotal * 0.02;
        adjustments.union = {
            actual: union,
            limit: unionLimit,
            exceeded: Math.max(0, union - unionLimit)
        };

        // 职工教育经费：不超过工资总额8%
        const education = getInputValue('educationExpense');
        const educationLimit = salaryTotal * 0.08;
        adjustments.education = {
            actual: education,
            limit: educationLimit,
            exceeded: Math.max(0, education - educationLimit)
        };

        // 公益性捐赠：不超过年度利润12%
        const donation = getInputValue('donationExpense');
        const donationLimit = profit * 0.12;
        adjustments.donation = {
            actual: donation,
            limit: donationLimit,
            exceeded: Math.max(0, donation - donationLimit)
        };

        // 更新UI
        updateLimitDisplay(adjustments);

        return adjustments;
    }

    function updateLimitDisplay(adj) {
        // 更新各项限额显示
        for (const [key, value] of Object.entries(adj)) {
            const limitEl = document.getElementById(key + 'Limit');
            const adjustEl = document.getElementById(key + 'Adjust');

            if (limitEl) {
                if (value.exceeded > 0) {
                    limitEl.className = 'limit-indicator limit-exceeded';
                    limitEl.textContent = `限额：${formatMoney(value.limit)}，超限：${formatMoney(value.exceeded)}`;
                } else {
                    limitEl.className = 'limit-indicator limit-ok';
                    limitEl.textContent = `限额：${formatMoney(value.limit)}，未超限`;
                }
            }
            if (adjustEl) {
                adjustEl.textContent = formatMoney(value.exceeded);
            }
        }

        // 计算合计
        const total = Object.values(adj).reduce((sum, v) => sum + v.exceeded, 0);
        document.getElementById('totalLimitAdjust').textContent = formatMoney(total);
    }

    // ==================== 最终计算 ====================
    function calculate() {
        // 1. 获取会计利润
        const accountingProfit = calculateAccountingProfit();

        // 2. 获取限额扣除调整
        const limitAdjustments = calculateLimitAdjustments();
        const limitAdjustTotal = Object.values(limitAdjustments).reduce((s, v) => s + v.exceeded, 0);

        // 3. 获取不得扣除项目
        const nonDeductible = getInputValue('fines') + getInputValue('lateFees')
                            + getInputValue('sponsorship') + getInputValue('unrelatedExpense')
                            + getInputValue('otherNonDeductible');

        // 4. 获取免税/不征税收入
        const exemptIncome = getInputValue('bondInterest') + getInputValue('dividendIncome')
                           + getInputValue('fiscalAppropriation') + getInputValue('otherExempt');

        // 5. 获取加计扣除
        const rdDeduction = getInputValue('rdExpense') * 1.0;
        const disabledDeduction = getInputValue('disabledWage') * 1.0;
        const totalDeduction = rdDeduction + disabledDeduction;

        // 6. 获取亏损弥补
        const priorYearLoss = getInputValue('priorYearLoss');

        // 7. 计算应纳税所得额
        let taxableIncome = accountingProfit
                          + limitAdjustTotal      // 限额扣除超限调增
                          + nonDeductible         // 不得扣除项目调增
                          - exemptIncome          // 免税收入调减
                          - totalDeduction        // 加计扣除
                          - priorYearLoss;        // 亏损弥补

        if (taxableIncome < 0) taxableIncome = 0;

        // 8. 计算应纳税额
        const enterpriseType = document.querySelector('input[name="enterpriseType"]:checked').value;
        let taxPayable;
        let taxRateDisplay;

        if (enterpriseType === 'small' && taxableIncome <= CONFIG.smallThreshold.tier2) {
            // 小微企业分档计算
            if (taxableIncome <= CONFIG.smallThreshold.tier1) {
                taxPayable = taxableIncome * CONFIG.taxRates.small_tier1;
                taxRateDisplay = '2.5%（小微≤100万）';
            } else {
                const tier1Tax = CONFIG.smallThreshold.tier1 * CONFIG.taxRates.small_tier1;
                const tier2Tax = (taxableIncome - CONFIG.smallThreshold.tier1) * CONFIG.taxRates.small_tier2;
                taxPayable = tier1Tax + tier2Tax;
                taxRateDisplay = '2.5%+5%（小微100-300万）';
            }
        } else if (enterpriseType === 'hightech') {
            taxPayable = taxableIncome * CONFIG.taxRates.hightech;
            taxRateDisplay = '15%（高新技术）';
        } else {
            taxPayable = taxableIncome * CONFIG.taxRates.general;
            taxRateDisplay = '25%（一般企业）';
        }

        // 9. 显示结果
        document.getElementById('resultAccountingProfit').textContent = formatMoney(accountingProfit);
        document.getElementById('resultAdjustment').textContent = formatMoney(limitAdjustTotal + nonDeductible - exemptIncome - totalDeduction);
        document.getElementById('resultTaxableIncome').textContent = formatMoney(taxableIncome);
        document.getElementById('resultTaxPayable').textContent = formatMoney(taxPayable);

        // 显示计算过程
        renderCalculationProcess(accountingProfit, limitAdjustTotal, nonDeductible, exemptIncome,
                                 totalDeduction, priorYearLoss, taxableIncome, taxRateDisplay, taxPayable);

        // 显示调整明细
        renderAdjustmentDetails(limitAdjustments, nonDeductible, exemptIncome, totalDeduction);

        showStep(5);
    }

    function renderCalculationProcess(profit, limitAdj, nonDed, exempt, deduction, loss, taxable, rate, tax) {
        const el = document.getElementById('calculationProcess');
        el.innerHTML = `
            <div class="adjustment-item">
                <span>会计利润</span>
                <span>${formatMoney(profit)}</span>
            </div>
            <div class="adjustment-item text-danger">
                <span>+ 限额扣除超限调增</span>
                <span>${formatMoney(limitAdj)}</span>
            </div>
            <div class="adjustment-item text-danger">
                <span>+ 不得扣除项目调增</span>
                <span>${formatMoney(nonDed)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 免税/不征税收入调减</span>
                <span>-${formatMoney(exempt)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 加计扣除（研发+残疾人工资）</span>
                <span>-${formatMoney(deduction)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 弥补以前年度亏损</span>
                <span>-${formatMoney(loss)}</span>
            </div>
            <div class="adjustment-item fw-bold text-primary">
                <span>= 应纳税所得额</span>
                <span>${formatMoney(taxable)}</span>
            </div>
            <div class="adjustment-item fw-bold text-primary">
                <span>应纳税额 = ${formatMoney(taxable)} × ${rate}</span>
                <span>${formatMoney(tax)}</span>
            </div>
        `;
    }

    // ==================== 工具函数 ====================
    function getInputValue(id) {
        const val = document.getElementById(id)?.value;
        if (val === '' || val === undefined) return 0;
        return parseFloat(val) || 0;
    }

    function formatMoney(num) {
        return Number(num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function validateStep(step) {
        // 验证逻辑...
        return true;
    }

    function resetAll() {
        document.querySelectorAll('input').forEach(i => {
            if (i.type === 'number') i.value = i.defaultValue || '0';
        });
        showStep(1);
    }

    // 全局暴露函数
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.calculate = calculate;
    window.resetAll = resetAll;
});
```

**步骤 2.7：生成 styles.css**

```css
/* 如果 ../common/styles.css 存在，本文件仅包含税种特有样式 */
/* 参考：D:\ai\ai编程\财税小工具\附加税费计算器\styles.css */
```

### Phase 3: 知识库合规性检查与完善（自动循环直到通过）

**步骤 3.1：法律法规合规性检查**

对生成的 5 个知识库文件逐一检查：

| 检查项 | 检查内容 | 通过标准 |
|--------|----------|----------|
| 法律依据 | 是否引用了正确的法律法规名称和条款 | 引用《税法》及实施条例等正式名称 |
| 税率准确性 | 税率数值是否与搜索结果一致 | 与国家税务总局官方口径一致 |
| 政策时效性 | 是否标注了政策有效期/截止日期 | 明确标注有效期限 |
| 知识完整性 | 是否包含该税种的核心知识点 | 见下方完整性清单 |
| 计算公式 | 公式是否正确、示例是否准确 | 手动验证示例计算结果 |

**步骤 3.2：知识库完整性清单**

每个税种知识库必须包含以下知识点（根据税种特性调整）：

```
基础知识（1_*.md）必须包含：
├── 税种定义
├── 纳税义务人（居民/非居民，一般/小规模等）
├── 征税对象/征税范围
├── 纳税义务发生时间
└── 纳税地点

税率（2_*.md）必须包含：
├── 法定税率
├── 优惠税率（如有）
├── 税率档位说明
├── 小微/优惠政策的认定条件
└── 政策有效期

规定（3_*.md）必须包含：
├── 征收管理办法
├── 申报期限（月度/季度/年度）
├── 汇算清缴规定（如适用）
├── 税前扣除项目（如适用）
├── 不得扣除项目（如适用）
└── 发票/票据规定

计算方法（4_*.md）必须包含：
├── 基本计算公式
├── 各类企业/情形的计算示例
├── 加计扣除/减免计算（如适用）
├── 亏损弥补（如适用）
└── 常见问题解答
```

**步骤 3.3：自动完善循环**

```
LOOP (最多3次):
    检查所有知识库文件

    IF 发现问题:
        记录问题清单
        联网搜索补充信息（如需要）
        更新/完善知识库文件
        继续循环检查

    ELSE:
        标记"知识库合规检查通过"
        BREAK

IF 循环3次后仍有问题:
    在输出摘要中标注"⚠️ 知识库可能需要人工复核"
    列出具体问题项
```

**步骤 3.4：合规检查输出**

```
📚 知识库合规检查报告

✅ 法律依据：已引用《中华人民共和国企业所得税法》等法规
✅ 税率准确：25%/15%/5% 与官方口径一致
✅ 政策时效：小微企业优惠有效期至2027-12-31
✅ 知识完整：包含全部核心知识点

检查结果：通过
```

---

### Phase 4: 计算器测试与自动修复（自动循环直到通过）

**步骤 4.1：运行测试（HTML/JS 语法检查）**

| 测试项 | 测试方法 | 通过标准 |
|--------|----------|----------|
| HTML 语法 | 检查标签闭合、属性完整性 | 无语法错误 |
| JS 语法 | 检查变量声明、函数调用、括号匹配 | 无语法错误 |
| JSON 格式 | 检查配置文件 JSON 有效性 | 可被正确解析 |
| 文件引用 | 检查 CSS/JS/配置文件路径 | 路径正确存在 |

**步骤 4.2：逻辑测试（计算正确性验证）**

对每种计算模式执行测试用例：

```
测试用例模板：
{
    "input": {
        "revenue": 1000000,
        "cost": 600000,
        ...
    },
    "expected_output": {
        "taxable_income": 400000,
        "tax_payable": 100000,
        "tax_rate": "25%"
    }
}
```

**必须测试的场景：**

| 场景 | 测试目的 | 适用税种 |
|------|----------|----------|
| 正常输入 | 验证基本计算逻辑正确 | 所有 |
| 边界值（0、负数、极大值） | 验证输入校验和边界处理 | 所有 |
| 空值/缺省值 | 验证默认值处理 | 所有 |
| 优惠条件临界点 | 验证优惠政策判断逻辑（如小微企业300万临界） | 企业所得税 |
| 多档税率切换 | 验证不同税率计算正确性 | 所有 |
| 加计扣除/亏损弥补 | 验证特殊扣除项计算 | 企业所得税 |

**复杂税种额外测试场景（企业所得税）：**

| 场景 | 输入 | 预期输出 | 验证目的 |
|------|------|----------|----------|
| **限额扣除超限** | 收入1000万，业务招待费10万 | 扣除限额5万，调增5万 | 限额计算正确 |
| **多项目超限** | 工资100万，福利费20万 | 扣除限额14万，调增6万 | 多项限额累计 |
| **不得扣除调增** | 罚款5万，滞纳金2万 | 调增7万 | 全额调增 |
| **免税收入调减** | 国债利息10万 | 调减10万 | 免税处理 |
| **研发加计扣除** | 研发费用100万 | 加计扣除100万 | 加计100% |
| **亏损弥补** | 当年所得100万，往年亏损80万 | 应纳税所得额20万 | 亏损弥补 |
| **综合场景** | 会计利润500万，各项调整合计+50万 | 应纳税所得额550万 | 综合计算 |

**步骤 4.3：自动修复循环**

```
LOOP (最多3次):
    执行所有测试用例

    IF 测试失败:
        记录失败原因（运行错误/逻辑错误）
        分析错误根源
        自动修复代码
        重新测试

    ELSE IF 逻辑验证失败:
        手动计算验证预期结果
        修正计算公式
        重新测试

    ELSE:
        标记"计算器测试通过"
        BREAK

IF 循环3次后仍有问题:
    在输出摘要中标注"⚠️ 计算器可能存在问题，建议人工测试"
    列出具体问题项
```

**步骤 4.4：测试报告输出**

```
🧪 计算器测试报告

运行测试：
✅ HTML 语法检查：通过
✅ JS 语法检查：通过
✅ JSON 格式验证：通过
✅ 文件引用检查：通过

逻辑测试：
✅ 一般企业计算（25%）：通过
   - 输入：收入100万，成本60万
   - 预期：应纳税额10万
   - 实际：应纳税额10万 ✓

✅ 小微企业计算（5%）：通过
   - 输入：应纳税所得额200万（符合小微条件）
   - 预期：应纳税额10万
   - 实际：应纳税额10万 ✓

✅ 小微临界点测试：通过
   - 输入：应纳税所得额320万（超过300万）
   - 预期：按25%计算，应纳税额80万
   - 实际：应纳税额80万 ✓

✅ 研发费用加计扣除：通过
✅ 亏损弥补计算：通过

测试结果：全部通过（8/8）
```

---

### Phase 5: 完成输出

**步骤 5.1：输出完整摘要**
```
════════════════════════════════════════════════════════════
✅ {税种名称}计算器 已生成完成
════════════════════════════════════════════════════════════

📁 输出目录: D:\ai\ai编程\财税小工具\{税种名称}计算器\

📄 生成文件:
   ├── PRD.md
   ├── {税种名称}计算器.html
   ├── script.js
   ├── styles.css
   ├── {tax_type}.config.json
   └── {税种名称}知识库/
       ├── 0_索引.md
       ├── 1_{税种名称}基础知识.md
       ├── 2_{税种名称}税率.md
       ├── 3_{税种名称}规定.md
       └── 4_{税种名称}计算方法.md

📚 知识库合规检查: ✅ 通过
   - 法律依据：已引用相关法律法规
   - 税率准确：与官方口径一致
   - 知识完整：包含全部核心知识点

🧪 计算器测试: ✅ 通过
   - 运行测试：HTML/JS/JSON 无语法错误
   - 逻辑测试：全部测试用例通过

🔗 税率来源: [搜索结果链接]

⚠️ 提示: 双击 HTML 文件可在浏览器中打开使用
════════════════════════════════════════════════════════════
```

---

## 4. 税种特性判断逻辑

### 4.1 税种复杂度与功能需求

| 复杂度 | 税种 | 计算器模式 | 核心难点 |
|--------|------|-----------|----------|
| **简单** | 印花税、契税、附加税、车船税、车辆购置税、关税、城建税、教育费附加 | 单页简单表单 | 税率匹配 |
| **中等** | 房产税、土地增值税、消费税、城镇土地使用税、资源税、环境保护税 | 单页增强表单 | 多档税率、从价/从租 |
| **复杂** | **企业所得税**、**个人所得税**、**增值税** | **分步向导模式** | **应纳税所得额计算** |

### 4.2 复杂税种核心难点详解

#### 企业所得税：应纳税所得额计算

```
应纳税所得额 ≠ 简单的收入 - 成本

实际计算流程：
1. 从会计利润出发
2. 调增：限额扣除超限部分（业务招待费、广告费等）
3. 调增：不得扣除项目（罚款、滞纳金等）
4. 调减：免税/不征税收入（国债利息、股息红利等）
5. 调减：加计扣除（研发费用100%、残疾人工资100%）
6. 调减：弥补以前年度亏损

应纳税所得额 = 会计利润
              + 限额扣除超限调增
              + 不得扣除项目调增
              - 免税/不征税收入调减
              - 加计扣除
              - 亏损弥补
```

#### 个人所得税：综合所得计算

```
综合所得应纳税额计算流程：
1. 收入合计 = 工资薪金 + 劳务报酬 + 稿酬 + 特许权使用费
2. 减除费用 = 60000元/年（5000元/月）
3. 专项扣除 = 养老保险 + 医疗保险 + 失业保险 + 住房公积金
4. 专项附加扣除 = 子女教育 + 继续教育 + 大病医疗 + 住房贷款利息 + 住房租金 + 赡养老人
5. 其他扣除 = 企业年金 + 商业健康保险 + 税延商业养老保险

应纳税所得额 = 收入合计 - 减除费用 - 专项扣除 - 专项附加扣除 - 其他扣除
应纳税额 = 应纳税所得额 × 适用税率 - 速算扣除数
```

#### 增值税：进项抵扣与多档税率

```
增值税应纳税额计算流程：
1. 销项税额 = 各档销售额 × 适用税率
2. 进项税额 = 可抵扣进项发票税额
3. 进项转出 = 不得抵扣的进项税额转出

应纳税额 = 销项税额 - （进项税额 - 进项转出）
```

### 4.3 限额扣除项目速查表（企业所得税）

| 项目 | 扣除标准 | 超限处理 | 法律依据 |
|------|----------|----------|----------|
| 业务招待费 | Min(实际60%, 收入5‰) | 调增，不结转 | 实施条例第43条 |
| 广告费 | 收入15% | 调增，可结转 | 实施条例第44条 |
| 职工福利费 | 工资总额14% | 调增，不结转 | 实施条例第40条 |
| 工会经费 | 工资总额2% | 调增，不结转 | 实施条例第41条 |
| 职工教育经费 | 工资总额8% | 调增，可结转 | 实施条例第42条 |
| 公益性捐赠 | 利润总额12% | 调增，可结转3年 | 实施条例第51条 |

### 4.4 根据税种自动判断功能需求

| 税种 | 复杂度 | 进项抵扣 | 多档税率 | 优惠门槛 | 分步向导 | 特殊功能 |
|------|--------|----------|----------|----------|----------|----------|
| 增值税 | 复杂 | ✅ | ✅ | 小微免税 | ✅ | 差额征税、兼营 |
| 企业所得税 | 复杂 | ❌ | ✅ | 小微优惠 | ✅ | **应纳税所得额计算** |
| 个人所得税 | 复杂 | ❌ | ✅ | 专项扣除 | ✅ | 累进税率、速算扣除 |
| 印花税 | 简单 | ❌ | ✅ | 小额免税 | ❌ | 合同类型选择 |
| 房产税 | 中等 | ❌ | ✅ | ❌ | ❌ | 从价/从租两种 |
| 土地增值税 | 中等 | ❌ | ✅ | ❌ | ❌ | 超率累进税率 |
| 消费税 | 中等 | ❌ | ✅ | ❌ | ❌ | 进口/生产环节 |
| 附加税费 | 简单 | ❌ | ❌ | 小微减半 | ❌ | 基于增值税/消费税 |

---

## 5. Error Handling

| 错误场景 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 网络搜索失败 | 使用内置税法常识 | 在配置文件标记 `needs_verification: true` |
| 税种无法识别 | 生成通用模板 | 输出时提示"已生成通用模板，请手动补充税率" |
| 目录创建失败 | 尝试备用路径 | 输出错误信息 |
| 文件写入失败 | 重试一次 | 输出错误信息 |

---

## 6. Few-Shot Examples

### ✅ Good Case：复杂税种（企业所得税）的正确执行方式

**用户输入：**
> 生成企业所得税计算器

**正确响应：**
```
[静默执行以下步骤]

Phase 1: 信息收集
1. 解析税种：企业所得税
2. 判断复杂度：complex（复杂税种）
3. 搜索"企业所得税 2026 税率表"、"企业所得税应纳税所得额计算"
4. 搜索"企业所得税税前扣除项目"、"限额扣除标准"
5. 搜索"企业所得税不得扣除项目"、"加计扣除政策"

Phase 2: 文件生成（复杂税种模板）
6. 创建目录：D:\ai\ai编程\财税小工具\企业所得税计算器\
7. 生成配置文件 cit.config.json（含完整限额扣除配置）
8. 生成知识库 6 个文件（含5_企业所得税纳税调整详解.md）
9. 生成 PRD.md
10. 生成分步向导式 HTML（5步骤：基础数据→限额扣除→纳税调整→优惠扣除→结果）
11. 生成复杂计算逻辑 script.js

Phase 3: 知识库合规检查
12. 检查法律依据引用... ✅
13. 检查税率准确性（25%/15%/2.5%/5%）... ✅
14. 检查限额扣除标准（业务招待费5‰、广告费15%等）... ✅
15. 检查纳税调整详解完整性... ✅
16. 知识库合规检查通过

Phase 4: 计算器测试（复杂场景）
17. HTML/JS 语法检查... ✅
18. 步骤切换功能测试... ✅
19. 限额扣除自动计算测试... ✅
    - 业务招待费：收入1000万，发生10万 → 限额5万，超限5万 ✓
20. 纳税调整测试... ✅
    - 不得扣除项目调增... ✓
    - 免税收入调减... ✓
21. 加计扣除测试... ✅
    - 研发费用100%加计... ✓
22. 综合计算测试... ✅
    - 会计利润500万 + 调整50万 = 应纳税所得额550万 ✓
23. 计算器测试通过

Phase 5: 输出摘要
24. 输出完成报告

════════════════════════════════════════════════════════════
✅ 企业所得税计算器 已生成完成（分步向导模式）
════════════════════════════════════════════════════════════

📁 输出目录: D:\ai\ai编程\财税小工具\企业所得税计算器\

📄 生成文件:
   ├── PRD.md
   ├── 企业所得税计算器.html     # 分步向导（5步骤）
   ├── script.js                 # 复杂计算逻辑
   ├── styles.css
   ├── cit.config.json           # 完整配置（含限额标准）
   └── 企业所得税知识库/
       ├── 0_索引.md
       ├── 1_企业所得税基础知识.md
       ├── 2_企业所得税税率.md
       ├── 3_企业所得税规定.md
       ├── 4_企业所得税计算方法.md
       └── 5_企业所得税纳税调整详解.md   # 复杂税种专用

🔧 核心功能:
   ✅ 应纳税所得额分步计算
   ✅ 限额扣除自动判断（业务招待费、广告费、福利费等）
   ✅ 不得扣除项目调增
   ✅ 免税/不征税收入调减
   ✅ 加计扣除（研发100%、残疾人工资100%）
   ✅ 亏损弥补
   ✅ 企业类型自动判断（一般/小微/高新）

📚 知识库合规检查: ✅ 通过
🧪 计算器测试: ✅ 全部通过（12/12）

⚠️ 提示: 此计算器采用分步向导模式，帮助用户准确计算应纳税所得额
════════════════════════════════════════════════════════════
```

### ✅ Good Case：简单税种（印花税）的正确执行方式

**用户输入：**
> 生成印花税计算器

**正确响应：**
```
[静默执行以下步骤]

Phase 1: 信息收集
1. 解析税种：印花税
2. 判断复杂度：simple（简单税种）
3. 搜索"印花税 2026 税率表"、"印花税计算公式"

Phase 2: 文件生成（简单税种模板）
4. 创建目录：D:\ai\ai编程\财税小工具\印花税计算器\
5. 生成配置文件 stamp.config.json
6. 生成知识库 5 个文件
7. 生成 PRD.md
8. 生成单页简单表单 HTML
9. 生成简单计算逻辑 script.js

Phase 3-5: 检查、测试、输出
...

✅ 印花税计算器 已生成完成（简单单页模式）
```

### ❌ Anti-Pattern：禁止的中断行为

**错误响应示例 1：**
```
我找到了企业所得税的税率信息：
- 一般企业：25%
- 小微企业：优惠税率

请问需要继续生成计算器吗？ ← ❌ 禁止询问
```

**错误响应示例 2：**
```
企业所得税有多种计算方式：
1. 查账征收
2. 核定征收

请选择您需要的计算方式： ← ❌ 禁止询问
```

**正确做法：**
```
✅ 自动包含所有常见计算方式
✅ 在HTML中使用Tab切换不同计算模式
✅ 配置文件中包含所有税率档位
```

---

## 7. 参考文件

生成时参考以下现有文件的模式：
- `D:\ai\ai编程\财税小工具\增值税计算器\` — 复杂税种模板
- `D:\ai\ai编程\财税小工具\附加税费计算器\` — 简单税种模板

---

## 8. 质量检查清单

### Phase 3 检查项（知识库合规）：

**通用检查项（所有税种）：**
- [ ] 法律法规引用准确（正式名称+条款号）
- [ ] 税率数值与国家税务总局官方口径一致
- [ ] 政策有效期/截止日期已明确标注
- [ ] 基础知识包含：定义、纳税人、征税对象、纳税时间、地点
- [ ] 税率文件包含：法定税率、优惠税率、认定条件、有效期
- [ ] 规定文件包含：征收办法、申报期限、扣除/不得扣除项目
- [ ] 计算方法包含：基本公式、示例、特殊情况、常见问题

**复杂税种额外检查项（企业所得税/个人所得税/增值税）：**
- [ ] 限额扣除标准完整准确（业务招待费、广告费、福利费等）
- [ ] 不得扣除项目清单完整（罚款、滞纳金、赞助支出等）
- [ ] 免税/不征税收入清单完整
- [ ] 加计扣除政策完整（研发费用、残疾人工资等）
- [ ] 亏损弥补规则说明完整
- [ ] **5_纳税调整详解.md** 文件存在且内容完整

### Phase 4 检查项（计算器测试）：

**通用检查项（所有税种）：**
- [ ] HTML 语法正确，标签完整闭合
- [ ] JavaScript 无语法错误
- [ ] JSON 配置文件格式正确可解析
- [ ] 文件引用路径正确
- [ ] 正常输入计算结果正确
- [ ] 边界值处理正确（0、负数、极大值）
- [ ] 空值/缺省值处理正确
- [ ] 优惠政策临界点判断正确
- [ ] 多档税率切换计算正确

**复杂税种额外检查项（企业所得税）：**
- [ ] **分步向导切换功能正常**（5个步骤可前后切换）
- [ ] **限额扣除自动计算正确**（业务招待费60%与5‰取低等）
- [ ] **限额超限调增计算正确**
- [ ] **不得扣除项目全额调增**
- [ ] **免税收入调减正确**
- [ ] **加计扣除100%计算正确**
- [ ] **亏损弥补计算正确**（不超过可弥补额）
- [ ] **应纳税所得额计算公式完整**：
  ```
  应纳税所得额 = 会计利润
                + 限额扣除超限调增
                + 不得扣除项目调增
                - 免税/不征税收入调减
                - 加计扣除
                - 亏损弥补
  ```
- [ ] **计算过程明细展示完整**
- [ ] **调整明细表展示正确**

### 最终检查项：
- [ ] 版本号和日期已正确填写
- [ ] 知识库链接可正常访问
- [ ] 复制/导出功能正常工作

---

## 9. 附录：常见问题解答

### Q1：如何判断税种复杂度？

```
简单判断规则：
- 只有单一税率或简单分档 → 简单
- 需要计算应纳税所得额 → 复杂
- 涉及进项抵扣 → 复杂
- 涉及累进税率 + 多项扣除 → 复杂
```

### Q2：企业所得税为什么需要分步向导？

因为应纳税所得额的计算涉及：
1. 限额扣除项目（需判断是否超限）
2. 不得扣除项目（需全额调增）
3. 免税/不征税收入（需调减）
4. 加计扣除（需额外计算）
5. 亏损弥补（需查询历史）

单页表单无法清晰展示这些调整过程，用户容易遗漏或误解。

### Q3：如何确保限额扣除计算准确？

在 script.js 中必须包含完整的限额计算逻辑：

```javascript
// 业务招待费限额计算
const entertainmentLimit = Math.min(
    entertainment * 0.6,           // 实际发生额60%
    revenue * 0.005                // 收入5‰
);
const entertainmentAdjust = entertainment - entertainmentLimit;  // 超限调增
```

### Q4：如何处理优惠政策临界点？

对于小微企业300万临界点：
- ≤300万：享受小微企业优惠（2.5%/5%）
- >300万：**全部所得**按25%计算（不是超限部分）

```javascript
if (taxableIncome <= 3000000) {
    // 享受小微企业优惠，分档计算
} else {
    // 全部按25%计算
}
```

---

## 10. 统一性规范（必须遵守）

> 本节内容源自《统一性说明文档.md》，所有生成的计算器必须遵循以下规范，确保风格一致、维护便捷。

### 10.1 技术栈与依赖

| 规范项 | 要求 |
|--------|------|
| **默认技术栈** | 原生 HTML + 自定义 CSS + 原生 JS |
| **第三方库** | 如需 Bootstrap，须统一版本（Bootstrap 5.3.x） |
| **CDN 依赖** | 尽量减少，如使用需有降级方案 |
| **公共资源** | 复用 `common/styles.css` 和 `common/components/` 下的工具 |

### 10.2 UI 与视觉统一

#### 字体族（必须使用）
```css
font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, PingFang SC, Microsoft YaHei, sans-serif;
```

#### 色板统一（CSS 变量）
```css
:root {
  --bg: #f7f7fa;
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --primary: #2563eb;
  --primary-contrast: #ffffff;
  --danger: #dc2626;
}
```

#### 组件规范
| 组件 | 规范 |
|------|------|
| **卡片** | 圆角 10px、阴影 `0 1px 2px rgba(0,0,0,0.06)`、内边距 16px |
| **按钮** | 主次态区分，悬浮轻微亮度变化 `filter: brightness(1.05)` |
| **表单** | 统一焦点态（描边 + 阴影）、对齐与间距一致 |

#### 导航模式选择
| 复杂度 | 导航模式 |
|--------|----------|
| 简单 | 单页 + 卡片分区 |
| 中等 | Tab 切换分区 |
| 复杂 | **分步向导模式（5步）** |

### 10.3 数字与格式统一

#### 必须使用的工具函数
```javascript
// 两位小数（四舍五入）
function toFixed2(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
}

// 千分位 + 两位小数（用于结果展示）
function formatMoney(n) {
    const x = Number(n || 0);
    return toFixed2(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 输入解析（返回数字或 NaN）
function parseAmount(input) {
    const v = String(input ?? '').trim();
    if (v === '') return NaN;
    const num = Number(v);
    return Number.isFinite(num) ? num : NaN;
}
```

#### 数字格式规则
- **结果展示**：统一"千分位 + 两位小数"
- **中间计算**：使用原始数值，保留精度
- **渲染阶段**：统一格式化

### 10.4 表单与校验统一

#### 输入校验
```html
<!-- 关键输入必须加 required 和 min -->
<input type="number" class="form-control" id="revenue" min="0" step="0.01" required>
```

#### 错误呈现（必须使用内联错误区）
```html
<!-- 禁止使用 alert() -->
<div id="errors" class="errors" aria-live="polite"></div>
```

```javascript
function showError(msg) {
    document.getElementById('errors').textContent = msg || '';
}
function clearError() { showError(''); }
```

### 10.5 配置文件规范

#### 命名规范
统一采用 `{tax_type}.config.json` 格式：

| 计算器 | 配置文件名 | tax_type |
|--------|-----------|----------|
| 增值税 | vat.config.json | vat |
| 企业所得税 | cit.config.json | cit |
| 个人所得税 | pit.config.json | pit |
| 印花税 | stamp.config.json | stamp |
| 房产税 | property.config.json | property |
| 附加税费 | rates.config.json | 历史命名，保持不变 |

#### 版本号格式
- 格式：`YYYY.MM-NNN`
- 示例：`2026.03-001`、`2026.03-002`

#### 配置文件必须包含的字段
```json
{
  "version": "2026.03-001",
  "effective_date": "2026-01-01",
  "last_verified_date": "2026-03-15",
  "needs_verification": false,
  "tax_items": [...],
  "notes": [...]
}
```

#### 生效日期字段优先级
1. `effective_until`
2. `effective_period.to` 或 `effective_period.end`
3. `effective_date`

### 10.6 知识库结构统一

| 复杂度 | 文件数 | 文件列表 |
|--------|--------|----------|
| 简单/中等 | 5个 | 0_索引、1_基础知识、2_税率、3_规定、4_计算方法 |
| **复杂** | **6个** | 额外增加 **5_{税种}纳税调整详解.md** |

### 10.7 页脚统一规范

所有计算器页脚必须展示：

```html
<footer>
    <p>当前版本：<span id="version">—</span>，生效日期：<span id="effectiveDate">—</span></p>
    <p class="text-muted small">知识库与计算结果仅供参考，以最新政策为准。政策依据：《中华人民共和国XX税法》及实施条例</p>
    <small>
        <a href="知识库/0_索引.md" class="knowledge-link" target="_blank">📚 查看知识库</a>
        | 政策更新时间：2026年3月
    </small>
</footer>
```

### 10.8 结果展示统一

| 项目 | 要求 |
|------|------|
| **结构** | 网格列表 + 合计金额突出 + 注释说明区 |
| **金额单位** | 统一使用"元"，避免混用"万元" |
| **注释内容** | 包含税率/税目、关键政策提示 |
| **复杂税种额外** | 纳税调整明细表、应纳税所得额计算过程 |

### 10.9 文件命名规范

| 文件类型 | 命名规则 |
|----------|----------|
| 入口文件 | `{税种名称}计算器.html`（如"企业所得税计算器.html"） |
| 样式文件 | `styles.css` |
| 脚本文件 | `script.js` |
| 配置文件 | `{tax_type}.config.json` |
| PRD 文档 | `PRD.md` |
| 知识库目录 | `{税种名称}知识库/` |

### 10.10 可访问性要求

| 要求 | 实现 |
|------|------|
| **标签关联** | 统一 `label for` 属性 |
| **焦点状态** | 可视焦点、对比度达标 |
| **ARIA** | 错误区使用 `aria-live="polite"` |
| **响应式** | 移动端适配一致 |

### 10.11 统一性检查清单

生成计算器后，必须验证以下项目：

```
✅ 数字格式：千分位 + 两位小数
✅ 错误呈现：内联错误区（aria-live）
✅ 配置文件：{tax_type}.config.json 格式正确
✅ 版本展示：页脚显示版本号和生效日期
✅ 知识库链接：提供知识库直达入口
✅ 字体族：使用统一字体族
✅ 色板：使用 CSS 变量色板
✅ 复杂税种：5步向导模式、6个知识库文件
```

---

## 11. 附录：限额扣除速查表（企业所得税）

| 项目 | 扣除标准 | 超限处理 | 法律依据 |
|------|----------|----------|----------|
| 业务招待费 | Min(实际60%, 收入5‰) | 调增，不结转 | 实施条例第43条 |
| 广告费 | 收入15%（特殊行业30%） | 调增，可结转 | 实施条例第44条 |
| 职工福利费 | 工资总额14% | 调增，不结转 | 实施条例第40条 |
| 工会经费 | 工资总额2% | 调增，不结转 | 实施条例第41条 |
| 职工教育经费 | 工资总额8% | 调增，可结转 | 实施条例第42条 |
| 公益性捐赠 | 利润总额12% | 调增，可结转3年 | 实施条例第51条 |

---

## 12. 参考资源

- **统一性说明文档**：`D:\ai\ai编程\财税小工具\统一性说明文档.md`
- **公共样式**：`D:\ai\ai编程\财税小工具\common\styles.css`
- **公共组件**：`D:\ai\ai编程\财税小工具\common\components\`
- **复杂税种模板**：`D:\ai\ai编程\财税小工具\企业所得税计算器\`
- **简单税种模板**：`D:\ai\ai编程\财税小工具\附加税费计算器\`
