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
- 税法知识库（5个 Markdown 文件）
- 产品需求文档（PRD.md）

**输出目录**：`D:\ai\ai编程\财税小工具\{税种名称}计算器\`

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

**步骤 2.1：创建目录结构**
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

| 文件 | 内容要求 |
|------|----------|
| `0_索引.md` | 知识库目录索引 |
| `1_基础知识.md` | 税种定义、纳税人、征税对象、纳税义务发生时间 |
| `2_税率.md` | 税率表、档位说明、优惠政策 |
| `3_规定.md` | 征收管理办法、申报期限、发票规定 |
| `4_计算方法.md` | 计算公式、示例、特殊情形处理 |

**步骤 2.4：生成 PRD.md**
- 参考 `D:\ai\ai编程\财税小工具\增值税计算器\PRD.md` 的格式
- 包含：核心目标、用户画像、功能需求、技术实现、计算公式

**步骤 2.5：生成 HTML 页面**

参考模板结构：
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
  <script src="../common/components/utils.js"></script>
  <script src="../common/components/version.js"></script>
  <script src="../common/components/export.js"></script>
  <script src="./script.js"></script>
</body>
</html>
```

**步骤 2.6：生成 script.js**

核心功能：
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // 1. 加载配置文件
    // 2. 绑定计算按钮事件
    // 3. 实现计算逻辑
    // 4. 渲染结果
    // 5. 复制/导出功能
});
```

**步骤 2.7：生成 styles.css**

```css
/* 如果 ../common/styles.css 存在，本文件仅包含税种特有样式 */
/* 参考：D:\ai\ai编程\财税小工具\附加税费计算器\styles.css */
```

### Phase 3: 完成输出

**步骤 3.1：输出简洁摘要**
```
✅ {税种名称}计算器 已生成完成

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

⚠️ 提示: 请核对税率配置文件中的最新政策是否准确
```

---

## 4. 税种特性判断逻辑

根据税种自动判断功能需求：

| 税种 | 进项抵扣 | 多档税率 | 优惠门槛 | 特殊功能 |
|------|----------|----------|----------|----------|
| 增值税 | ✅ | ✅ | 小微免税 | 差额征税、兼营 |
| 企业所得税 | ❌ | ✅ | 小微优惠 | 应纳税所得额计算 |
| 个人所得税 | ❌ | ✅ | 专项扣除 | 累进税率、速算扣除 |
| 印花税 | ❌ | ✅ | 小额免税 | 合同类型选择 |
| 房产税 | ❌ | ✅ | ❌ | 从价/从租两种 |
| 土地增值税 | ❌ | ✅ | ❌ | 超率累进税率 |
| 消费税 | ❌ | ✅ | ❌ | 进口/生产环节 |

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

### ✅ Good Case：正确的执行方式

**用户输入：**
> 生成企业所得税计算器

**正确响应：**
```
[静默执行以下步骤]
1. 解析税种：企业所得税
2. 搜索"企业所得税 2026 税率表"、"企业所得税计算公式"
3. 创建目录：D:\ai\ai编程\财税小工具\企业所得税计算器\
4. 生成 9 个文件...
5. 输出完成摘要

✅ 企业所得税计算器 已生成完成
📁 输出目录: D:\ai\ai编程\财税小工具\企业所得税计算器\
...
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

生成完成后自动检查：
- [ ] HTML 文件可在浏览器中正常打开
- [ ] 配置文件 JSON 格式正确
- [ ] 计算公式与搜索结果一致
- [ ] 知识库文件包含必要章节
- [ ] 版本号和日期已正确填写
- [ ] 引用的公共组件路径正确
