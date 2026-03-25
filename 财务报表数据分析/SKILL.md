---
name: financial-report-extractor-dev
description: "Full-stack automated development workflow for building the Intelligent Financial Report Data Extraction Tool. Transforms PRD.md into production-ready React + Node.js application with AI model integration, accounting validation, and unit conversion. Use this skill when: (1) Developing the financial report extraction tool from PRD, (2) Building specific versions (V1-V5) of the application, (3) Implementing AI-powered PDF extraction with multi-model validation. Triggers on phrases like 'develop financial report tool', 'build from PRD', 'implement PRD', '财务报表工具开发', '从PRD开发'."
license: MIT
version: "2.0"
---

# Financial Report Extractor - Automated Development Workflow

## ⚠️ SILENT EXECUTION PROTOCOL

```
╔══════════════════════════════════════════════════════════════╗
║                    MANDATORY EXECUTION MODE                   ║
╠══════════════════════════════════════════════════════════════╣
║  DO NOT ask for confirmation to proceed.                     ║
║  DO NOT ask "Should I continue?" or "Ready for next step?"  ║
║  DO NOT pause for user input unless fix loop exceeds 5.     ║
║  Generate complete output in one continuous execution.       ║
╚══════════════════════════════════════════════════════════════╝
```

### 🔒 Security Rules for Logging

**MANDATORY data sanitization before any output (console, DEV_REPORT.md, etc.):**

| Data Type | Sanitization Rule | Example |
|-----------|------------------|---------|
| API Keys | Show only last 4 chars | `sk-ant-xxxx` → `sk-ant-****` |
| Request Body | Remove ALL sensitive fields | `{"apiKey": "xxx"}` → `{"apiKey": "[REDACTED]"}` |
| Error Messages | Mask any key fragments | `key=sk-xxx` → `key=[REDACTED]` |
| File Paths | Keep full path (non-sensitive) | No change |
| Config JSON | Strip apiKey fields before logging | Remove modelAKey, modelBKey, modelCKey |

---

## Overview

This skill automates the complete development lifecycle for the **Intelligent Financial Report Data Extraction Tool** (智能财务报表数据提取工具). It supports two execution modes:

| Mode | Description | Test Required | Use Case |
|------|-------------|---------------|----------|
| **build-only** | Generate code only, skip runtime API tests | ❌ No | Offline dev, CI/CD, code review |
| **full-test** | Generate code + run tests with PDF and API keys | ✅ Yes | Pre-deploy validation, full QA |

---

## 🚀 Pre-flight Checklist (启动条件检查)

> **CRITICAL**: This skill will NOT proceed until ALL required inputs are provided. The assistant must prompt the user for missing items and WAIT for response.

### Checklist Table

| # | Required Item | Required In | Validation | Missing Action |
|---|---------------|-------------|------------|----------------|
| 1 | **Version Range** | ALWAYS | Must be valid version (V1-V5) | STOP & PROMPT |
| 2 | **Test API Keys** | full-test mode | At least 1 key (single model test) or 2+ keys (multi-model validation) | STOP & PROMPT |
| 3 | **Test PDF Files** | full-test mode | At least 1 valid PDF file exists | STOP & PROMPT |

### Flexible Input Rules

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     FLEXIBLE INPUT STRATEGY                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  API KEYS:                                                                   ║
║    ├─ 1 key provided  → Single model test (skip three-model validation)     ║
║    │                     Model acts as both extractor AND validator          ║
║    ├─ 2 keys provided → Dual model test (A extracts, B validates)           ║
║    └─ 3+ keys provided → Full three-model validation (A, B extract, C裁决)  ║
║                                                                              ║
║  TEST PDFs:                                                                  ║
║    ├─ 1 PDF provided  → Test with single PDF only                           ║
║    └─ 2+ PDFs provided → Test ALL provided PDFs sequentially                ║
║                                                                              ║
║  NOTE: More inputs = better test coverage, but minimum is acceptable        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Pre-flight Validation Flow

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        PRE-FLIGHT VALIDATION FLOW                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  START                                                                       ║
║    │                                                                         ║
║    ├─► CHECK 1: Version Specified?                                          ║
║    │     ├─ NO  → PROMPT: "请指定要开发的版本范围 (V1/V2/V3/V4/V5)"          ║
║    │     │         → WAIT for user response                                 ║
║    │     │         → REPEAT until valid version provided                    ║
║    │     └─ YES → Continue                                                  ║
║    │                                                                         ║
║    ├─► CHECK 2: Mode Determined?                                            ║
║    │     ├─ If not specified → Default to "build-only"                      ║
║    │     └─ If "full-test" → Continue to CHECK 3 & 4                        ║
║    │                                                                         ║
║    ├─► CHECK 3 (full-test only): API Keys Provided?                         ║
║    │     ├─ NO  → PROMPT: "full-test 模式需要提供测试用 API Key"            ║
║    │     │         → "请提供至少1个API Key（提供多个可进行多模型验证）"       ║
║    │     │         → "格式: claude=sk-ant-xxx, openai=sk-xxx"                ║
║    │     │         → WAIT for user response                                 ║
║    │     │         → REPEAT until at least 1 key provided                   ║
║    │     ├─ 1 key  → LOG: "Single model mode - will test with 1 model"     ║
║    │     ├─ 2 keys → LOG: "Dual model mode - A extracts, B validates"      ║
║    │     └─ 3+ keys→ LOG: "Full validation mode - three-model validation"  ║
║    │                                                                         ║
║    ├─► CHECK 4 (full-test only): Test PDF Provided?                         ║
║    │     ├─ NO  → PROMPT: "full-test 模式需要提供测试用财务报表PDF"          ║
║    │     │         → "请提供至少1份PDF年报文件路径"                          ║
║    │     │         → "建议提供标准格式、多单位格式各1份以提高测试覆盖率"       ║
║    │     │         → WAIT for user response                                 ║
║    │     │         → REPEAT until valid PDF path provided                   ║
║    │     └─ YES → Validate file exists & Continue                           ║
║    │                                                                         ║
║    └─► ALL CHECKS PASSED → Proceed to PHASE 0                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Required Input Templates

When prompting for missing inputs, use these templates:

#### Template 1: Missing Version
```
⚠️ 缺少必要参数：版本范围

请指定要开发的版本：
• V1 (MVP)   - 核心提取功能，三模型验证，勾稽核对
• V2         - 效率提升，自动抓取PDF
• V3         - 深度分析，多年度对比
• V4         - 协作功能，团队共享
• V5         - 商业化功能

示例回复: "开发 V1" 或 "从V1开始开发"
```

#### Template 2: Missing API Keys (full-test mode)
```
⚠️ 缺少必要参数：测试用 API Key

full-test 模式需要提供 API Key 进行测试。

提供数量与测试模式：
• 1个 Key  → 单模型测试（该模型同时负责提取和验证）
• 2个 Key  → 双模型测试（A提取，B验证）
• 3个 Key+ → 完整三模型验证（A、B提取，C裁决）

请提供以下格式的API Key：
claude=sk-ant-xxxx, openai=sk-xxxx, deepseek=sk-xxxx

支持的模型：
• claude    - Anthropic Claude (推荐)
• openai    - OpenAI GPT-4 (推荐)
• gemini    - Google Gemini
• deepseek  - DeepSeek (性价比高)
• kimi      - Moonshot Kimi
• glm       - 智谱AI GLM-4
• minimax   - MiniMax

示例回复: "claude=sk-ant-xxx" 或 "claude=sk-ant-xxx, openai=sk-xxx"
```

#### Template 3: Missing Test PDF (full-test mode)
```
⚠️ 缺少必要参数：测试用财务报表PDF

full-test 模式需要至少1份PDF年报文件进行功能验证。

请提供PDF文件路径：
• 标准格式PDF（必需）- 用于基础功能测试
• 多单位格式PDF（可选）- 测试单位转换功能
• 边缘案例PDF（可选）- 测试异常处理

示例回复: "D:/reports/company_2025.pdf"
```

### Input Accumulation Strategy

```
// The assistant should accumulate provided inputs across messages
user_inputs = {
    version: null,           // Will be filled when user specifies
    mode: "build-only",      // Default, changes to "full-test" if user provides test data
    api_keys: {},            // Accumulated as user provides
    test_pdfs: []            // Accumulated as user provides
}

// After each user message, re-run pre-flight checks
// Only proceed when ALL required inputs for the determined mode are available
```

### Default Test Data Configuration

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                      DEFAULT TEST DATA (项目内置)                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  📁 测试用财务报表PDF (Test PDFs)                                            ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  路径: {project_root}/财务报表/                                              ║
║                                                                              ║
║  默认测试文件:                                                               ║
║  • H2_AN202510281770651478_1.pdf    (标准格式年报)                           ║
║  • H2_AN202510291771276074_1.pdf    (标准格式年报)                           ║
║                                                                              ║
║  使用规则:                                                                   ║
║  • 用户未指定PDF → 自动使用上述默认文件进行测试                               ║
║  • 用户指定PDF → 使用用户指定的文件                                          ║
║  • 用户指定多个PDF → 测试所有指定的文件                                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🔑 API Key 调用规则 (API Key Usage)                                         ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║                                                                              ║
║  参考: 本 SKILL.md 文档中的 API 配置说明                                      ║
║                                                                              ║
║  使用规则:                                                                   ║
║  • 用户必须提供自己的 API Key（不支持内置默认Key）                            ║
║  • Key 仅用于测试期间的 AI 模型调用                                          ║
║  • 所有 Key 在日志输出时必须脱敏（仅显示后4位）                               ║
║                                                                              ║
║  调用策略:                                                                   ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ 1个 Key:  单模型模式                                                  │   ║
║  │    → 同一模型执行: PDF解析 → 数据提取 → 自我验证 → 结果输出           │   ║
║  │    → 适用于快速验证，不进行交叉验证                                    │   ║
║  │                                                                      │   ║
║  │ 2个 Key:  双模型模式                                                  │   ║
║  │    → 模型A: PDF解析 + 数据提取                                        │   ║
║  │    → 模型B: 对A的结果进行验证和补充                                   │   ║
║  │    → 适用于中等置信度需求                                              │   ║
║  │                                                                      │   ║
║  │ 3个 Key+: 三模型验证模式 (推荐)                                       │   ║
║  │    → 模型A: 独立提取                                                  │   ║
║  │    → 模型B: 独立提取                                                  │   ║
║  │    → 模型C: 对比A、B结果，裁决并输出最终结果                          │   ║
║  │    → 最高置信度，符合PRD设计                                          │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Test Data Resolution Flow

```
用户请求 full-test 模式
        │
        ▼
┌───────────────────────────┐
│ 检查用户提供的 API Key    │
└───────────────────────────┘
        │
        ├─ 有提供 → 使用用户提供的 Key
        │            │
        │            ├─ 1个 → 单模型模式
        │            ├─ 2个 → 双模型模式
        │            └─ 3个+ → 三模型验证模式
        │
        └─ 无提供 → PROMPT 用户提供 API Key
                    (不支持内置默认Key)
        │
        ▼
┌───────────────────────────┐
│ 检查用户提供的测试PDF     │
└───────────────────────────┘
        │
        ├─ 有提供 → 使用用户指定的PDF文件
        │            (单个或多个，全部测试)
        │
        └─ 无提供 → 自动使用默认测试PDF
                    {project_root}/财务报表/*.pdf
        │
        ▼
    开始测试
```

---

## Parameter Specification (RESOLVED CONFLICT)

### ⚠️ Clear Parameter Strategy

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     PARAMETER HANDLING RULES                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  RULE 1: REQUIRED parameters → MISSING = STOP with clear error message   ║
║  RULE 2: OPTIONAL parameters → MISSING = Use defined defaults SILENTLY   ║
║  RULE 3: NEVER ask user for optional parameter values                    ║
║  RULE 4: NEVER ask "Should I use X or Y?" for technology choices         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Parameter Table

| Parameter | Required | Mode | Description | Default |
|-----------|----------|------|-------------|---------|
| `prd_path` | ✅ ALWAYS | Both | Full path to PRD.md | (none - must provide) |
| `architecture_path` | ✅ ALWAYS | Both | Full path to ARCHITECTURE.md | (none - must provide) |
| `output_dir` | ✅ ALWAYS | Both | Output directory | (none - must provide) |
| `version` | ✅ ALWAYS | Both | Version to develop (V1-V5) | (none - must provide) |
| `mode` | ⬜ Optional | - | Execution mode | `build-only` |
| `api_keys` | ✅ **full-test ONLY** | full-test | AI API keys | (none - must provide if full-test) |
| `test_pdf_path` | ✅ **full-test ONLY** | full-test | Primary test PDF (standard format) | (none - must provide if full-test) |
| `test_datasets` | ⬜ Optional | full-test | Additional test PDFs (multi_unit, partial, edge, invalid) | `{}` |
| `deploy` | ⬜ Optional | Both | Deploy to Vercel | `false` |

### Validation Logic

```
// Step 1: Validate ALWAYS-required parameters
IF prd_path missing OR architecture_path missing OR output_dir missing OR version missing:
    → STOP with ERROR: "Missing required parameter: {param_name}"
    → List what was provided and what's missing

// Step 2: Validate mode-specific parameters
IF mode == "full-test":
    IF api_keys missing:
        → STOP with ERROR: "full-test mode requires api_keys parameter"
        → Example format: "claude=sk-xxx, openai=sk-xxx, deepseek=sk-xxx"
    IF test_pdf_path missing:
        → STOP with ERROR: "full-test mode requires test_pdf_path parameter"
    IF test_pdf_path exists but not valid PDF:
        → STOP with ERROR: "test_pdf_path is not a valid PDF file"

// Step 3: Apply defaults for optional parameters (SILENTLY)
IF mode missing → mode = "build-only"
IF deploy missing → deploy = false
// DO NOT ask user about these, just use defaults
```

---

## Technology Defaults

When PRD doesn't specify, use these defaults **SILENTLY** (DO NOT ask user):

### Core Technology Stack

| Category | Default Choice | Alternative |
|----------|---------------|-------------|
| **Frontend Framework** | React 18 + Vite | - |
| **UI Component Library** | Ant Design 5 | - |
| **State Management** | Zustand | - |
| **HTTP Client** | Axios | - |
| **Backend Framework** | Node.js 20 + Express 4 | - |
| **File Upload** | Multer | - |
| **Excel Export** | xlsx (SheetJS) | - |
| **API Key Encryption** | crypto-js | - |
| **Frontend Port** | 5173 | - |
| **Backend Port** | 3000 | - |
| **Package Manager** | npm | - |

### PDF Processing Stack

| Library | Purpose | System Dependency | Fallback |
|---------|---------|-------------------|----------|
| pdf2pic | PDF to image (high quality) | GraphicsMagick OR ImageMagick | pdf-parse (text only) |
| pdf-parse | Text extraction | None | - |
| sharp | Image optimization | None (bundled) | - |

### AI Model Dependencies (Per-Adapter)

| Adapter | NPM Package | Required In | Install Command |
|---------|-------------|-------------|-----------------|
| **Core** (always installed) | | | |
| BaseAdapter | - | Both | - |
| AdapterFactory | - | Both | - |
| **Claude** | `@anthropic-ai/sdk` | full-test | `npm install @anthropic-ai/sdk` |
| **OpenAI** | `openai` | full-test | `npm install openai` |
| **Gemini** | `@google/generative-ai` | Optional | `npm install @google/generative-ai` |
| **DeepSeek** | `openai` (compatible) | Optional | Uses openai package |
| **Kimi** | `openai` (compatible) | Optional | Uses openai package |
| **GLM** | `zhipuai` OR HTTP | Optional | `npm install zhipuai` |
| **MiniMax** | `openai` (compatible) | Optional | Uses openai package |

**Note**: In `build-only` mode, generate all adapter files but only install core dependencies in package.json. Mark AI SDKs as optionalDependencies or peerDependencies.

---

## System Dependencies Check

### PHASE 0.5: Environment Validation

```
Step 0.5: Check System Dependencies
          │
          ├─ Check Node.js version
          │    ├─ Required: >= 18.x
          │    ├─ IF fail → ERROR: "Node.js 18+ required, found {version}"
          │    └─ Log version to DEV_REPORT.md
          │
          ├─ Check npm availability
          │    └─ IF fail → ERROR: "npm not found, please install Node.js"
          │
          └─ Check PDF processing dependencies
               │
               ├─ Try: gm -version (GraphicsMagick)
               ├─ Try: convert -version (ImageMagick)
               │
               ├─ IF both fail AND mode == "full-test":
               │    └─ ERROR: "PDF image extraction requires GraphicsMagick or ImageMagick"
               │    └─ "Install: choco install graphicsmagick (Windows)"
               │    └─ "Install: brew install graphicsmagick (macOS)"
               │    └─ "Install: sudo apt-get install graphicsmagick (Linux)"
               │    └─ STOP (cannot run full-test without PDF processing)
               │
               └─ IF both fail AND mode == "build-only":
                    └─ WARNING: "GraphicsMagick/ImageMagick not found"
                    └─ "PDF processing will use text-only fallback (pdf-parse)"
                    └─ "For full PDF image extraction, install GraphicsMagick"
                    └─ CONTINUE (build-only can proceed)
```

---

## Execution Workflow

### PHASE 0: Initialization

```
Step 0.1: Validate Parameters (see Parameter Specification above)
          └─ Log validated config to DEV_REPORT.md (REDACT sensitive fields)

Step 0.2: System Dependencies Check (see PHASE 0.5 above)

Step 0.3: Read and Parse Documents
          ├─ Read PRD.md
          │    ├─ Extract: Version list and features
          │    ├─ Extract: Feature requirements for target version
          │    ├─ Extract: Business rules
          │    ├─ Extract: Data contracts
          │    └─ Extract: UI/UX specifications
          │
          └─ Read ARCHITECTURE.md
               ├─ Extract: System architecture
               ├─ Extract: Component structure
               ├─ Extract: API specifications
               ├─ Extract: Service implementations
               └─ Extract: AI adapter patterns

Step 0.4: Initialize Output Directory
          ├─ Create output_dir if not exists
          ├─ Initialize DEV_REPORT.md with header
          ├─ Initialize tracking variables:
          │    ├─ current_phase = "Initialization"
          │    ├─ files_generated = 0
          │    ├─ fix_iteration = 0
          │    ├─ max_fix_iterations = 5
          │    ├─ checkpoint_states = [] (for rollback)
          │    ├─ last_good_state = null
          │    └─ verification_threshold = 0.8 (80%)
          └─ Log: "Initialization complete for {version}, mode: {mode}"
```

### PHASE 1: Scaffolding

```
Step 1.1: Create Directory Structure
          │
          ├─ frontend/
          │    ├─ public/
          │    │    └─ index.html
          │    ├─ src/
          │    │    ├─ components/
          │    │    │    ├─ Layout/
          │    │    │    ├─ ModelConfig/
          │    │    │    ├─ FileUploader/
          │    │    │    ├─ UnitSelector/
          │    │    │    ├─ ResultPanel/
          │    │    │    │    ├─ CompanyInfoCard/
          │    │    │    │    ├─ FinancialTable/
          │    │    │    │    ├─ NonFinancialCard/
          │    │    │    │    └─ ValidationModal/
          │    │    │    ├─ AccountingStatus/
          │    │    │    └─ HistoryPanel/
          │    │    ├─ services/
          │    │    ├─ hooks/
          │    │    ├─ utils/
          │    │    └─ store/
          │    └─ package.json
          │
          ├─ backend/
          │    ├─ src/
          │    │    ├─ routes/
          │    │    ├─ services/
          │    │    ├─ adapters/
          │    │    ├─ prompts/
          │    │    └─ middleware/
          │    ├─ uploads/
          │    └─ package.json
          │
          └─ vercel.json

Step 1.2: Generate Configuration Files
          ├─ frontend/package.json (with core deps only, AI SDKs as optional)
          ├─ frontend/vite.config.js
          ├─ frontend/index.html
          ├─ backend/package.json (with core deps, AI SDKs as optionalDependencies)
          ├─ backend/.env.example
          └─ vercel.json
```

### PHASE 2: Backend Development

```
Step 2.1: Core Server Setup
          ├─ app.js (Express app, CORS, middleware, routes)
          └─ middleware/
               ├─ errorHandler.js
               ├─ fileUpload.js
               └─ rateLimiter.js

Step 2.2: AI Model Adapters
          ├─ adapters/BaseAdapter.js (abstract base class)
          ├─ adapters/ClaudeAdapter.js
          ├─ adapters/OpenAIAdapter.js
          ├─ adapters/GeminiAdapter.js
          ├─ adapters/DeepSeekAdapter.js
          ├─ adapters/KimiAdapter.js
          ├─ adapters/GLMAdapter.js
          ├─ adapters/MiniMaxAdapter.js
          └─ adapters/AdapterFactory.js

Step 2.3: Core Services
          ├─ services/PDFService.js
          ├─ services/ExtractionService.js
          ├─ services/ValidationService.js
          ├─ services/AccountingCheckService.js
          ├─ services/UnitConvertService.js
          └─ services/ExportService.js

Step 2.4: API Routes
          ├─ routes/extract.js
          ├─ routes/validate.js
          └─ routes/models.js

Step 2.5: Prompts
          ├─ prompts/extractPrompt.js
          └─ prompts/validatePrompt.js
```

### PHASE 3: Frontend Development

```
Step 3.1: Core Setup
          ├─ main.jsx
          ├─ App.jsx
          └─ store/useStore.js

Step 3.2: Layout Components
          ├─ Layout/Header.jsx
          └─ Layout/Sider.jsx

Step 3.3: Feature Components
          ├─ ModelConfig/
          ├─ FileUploader/
          ├─ UnitSelector/
          ├─ ResultPanel/
          ├─ AccountingStatus/
          └─ HistoryPanel/

Step 3.4: Services & Hooks
          ├─ services/apiService.js
          ├─ services/storageService.js
          ├─ services/exportService.js
          └─ hooks/

Step 3.5: Styles
          └─ src/styles.css
```

### PHASE 4: Testing & Fixing (优化版)

```
Step 4.1: Install Dependencies
          ├─ cd {output_dir}/frontend && npm install
          ├─ cd {output_dir}/backend && npm install
          └─ Log any installation errors

Step 4.2: Static Analysis (L0 - Build Validation)
          ├─ Check file structure completeness
          ├─ Check import/export consistency
          └─ Check for obvious syntax errors

Step 4.3: Startup Test (L1 - Smoke Test, ALWAYS RUN in both modes)
          ├─ Start Backend: npm run dev
          ├─ Start Frontend: npm run dev
          └─ Verify both services are running

Step 4.4: Layered Testing (ONLY IF mode == "full-test")
          ├─ L2 - Unit Tests (see Layered Test Specification)
          ├─ L3 - Integration Tests (see Layered Test Specification)
          ├─ L4 - API Contract Tests (see API Test Specification)
          ├─ L5 - Security Tests (see Security Test Specification)
          └─ L6 - Performance Tests (see Performance Test Specification)

Step 4.5: 🆕 L7 - Human Test Checkpoint (优化版)
          ├─ 7.1: 自动化测试 (AI执行: HT-01~04, HT-09)
          │       ├─ 页面加载、API验证、PDF上传、数据提取、错误处理
          │       └─ 输出自动化测试报告
          ├─ 7.2: 问题分类与修复 (如有问题立即修复)
          └─ 7.3: 逐步人工测试 (Human执行: HT-05~08, HT-10)
                  ├─ 一次只输出一个测试项
                  ├─ 等待用户确认后进行下一项
                  └─ FAIL则立即修复再继续

Step 4.6: 🆕 Root Cause Analysis
          ├─ Cluster similar issues
          ├─ Identify root causes
          └─ Generate fix strategies

Step 4.7: 🔄 Tiered Fix Loop
          ├─ P0 fixes (max 3 iterations, requires human confirmation)
          ├─ P1 fixes (max 5 iterations)
          ├─ P2 fixes (max 3 iterations)
          └─ P3 fixes (max 2 iterations, optional)

Step 4.8: 🆕 L8 - Human Acceptance
          ├─ Core function acceptance (AC-01 to AC-06)
          ├─ UI/UX acceptance (AC-07 to AC-09)
          ├─ Known issues confirmation (AC-10)
          └─ Deployment confirmation (AC-11)
```

---

## Layered Test Specification

### Test Pyramid

```
                              ┌─────────────────┐
                              │  L8: 人工验收    │  ← Human acceptance (CRITICAL, both modes)
                              └─────────────────┘
                            ┌─────────────────────┐
                            │  L7: 人工测试检查点  │  ← Human test checkpoint (both modes)
                            └─────────────────────┘
                          ┌─────────────────────────┐
                          │  L6: Performance        │  ← Performance/Stress (optional, full-test)
                          └─────────────────────────┘
                        ┌─────────────────────────────┐
                        │  L5: Security               │  ← Security validation (full-test only)
                        └─────────────────────────────┘
                      ┌─────────────────────────────────┐
                      │  L4: API Contract               │  ← End-to-end API tests (full-test only)
                      └─────────────────────────────────┘
                    ┌─────────────────────────────────────┐
                    │  L3: Integration                    │  ← Service integration (full-test only)
                    └─────────────────────────────────────┘
                  ┌─────────────────────────────────────────┐
                  │  L2: Unit Tests                         │  ← Function-level tests (full-test only)
                  └─────────────────────────────────────────┘
                ┌─────────────────────────────────────────────┐
                │  L1: Smoke Tests                            │  ← Startup validation (both modes)
                └─────────────────────────────────────────────┘
              ┌─────────────────────────────────────────────────┐
              │  L0: Build Validation                           │  ← Static analysis (both modes)
              └─────────────────────────────────────────────────┘
```

### Test Level Summary

| Level | Name | Mode | Purpose | Executor |
|-------|------|------|---------|----------|
| L0 | Build Validation | Both | Static analysis, syntax check | AI |
| L1 | Smoke Tests | Both | Startup validation | AI |
| L2 | Unit Tests | full-test | Function-level tests | AI |
| L3 | Integration | full-test | Service integration | AI |
| L4 | API Contract | full-test | End-to-end API tests | AI |
| L5 | Security | full-test | Security validation | AI |
| L6 | Performance | full-test | Performance/Stress | AI |
| **L7** | **Human Test Checkpoint** | **Both** | **人工功能测试** | **Human** |
| **L8** | **Human Acceptance** | **Both** | **部署前人工验收** | **Human** |

### L2 - Unit Tests

| Module | Test File | Test Cases |
|--------|-----------|------------|
| **UnitConvertService** | `tests/unit/unitConvert.test.js` | yuan→wan→yi conversion accuracy, edge cases (0, null, NaN) |
| **AccountingCheckService** | `tests/unit/accountingCheck.test.js` | Balance sheet rule, gross profit rule, tolerance boundary (0.9%, 1%, 1.1%) |
| **ValidationService** | `tests/unit/validation.test.js` | Result comparison, confidence calculation |
| **AdapterFactory** | `tests/unit/adapterFactory.test.js` | Provider mapping, invalid provider handling |

### L3 - Integration Tests

| Integration Point | Test File | Test Cases |
|-------------------|-----------|------------|
| **PDF → AI → Result** | `tests/integration/extractFlow.test.js` | Full extraction pipeline with mock PDF |
| **Upload → Process → Response** | `tests/integration/upload.test.js` | File upload handling, size limits, type validation |
| **Storage → Encrypt → Decrypt** | `tests/integration/storage.test.js` | API key encryption/decryption roundtrip |

### L4 - API Contract Tests

| Endpoint | Test File | Assertions |
|----------|-----------|------------|
| **GET /api/models** | `tests/api/models.test.js` | Status 200, returns array, each item has {id, name, keyFormat} |
| **POST /api/validate-key** | `tests/api/validateKey.test.js` | Valid key returns {success: true, models: [...]}, Invalid key returns 401 with error code |
| **POST /api/extract** | `tests/api/extract.test.js` | See detailed specification below |

### L4 - Extract API Detailed Assertions

```javascript
// tests/api/extract.test.js - Detailed Assertions
describe('POST /api/extract', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. Response Structure Validation
  // ─────────────────────────────────────────────────────────────
  test('Response structure completeness', async () => {
    const res = await request(app).post('/api/extract').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('companyInfo');
    expect(res.body.data).toHaveProperty('financialMetrics');
    expect(res.body.data).toHaveProperty('nonFinancialInfo');
    expect(res.body.data).toHaveProperty('accountingCheck');
    expect(res.body.data).toHaveProperty('unitInfo');
    expect(res.body.data).toHaveProperty('metadata');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Financial Metrics Completeness (21 items)
  // ─────────────────────────────────────────────────────────────
  test('Financial metrics completeness', async () => {
    const res = await request(app).post('/api/extract').send(validPayload);
    const metrics = res.body.data.financialMetrics;

    const requiredMetrics = [
      '营业收入', '营业成本', '毛利润', '净利润', '归母净利润', '扣非净利润',
      '总资产', '总负债', '净资产', '流动资产', '流动负债', '应收账款', '存货',
      '经营活动现金流净额', '投资活动现金流净额', '筹资活动现金流净额',
      '毛利率', '净利率', '资产负债率', '流动比率', 'ROE'
    ];

    const extractedNames = metrics.map(m => m.name);
    const missing = requiredMetrics.filter(n => !extractedNames.includes(n));

    expect(missing).toHaveLength(0);
    expect(metrics.length).toBeGreaterThanOrEqual(21);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Confidence Distribution Requirements
  // ─────────────────────────────────────────────────────────────
  test('Confidence distribution meets threshold', async () => {
    const res = await request(app).post('/api/extract').send(validPayload);
    const metrics = res.body.data.financialMetrics;

    const highConfidence = metrics.filter(m => m.confidence === 'high').length;
    const mediumConfidence = metrics.filter(m => m.confidence === 'medium').length;
    const lowConfidence = metrics.filter(m => m.confidence === 'low').length;

    // At least 70% should be high confidence
    expect(highConfidence / metrics.length).toBeGreaterThanOrEqual(0.7);
    // No more than 10% should be low confidence
    expect(lowConfidence / metrics.length).toBeLessThanOrEqual(0.1);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Accounting Check Validation
  // ─────────────────────────────────────────────────────────────
  test('Accounting check error thresholds', async () => {
    const res = await request(app).post('/api/extract').send(validPayload);
    const checks = res.body.data.accountingCheck.checks;

    for (const check of checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('formula');
      expect(check).toHaveProperty('passed');
      expect(check).toHaveProperty('difference');
      expect(check).toHaveProperty('differencePercent');

      // If passed, difference must be within 1% tolerance
      if (check.passed) {
        expect(parseFloat(check.differencePercent)).toBeLessThanOrEqual(1.0);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Unit Conversion Correctness
  // ─────────────────────────────────────────────────────────────
  test('Unit conversion accuracy', async () => {
    const res = await request(app).post('/api/extract').send({
      ...validPayload,
      displayUnit: 'wan'
    });

    const metrics = res.body.data.financialMetrics;
    const unitInfo = res.body.data.unitInfo;

    expect(unitInfo.displayUnit).toBe('wan');

    // Verify numeric values are properly formatted
    for (const metric of metrics) {
      if (metric.value !== null && !metric.name.includes('率')) {
        expect(typeof metric.value).toBe('number');
        expect(metric.displayValue).toMatch(/^[\d,]+\.?\d*$/); // Number with commas
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Data Traceability
  // ─────────────────────────────────────────────────────────────
  test('All metrics have source traceability', async () => {
    const res = await request(app).post('/api/extract').send(validPayload);
    const metrics = res.body.data.financialMetrics;

    for (const metric of metrics) {
      if (metric.value !== null) {
        expect(metric.source).toBeDefined();
        expect(metric.source.page).toBeDefined();
        expect(metric.source.page).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
```

### L5 - Security Tests

| Security Domain | Test File | Test Cases |
|-----------------|-----------|------------|
| **Input Injection** | `tests/security/injection.test.js` | SQL injection in params, XSS in text fields, Path traversal in file paths |
| **File Upload** | `tests/security/upload.test.js` | Non-PDF file rejection, Oversized file (>50MB) rejection, Malicious PDF detection |
| **Rate Limiting** | `tests/security/rateLimit.test.js` | 11th request within 1 minute returns 429, Rate limit headers present |
| **API Key Handling** | `tests/security/apiKey.test.js` | Key not logged in plaintext, Key redacted in error messages, Key not persisted on server |
| **Authentication** | `tests/security/auth.test.js` | Missing API key returns 400, Invalid API key returns 401 |

```javascript
// tests/security/upload.test.js - Example
describe('File Upload Security', () => {
  test('Rejects non-PDF files', async () => {
    const res = await request(app)
      .post('/api/extract')
      .attach('pdf', Buffer.from('not a pdf'), 'test.exe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('Rejects oversized files', async () => {
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
    const res = await request(app)
      .post('/api/extract')
      .attach('pdf', largeBuffer, 'large.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  test('Validates PDF magic bytes', async () => {
    const fakePdf = Buffer.from('%PDF-1.4\nfake content');
    const res = await request(app)
      .post('/api/extract')
      .attach('pdf', fakePdf, 'fake.pdf');

    // Should either reject or handle gracefully
    expect([200, 400, 422]).toContain(res.status);
  });
});
```

### L6 - Performance Tests

| Scenario | Test File | Thresholds |
|----------|-----------|------------|
| **Response Time** | `tests/performance/latency.test.js` | P50 < 30s, P95 < 60s, P99 < 120s |
| **Concurrent Requests** | `tests/performance/concurrent.test.js` | 5 concurrent requests, all complete within 180s |
| **Timeout Handling** | `tests/performance/timeout.test.js` | AI model timeout at 60s triggers fallback |
| **Memory Stability** | `tests/performance/memory.test.js` | No memory leak after 10 sequential extracts |

```javascript
// tests/performance/latency.test.js - Example
describe('API Latency', () => {
  test('Extract API response time within threshold', async () => {
    const times = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await request(app).post('/api/extract').send(validPayload);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p50 = times[5];
    const p95 = times[9];

    expect(p50).toBeLessThan(30000);  // 30 seconds
    expect(p95).toBeLessThan(60000);  // 60 seconds
  });
});
```

### L7 - Human Test Checkpoint (🆕 优化版)

> **核心原则**: 能自动化的尽量自动化，必须人工的逐步进行（一步一确认）

#### 测试分类

| 类别 | 执行者 | 测试项 | 原因 |
|-----|-------|-------|-----|
| **自动化测试** | AI | HT-01~HT-04, HT-09 | 可通过 API 调用或代码验证 |
| **逐步人工测试** | Human | HT-05~HT-08, HT-10 | 需要视觉确认或人工判断 |

#### 执行流程

```
L7 Test Checkpoint
    │
    ├─ Step 7.1: 🔧 自动化测试 (AI 执行)
    │    ├─ HT-01: 页面加载 (curl 请求首页)
    │    ├─ HT-02: API Key 验证 (调用 /api/validate)
    │    ├─ HT-03: PDF 上传 (调用 /api/extract)
    │    ├─ HT-04: 数据提取 (验证返回数据结构)
    │    └─ HT-09: 错误处理 (测试异常输入)
    │    输出: 自动化测试报告
    │
    ├─ Step 7.2: 问题分类与修复 (如有问题)
    │    └─ 对自动化测试发现的问题进行修复
    │
    └─ Step 7.3: 👤 逐步人工测试 (Human 执行)
         ├─ 一次只输出一个测试项
         ├─ 等待用户确认 PASS/FAIL
         ├─ 如 FAIL，立即修复后再进行下一项
         └─ 全部通过后进入 L8
```

#### 自动化测试项目 (AI 执行)

```javascript
// HT-01: 页面加载 - 检查前端服务响应
GET http://localhost:5173/ → 200 OK + HTML content

// HT-02: API Key 验证 - 调用验证接口
POST /api/validate { provider, apiKey } → { success: true/false }

// HT-03: PDF 上传 - 测试文件上传接口
POST /api/extract { pdf file } → 接收文件并返回处理状态

// HT-04: 数据提取 - 验证返回数据结构
Response must contain: { companyInfo, financialMetrics[], accountingCheck }

// HT-09: 错误处理 - 测试异常输入
- 无效 API Key → 返回错误提示
- 非 PDF 文件 → 返回错误提示
```

#### 逐步人工测试项目 (Human 逐项执行)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    👤 逐步人工测试 (一次一项)                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  执行规则:                                                                  ║
║  1. AI 输出当前测试项的详细说明                                              ║
║  2. 用户在浏览器中执行测试                                                  ║
║  3. 用户回复 "PASS" 或 "FAIL, 问题描述: xxx"                                ║
║  4. 如 FAIL，AI 立即修复，修复后重新测试该步骤                               ║
║  5. 通过后才进行下一步                                                      ║
║                                                                            ║
║  测试项目 (按顺序执行):                                                      ║
║  ─────────────────────────────────────────────────────────────────────    ║
║  HT-05: 结果展示 (检查数据展示是否正确)                                      ║
║  HT-06: 勾稽核对 (检查会计计算逻辑)                                          ║
║  HT-07: 单位转换 (检查元/万元/亿元转换)                                      ║
║  HT-08: Excel 导出 (检查导出文件内容)                                        ║
║  HT-10: 边缘案例 (测试极端情况)                                             ║
║                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 问题优先级定义 (🆕 新增)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    问题优先级分类                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  P0 - CRITICAL (阻塞核心功能)                                              ║
║  ─────────────────────────────                                             ║
║  定义: 导致核心功能完全无法使用的问题                                        ║
║  示例:                                                                     ║
║    • 服务无法启动                                                          ║
║    • 页面白屏/无法加载                                                     ║
║    • PDF 上传完全失败                                                      ║
║    • API 调用完全失败                                                      ║
║  迭代预算: 3 次                                                            ║
║  验证标准: 100% 相关测试通过 + 人工确认                                     ║
║  超时处理: ⏸️ 暂停，请求人工介入                                            ║
║                                                                            ║
║  P1 - HIGH (核心功能异常)                                                   ║
║  ─────────────────────────────                                             ║
║  定义: 核心功能可运行但结果不正确的问题                                      ║
║  示例:                                                                     ║
║    • 数据提取结果错误/不完整                                               ║
║    • 勾稽核对计算错误                                                      ║
║    • 单位转换错误                                                          ║
║    • 导出数据不完整                                                        ║
║  迭代预算: 5 次                                                            ║
║  验证标准: 100% 相关测试通过                                               ║
║  超时处理: 记录为已知问题，继续下一优先级                                    ║
║                                                                            ║
║  P2 - MEDIUM (次要功能异常)                                                 ║
║  ─────────────────────────────                                             ║
║  定义: 不影响核心功能但影响用户体验的问题                                    ║
║  示例:                                                                     ║
║    • UI 展示问题 (错位、重叠)                                              ║
║    • 数值格式问题 (小数位、千分位)                                          ║
║    • 提示信息不准确                                                        ║
║    • 响应速度慢                                                            ║
║  迭代预算: 3 次                                                            ║
║  验证标准: 90% 相关测试通过                                                ║
║  超时处理: 记录为已知问题，继续下一优先级                                    ║
║                                                                            ║
║  P3 - LOW (体验优化)                                                       ║
║  ─────────────────────────────                                             ║
║  定义: 不影响功能的小问题                                                   ║
║  示例:                                                                     ║
║    • 文案优化                                                              ║
║    • 样式微调                                                              ║
║    • 动画效果                                                              ║
║    • 代码优化                                                              ║
║  迭代预算: 2 次 (可跳过)                                                   ║
║  验证标准: 80% 相关测试通过                                                ║
║  超时处理: 记录为后续优化项                                                ║
║                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 问题根因分析 (🆕 新增)

在进入修复循环前，必须进行根因分析:

```
Root Cause Analysis Flow:
    │
    ├─ Step RCA-1: 问题聚类
    │    ├─ 将相似问题归为同一类别
    │    ├─ 识别共同的根本原因
    │    └─ 生成问题关系图
    │
    ├─ Step RCA-2: 根因识别
    │    ├─ 分析问题背后的根本原因
    │    ├─ 区分"症状"和"病因"
    │    └─ 确定修复的切入点
    │
    └─ Step RCA-3: 修复策略生成
         ├─ 针对根因制定修复方案
         ├─ 评估修复的影响范围
         └─ 预测可能引入的新问题

Example:
┌──────────────────────────────────────────────────────────────────────────┐
│ 问题: HT-04 数据提取失败                                                  │
│ 症状: API 返回空数据                                                      │
│ 根因: PDFService.js 中 pdf-parse 返回空文本                               │
│ 修复: 添加 pdf2pic 作为备选方案                                           │
│ 影响范围: PDFService.js, package.json                                     │
│ 风险: 需要安装 GraphicsMagick                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Test Dataset Specification

### Minimum Test Dataset (full-test mode)

| Category | File | Purpose | Required |
|----------|------|---------|----------|
| **Standard** | `test_standard.pdf` | Normal annual report, all 21 metrics present | ✅ Yes |
| **Multi-Unit** | `test_unit_yi.pdf` | Report using 亿元 as base unit | ✅ Yes |
| **Partial Data** | `test_partial.pdf` | Missing some metrics (tests null handling) | ⬜ Optional |
| **Edge Case** | `test_edge.pdf` | Unusual formatting, merged cells | ⬜ Optional |
| **Bad Sample** | `test_invalid.pdf` | Corrupted or non-financial PDF | ⬜ Optional |

### Test Dataset Parameter

```javascript
// Extended parameter for test datasets
test_datasets: {
  standard: 'path/to/standard.pdf',     // Required for full-test
  multi_unit: 'path/to/unit_yi.pdf',    // Required for full-test
  partial: 'path/to/partial.pdf',       // Optional
  edge: 'path/to/edge.pdf',             // Optional
  invalid: 'path/to/invalid.pdf'        // Optional
}

// If only test_pdf_path is provided, use it as standard
// Log warning if multi_unit not provided: "Unit conversion tests will be limited"
```

### PHASE 4.5: Tiered Fix Loop with Rollback (优化版)

> **重要变更**: 原策略所有问题平等处理，最多 5 次迭代。新策略按优先级分层处理，总预算 13 次。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIERED FIX LOOP (分层修复循环)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Initialize:                                                                 │
│    last_good_state = snapshot of all current files                          │
│    checkpoint_history = []                                                   │
│    issues_by_priority = { P0: [], P1: [], P2: [], P3: [] }                  │
│    iteration_budget = { P0: 3, P1: 5, P2: 3, P3: 2 }                        │
│    current_priority = P0                                                    │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  分层修复策略                                                                 │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 优先级 │ 迭代预算 │ 验证标准                    │ 超时处理          │   │
│  ├────────┼──────────┼─────────────────────────────┼───────────────────┤   │
│  │ P0     │ 3 次     │ 100% + 人工确认             │ ⏸️ 暂停请求人工   │   │
│  │ P1     │ 5 次     │ 100% 自动验证               │ 记录待办，继续    │   │
│  │ P2     │ 3 次     │ 90% 自动验证                │ 记录待办，继续    │   │
│  │ P3     │ 2 次     │ 80% 自动验证                │ 记录已知问题      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  总迭代预算: P0(3) + P1(5) + P2(3) + P3(2) = 13 次                          │
│  (原策略: 5 次总预算)                                                        │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  PASS RATE CALCULATION (Unified Definition)                                 │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│    total_tests = count of ALL test cases in current test level              │
│    passed = count of test cases with status == PASS                         │
│    skipped = count of test cases with status == SKIP (excluded from ratio)  │
│    pass_rate = passed / (total_tests - skipped)                             │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  分层修复流程                                                                 │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  FOR each priority in [P0, P1, P2, P3]:                                     │
│                                                                              │
│    WHILE (issues_exist_in_priority AND iteration < budget[priority]):       │
│                                                                              │
│      Step 4.5.1: Save Checkpoint                                            │
│           checkpoint = {                                                     │
│             id: "{priority}-{iteration}",                                   │
│             timestamp: now(),                                                │
│             files: snapshot_all_files(),                                    │
│             issue_being_fixed: current_issue.description,                    │
│             previous_pass_rate: current pass_rate                           │
│           }                                                                  │
│           checkpoint_history.push(checkpoint)                               │
│           Log: "Checkpoint saved: {priority} #{iteration}"                  │
│                                                                              │
│      Step 4.5.2: Analyze Error (根因分析)                                    │
│           ├─ Parse error message/stack trace                                │
│           ├─ Identify ROOT CAUSE (not just symptoms)                        │
│           ├─ Determine affected files                                       │
│           └─ Classify file severity (see File Severity Table)               │
│                                                                              │
│      Step 4.5.3: Apply Fix                                                  │
│           ├─ Fix based on root cause analysis                               │
│           ├─ Ensure fix doesn't break other parts                           │
│           └─ Log fix details to DEV_REPORT.md                               │
│                                                                              │
│      Step 4.5.4: Verification Gate                                          │
│           ├─ Re-run FULL test suite                                         │
│           ├─ Calculate pass_rate                                            │
│           ├─ Get threshold for current priority (P0:100%, P1:100%, etc.)    │
│           │                                                                  │
│           ├─ IF pass_rate >= threshold:                                     │
│           │     ├─ ✅ ACCEPT fix                                            │
│           │     ├─ Update last_good_state                                   │
│           │     ├─ IF priority == P0:                                       │
│           │     │    └─ ⏸️ REQUEST human confirmation                       │
│           │     │       "P0 问题已修复，请验证: {功能点}"                     │
│           │     │       WAIT for: "PASS" or "FAIL, 问题描述"                │
│           │     └─ Continue to next issue                                   │
│           │                                                                  │
│           ├─ IF pass_rate improved BUT < threshold:                         │
│           │     ├─ ⚠️ KEEP fix, continue iterating                          │
│           │     └─ iteration++                                              │
│           │                                                                  │
│           └─ IF pass_rate DECREASED (regression):                           │
│                 ├─ 🔄 ROLLBACK to checkpoint                                │
│                 ├─ Try ALTERNATIVE fix approach                             │
│                 └─ iteration++                                              │
│                                                                              │
│    END WHILE                                                                 │
│                                                                              │
│    IF issues_remain_in_priority:                                            │
│      ├─ Log: "{priority} 问题未完全解决，记录为待办/已知问题"                 │
│      ├─ IF priority == P0:                                                  │
│      │    └─ ⏸️ PAUSE: "P0 问题无法解决，需要人工介入"                       │
│      │        WAIT for user decision                                        │
│      └─ Continue to next priority                                           │
│                                                                              │
│  END FOR                                                                     │
│                                                                              │
│  // 所有优先级处理完成后，进入 L8 人工验收                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### L8 - Human Acceptance (🆕 新增)

> **CRITICAL**: L8 是部署前的最后一道关卡，必须人工确认核心功能正常

#### 触发条件
- 所有 P0-P1 问题修复完成
- P2-P3 问题处理完毕（修复或记录为已知问题）

#### 执行流程

```
L8 Human Acceptance
    │
    ├─ Step 8.1: ⏸️ 暂停自动化流程
    │             输出: "请进行最终验收，确认可以部署"
    │
    ├─ Step 8.2: 📋 输出验收清单
    │             (见下方 Acceptance Checklist)
    │
    ├─ Step 8.3: 🔄 等待验收结果
    │             用户反馈格式: "AC-XX: PASS" 或 "AC-XX: FAIL"
    │
    └─ Step 8.4: 判断验收结果
                  ├─ PASS → 进入部署阶段
                  ├─ CONDITIONAL_PASS → 记录已知问题，进入部署阶段
                  └─ FAIL → 返回修复循环
```

#### Acceptance Checklist

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    📋 ACCEPTANCE CHECKLIST                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  请逐项验收，确认可以部署到生产环境                                          ║
║  格式: "AC-XX: PASS" 或 "AC-XX: FAIL, 原因: xxx"                            ║
║                                                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  一、核心功能验收 (必须全部 PASS)                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                                                            ║
║  □ AC-01: PDF 上传功能                                                      ║
║      - 可以正常上传 PDF 文件                                                ║
║      - 文件信息显示正确                                                     ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-02: AI 模型调用                                                       ║
║      - API Key 验证正常                                                    ║
║      - 模型调用成功                                                        ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-03: 数据提取                                                          ║
║      - 提取的 21 个指标完整                                                 ║
║      - 数据值正确                                                          ║
║      - 置信度标注正确                                                      ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-04: 勾稽核对                                                          ║
║      - 核对规则正确                                                        ║
║      - 计算结果准确                                                        ║
║      - 误差在允许范围内                                                    ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-05: 单位转换                                                          ║
║      - 元/万元/亿元转换正确                                                 ║
║      - 显示格式正确                                                        ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-06: Excel 导出                                                        ║
║      - 导出文件可下载                                                      ║
║      - Excel 内容完整正确                                                  ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  二、UI/UX 验收 (可接受已知小问题)                                           ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                                                            ║
║  □ AC-07: 页面布局                                                          ║
║      - 页面布局正常                                                        ║
║      - 响应式适配正常                                                      ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-08: 交互响应                                                          ║
║      - 按钮点击响应正常                                                    ║
║      - 加载状态显示正常                                                    ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-09: 错误提示                                                          ║
║      - 错误提示友好                                                        ║
║      - 错误信息准确                                                        ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  三、已知问题确认                                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                                                            ║
║  □ AC-10: 已知问题清单已确认                                                ║
║      - 所有未修复问题已记录                                                ║
║      - 问题影响已评估                                                      ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
║  □ AC-11: 部署确认                                                          ║
║      - 确认可以部署到生产环境                                               ║
║      - 结果: [PASS/FAIL]                                                    ║
║                                                                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

#### 验收决策规则

| 验收结果 | 条件 | 后续操作 |
|---------|-----|---------|
| **PASS** | AC-01 ~ AC-06 全部 PASS，AC-07 ~ AC-11 PASS | 进入部署阶段 |
| **CONDITIONAL_PASS** | AC-01 ~ AC-06 全部 PASS，AC-07 ~ AC-11 有 FAIL | 记录已知问题，进入部署阶段 |
| **FAIL** | AC-01 ~ AC-06 有任何 FAIL | 返回修复循环，重新处理 P0/P1 问题 |

---

### PHASE 5: Deployment (if deploy=true)

```
Step 5.1: Pre-Deployment Build Verification
          ├─ cd {output_dir}/frontend && npm run build
          ├─ Verify dist/ folder created
          ├─ Verify dist/index.html exists
          ├─ Verify dist/assets/ contains JS/CSS bundles
          └─ Log build size and asset count

Step 5.2: Backend Build Check
          ├─ Verify backend can start in production mode
          ├─ Check for missing production dependencies
          └─ Verify environment variables template exists

Step 5.3: Deploy to Vercel
          ├─ Execute: vercel --prod
          ├─ Wait for deployment URL
          ├─ Log deployment URL to DEV_REPORT.md
          └─ Record deployment timestamp

Step 5.4: Post-Deployment Verification (CRITICAL)
          │
          ├─ Frontend Health Check:
          │    ├─ GET {deployment_url}/
          │    ├─ Expected: 200 OK with HTML content
          │    └─ Verify: No console errors in browser
          │
          ├─ API Health Check:
          │    ├─ GET {deployment_url}/api/health
          │    ├─ Expected: {"status": "ok", "version": "1.0.0"}
          │    └─ IF fail → Log error, deployment may be partial
          │
          ├─ API Models Check:
          │    ├─ GET {deployment_url}/api/models
          │    ├─ Expected: {"success": true, "models": [...]}
          │    └─ Verify: At least 3 providers listed
          │
          └─ Log all verification results to DEV_REPORT.md

Step 5.5: Deployment Failure Handling
          ├─ IF frontend fails → Log error, provide manual build guide
          ├─ IF API fails → Check Vercel logs, suggest environment variable check
          └─ NEVER auto-rollback from deployment (manual intervention required)
```

### PHASE 6: Completion

```
Step 6.1: Finalize DEV_REPORT.md
          ├─ Executive Summary
          ├─ Generated Files List
          ├─ Test Results
          ├─ Rollback History (if any)
          ├─ Known Issues
          └─ Next Steps

Step 6.2: Output Completion Message
```

---

## File Severity Classification (CRITICAL for Error Handling)

### Severity Levels

| Level | Files | On Failure | File-Level Retries | Global Limit |
|-------|-------|------------|-------------------|--------------|
| **CRITICAL** | `app.js`, `routes/*.js`, `App.jsx`, `main.jsx` | **STOP immediately** | 1 (failure = STOP) | N/A |
| **HIGH** | `services/*.js`, `adapters/BaseAdapter.js`, `AdapterFactory.js` | Enter fix loop | 3 per file | 5 iterations |
| **MEDIUM** | `adapters/[specific].js`, `components/*`, `hooks/*` | Log, continue, retry later | 2 per file | 5 iterations |
| **LOW** | `utils/*`, `styles.css`, `.env.example` | Log, continue | 2 per file | 5 iterations |

### Retry Strategy Summary

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     RETRY STRATEGY (UNIFIED)                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  FILE-LEVEL RETRY (within single fix iteration):                          ║
║    CRITICAL: 1 attempt  → Failure = STOP entire execution                 ║
║    HIGH:     3 attempts → If all fail, increment fix_iteration            ║
║    MEDIUM:   2 attempts → If all fail, increment fix_iteration            ║
║    LOW:      2 attempts → If all fail, increment fix_iteration            ║
║                                                                           ║
║  FIX LOOP RETRY (across iterations):                                      ║
║    ALL levels: max_fix_iterations = 5 (GLOBAL limit)                      ║
║                                                                           ║
║  Example flow for HIGH file:                                              ║
║    Iteration 1: Try fix → Fail → Retry 1 → Fail → Retry 2 → Fail          ║
║                 → Retry 3 → Fail → fix_iteration++                         ║
║    Iteration 2: Alternative approach... (up to 5 total iterations)        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Decision Flow for File Generation Failure

```
file_generation_failed(file)
  │
  ├─ Get file severity level
  │
  ├─ IF severity == CRITICAL:
  │     └─ STOP: "Critical file generation failed: {file}"
  │     └─ DO NOT continue to next phase
  │     └─ Log error details to DEV_REPORT.md
  │
  ├─ IF severity == HIGH:
  │     └─ Retry up to 3 times for this file
  │     └─ IF all retries fail → Enter fix loop (Step 4.5)
  │     └─ Continue until fix_iteration >= 5
  │
  ├─ IF severity == MEDIUM:
  │     └─ Retry up to 2 times for this file
  │     └─ IF all retries fail → Log warning, continue with other files
  │     └─ fix_iteration++ (counts toward global limit)
  │
  └─ IF severity == LOW:
        └─ Retry up to 2 times for this file
        └─ IF all retries fail → Log info, continue
        └─ Generate placeholder if needed
```

---

## Error Handling Matrix

| Error Type | Severity | Action | Continue? |
|------------|----------|--------|-----------|
| **CRITICAL ERRORS (Always Stop)** |
| PRD file not found | CRITICAL | Report error with path | ❌ NO |
| ARCHITECTURE file not found | CRITICAL | Report error with path | ❌ NO |
| Invalid version specified | CRITICAL | List valid versions (V1-V5) | ❌ NO |
| Core file generation failed | CRITICAL | Report file, stop immediately | ❌ NO |
| Directory creation failed | CRITICAL | Report error with reason | ❌ NO |
| **MODE-SPECIFIC ERRORS** |
| [full-test] api_keys missing | HIGH | Report format requirements | ❌ NO |
| [full-test] test_pdf not found | HIGH | Report error with path | ❌ NO |
| [full-test] test_pdf not valid PDF | HIGH | Report validation error | ❌ NO |
| [full-test] GraphicsMagick missing | HIGH | Report install instructions | ❌ NO |
| [build-only] GraphicsMagick missing | LOW | Warn, note fallback available | ✅ YES |
| **TEST ERRORS** |
| Unit test failed | MEDIUM | Enter fix loop | ✅ YES |
| Integration test failed | MEDIUM | Enter fix loop | ✅ YES |
| API contract test failed | HIGH | Enter fix loop | ✅ YES |
| Security test failed | HIGH | Log vulnerability, enter fix loop | ✅ YES |
| Performance test failed | MEDIUM | Log warning, continue (not blocking) | ✅ YES |
| **RECOVERABLE ERRORS** |
| Non-core file generation failed | MEDIUM | Log error, continue with others | ✅ YES |
| npm install failed | MEDIUM | Log error, suggest manual install | ✅ YES |
| Startup test failed | HIGH | Enter fix loop | ✅ YES |
| **FIX LOOP EVENTS** |
| Fix loop exceeds 5 iterations | HIGH | ⏸️ PAUSE, request human input | ⏸️ PAUSE |
| Regression detected | MEDIUM | Rollback to checkpoint, try alt fix | ✅ YES |
| No improvement after fix | MEDIUM | Rollback, try alternative approach | ✅ YES |
| **DEPLOYMENT ERRORS** |
| Build failed | MEDIUM | Log error, skip deployment | ✅ YES |
| Deployment failed | LOW | Log error, provide manual guide | ✅ YES |
| Post-deploy verification failed | MEDIUM | Log which checks failed, provide diagnosis | ✅ YES |

---

## DEV_REPORT.md Format

```markdown
# Development Report - Financial Report Extractor

**Generated**: {timestamp}
**Version Developed**: {version}
**Execution Mode**: {mode}
**PRD Source**: {prd_path}
**ARCHITECTURE Source**: {architecture_path}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Status | ✅ SUCCESS / ⚠️ PARTIAL / ❌ FAILED |
| Files Generated | {count} |
| Fix Iterations | P0: {n}, P1: {n}, P2: {n}, P3: {n} |
| Rollback Events | {count} |
| Auto Test Pass Rate | {percentage}% |
| Human Test Pass Rate | {percentage}% |
| Acceptance Result | ✅ PASS / ⚠️ CONDITIONAL / ❌ FAIL |

---

## Configuration (REDACTED)

| Parameter | Value | Sensitive |
|-----------|-------|-----------|
| mode | {mode} | No |
| version | {version} | No |
| api_keys | [REDACTED - {count} providers configured] | **YES** |
| test_pdf | {filename only} | No |
| deploy | {deploy} | No |

---

## Generated Files

### Frontend ({count} files)
{file_list}

### Backend ({count} files)
{file_list}

### Configuration ({count} files)
{file_list}

---

## Test Results

### L0-L6: Automated Tests

#### Static Analysis (L0)
- ✅ File structure complete
- ✅ Import consistency verified
- ✅ No syntax errors

#### Startup Tests (L1)
- Backend: ✅ Running on port 3000
- Frontend: ✅ Running on port 5173

#### API Tests (L4 - full-test mode only)
| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/models | ✅/❌ | {notes} |
| POST /api/validate-key | ✅/❌ | [API key REDACTED] |
| POST /api/extract | ✅/❌ | [API key REDACTED] |

---

### L7: Human Test Results (🆕)

| Test ID | Description | Result | Issue Found |
|---------|-------------|--------|-------------|
| HT-01 | 页面加载 | ✅ PASS | - |
| HT-02 | API Key 配置 | ✅ PASS | - |
| HT-03 | PDF 上传 | ✅ PASS | - |
| HT-04 | 数据提取 | ❌ FAIL | 部分指标缺失 |
| HT-05 | 结果展示 | ✅ PASS | - |
| HT-06 | 勾稽核对 | ✅ PASS | - |
| HT-07 | 单位转换 | ⚠️ PARTIAL | 亿元格式异常 |
| HT-08 | Excel 导出 | ✅ PASS | - |
| HT-09 | 错误处理 | ✅ PASS | - |
| HT-10 | 边缘案例 | ✅ PASS | - |

**Human Test Pass Rate**: {passed}/{total} = {percentage}%

---

## Issues Found (🆕)

### Issues by Priority

| ID | Priority | Description | Source | Status |
|----|----------|-------------|--------|--------|
| I-001 | P1 | 数据提取部分指标缺失 | HT-04 | ✅ Fixed |
| I-002 | P2 | 亿元单位格式异常 | HT-07 | ✅ Fixed |
| I-003 | P3 | 按钮样式不一致 | HT-05 | ⏸️ Deferred |

---

## Root Cause Analysis (🆕)

| Issue ID | Symptom | Root Cause | Fix Strategy | Files Changed |
|----------|---------|------------|--------------|---------------|
| I-001 | 部分指标缺失 | prompt 未覆盖所有 21 个指标 | 更新 extractPrompt.js | prompts/extractPrompt.js |
| I-002 | 亿元格式异常 | 单位转换精度丢失 | 使用 toFixed(2) | services/UnitConvertService.js |

---

## Fix Iteration Log (🆕)

### P0 Fixes (Budget: 3, Used: 0)
- None required

### P1 Fixes (Budget: 5, Used: 2)
| Iteration | Issue | Action | Result |
|-----------|-------|--------|--------|
| 1 | I-001 | 更新 prompt | ✅ Pass |
| 2 | I-001 | 验证 | ✅ Verified |

### P2 Fixes (Budget: 3, Used: 1)
| Iteration | Issue | Action | Result |
|-----------|-------|--------|--------|
| 1 | I-002 | 修复精度 | ✅ Pass |

### P3 Fixes (Budget: 2, Used: 0)
- Skipped (non-blocking)

---

## L8: Human Acceptance Results (🆕)

| Acceptance Item | Result | Notes |
|-----------------|--------|-------|
| AC-01: PDF 上传 | ✅ PASS | - |
| AC-02: AI 模型调用 | ✅ PASS | - |
| AC-03: 数据提取 | ✅ PASS | - |
| AC-04: 勾稽核对 | ✅ PASS | - |
| AC-05: 单位转换 | ✅ PASS | - |
| AC-06: Excel 导出 | ✅ PASS | - |
| AC-07: 页面布局 | ✅ PASS | - |
| AC-08: 交互响应 | ✅ PASS | - |
| AC-09: 错误提示 | ✅ PASS | - |
| AC-10: 已知问题确认 | ✅ PASS | 1 个 P3 问题已记录 |
| AC-11: 部署确认 | ✅ PASS | - |

**Acceptance Decision**: ✅ PASS

---

## Rollback History

{if any rollbacks occurred, list them here}

| Checkpoint | Reason | Files Restored |
|------------|--------|----------------|
| P1-2 | Regression detected | ExtractionService.js |

---

## Known Issues

| Issue | Priority | Impact | Workaround |
|-------|----------|--------|------------|
| I-003 | P3 | 低 | 样式问题，不影响功能 |

---

## Next Steps

1. 运行 `npm install` 安装依赖
2. 运行 `npm run dev` 启动开发服务器
3. 访问 http://localhost:5173 进行测试
4. 配置 API Key 进行实际使用

---

## Deployment Info (if deployed)

- Deployment URL: {url}
- Deployed at: {timestamp}
```

---

## Few-Shot Examples

### ✅ Good Case: build-only Mode

```
════════════════════════════════════════════════════════════════
PHASE 0: INITIALIZATION
════════════════════════════════════════════════════════════════

[Validating parameters...]
  ✅ prd_path: Found
  ✅ architecture_path: Found
  ✅ output_dir: Ready
  ✅ version: V1 (valid)
  ✅ mode: build-only (default)

[Checking system dependencies...]
  ✅ Node.js: v20.10.0
  ✅ npm: 10.2.3
  ⚠️ GraphicsMagick: Not found (PDF processing will use text-only fallback)

[Generating files...]

════════════════════════════════════════════════════════════════
PHASE 6: COMPLETION
════════════════════════════════════════════════════════════════

✅ DEVELOPMENT COMPLETE

Version: V1 (MVP)
Mode: build-only
Files Generated: 35
Status: SUCCESS
```

### ✅ Good Case: full-test Mode

```
════════════════════════════════════════════════════════════════
PHASE 0: INITIALIZATION
════════════════════════════════════════════════════════════════

[Validating parameters...]
  ✅ prd_path: Found
  ✅ architecture_path: Found
  ✅ output_dir: Ready
  ✅ version: V1 (valid)
  ✅ mode: full-test
  ✅ api_keys: 3 providers [REDACTED]
  ✅ test_pdf_path: Found (8.2MB, 240 pages)

[Checking system dependencies...]
  ✅ Node.js: v20.10.0
  ✅ npm: 10.2.3
  ✅ GraphicsMagick: 1.3.42

════════════════════════════════════════════════════════════════
PHASE 4: TESTING
════════════════════════════════════════════════════════════════

[API test...]
  POST /api/extract:
    ✅ Extracted 21/21 metrics
    ✅ Accounting checks passed

✅ DEVELOPMENT COMPLETE
Test Pass Rate: 100%
```

### ❌ Anti-Pattern: Asking for Optional Params

**WRONG:**
```
The PRD doesn't specify the PDF library. Should I use pdf2pic or pdf-parse?
```

**CORRECT:**
```
[Using defaults: pdf2pic (with pdf-parse fallback)]
```

### ❌ Anti-Pattern: Fix Loop Without Verification

**WRONG:**
```
[Fix 1] Changed A.js
[Fix 2] Changed B.js
[Fix 3] Changed C.js
...
(No verification between fixes)
```

**CORRECT:**
```
[Fix 1]
  - Applied fix to A.js
  - Verification: 75% pass
  - Checkpoint saved

[Fix 2]
  - Applied fix to B.js
  - Verification: 60% pass (REGRESSION)
  - ⚠️ Rolling back to checkpoint 1
  - Trying alternative...
```

---

## Decision Tree

```
START
  │
  ▼
┌─────────────────────────┐
│ Validate ALWAYS-required │
│ params (prd,arch,dir,ver)│
└─────────────────────────┘
  │         │
  │ INVALID │ VALID
  ▼         ▼
ERROR    ┌─────────────────────────┐
         │ mode == "full-test"?     │
         └─────────────────────────┘
           │         │
           │ NO      │ YES
           ▼         ▼
      Use defaults  Validate api_keys
      (build-only)  Validate test_pdf
                    Check GraphicsMagick
                           │
                           ▼
                    ┌─────────────────┐
                    │ Valid?           │
                    └─────────────────┘
                      │         │
                      │ NO      │ YES
                      ▼         ▼
                   ERROR    Continue
                            │
                            ▼
                    ┌─────────────────┐
                    │ PHASE 1-3: Dev  │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ PHASE 4: Test   │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ Issues?         │◄────┐
                    └─────────────────┘     │
                      │         │           │
                      │ NO      │ YES       │
                      ▼         ▼           │
                   NEXT    ┌───────────┐    │
                   PHASE   │ Fix Loop  │    │
                           │ +Verify   │    │
                           └───────────┘    │
                                 │          │
                           ┌─────┴─────┐    │
                           │ Improved? │    │
                           └───────────┘    │
                           │    │           │
                           │NO  │YES        │
                           ▼    ▼           │
                       ROLLBACK Continue     │
                           │                │
                           └────────────────┘
```

---

## File Output Structure

```
{output_dir}/
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── store/useStore.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── adapters/
│   │   ├── prompts/
│   │   ├── middleware/
│   │   └── app.js
│   ├── uploads/
│   ├── package.json
│   └── .env.example
├── vercel.json
└── DEV_REPORT.md
```

---

*Version 1.4 - Added Pre-flight Checklist with mandatory input validation, prompt templates for missing parameters, input accumulation strategy*

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-20 | Initial version with build-only and full-test modes |
| 1.1 | 2026-03-20 | Added dual execution mode, API key masking, system dependency check, file severity classification, rollback support |
| 1.2 | 2026-03-20 | Resolved parameter strategy conflicts, clarified dependencies, core file failure stops immediately |
| 1.3 | 2026-03-21 | Added layered testing (L0-L6), security tests, performance tests, API assertions, test datasets, unified retry strategy |
| 1.4 | 2026-03-21 | Added Pre-flight Checklist for mandatory inputs (version, API keys, test PDFs) with prompt templates and input accumulation |
| 1.5 | 2026-03-21 | Flexible input rules: 1 API key = single model test, 2+ keys = multi-model validation; 1 PDF = single file test, multiple PDFs = all tested |
| 1.6 | 2026-03-21 | Added default test PDF configuration, API key usage rules with 1/2/3+ key modes, test data resolution flow |
| **1.7** | **2026-03-21** | **🆕 重大优化: 添加 L7 人工测试检查点 + L8 人工验收阶段；新增问题优先级分类 (P0-P3)；优化修复循环为分层策略 (总预算 13 次)；添加根因分析机制；更新 DEV_REPORT.md 格式** |
| **1.8** | **2026-03-21** | **🆕 优化 L7 测试流程: 区分自动化测试(AI执行)和逐步人工测试(Human执行)；自动化测试优先执行；人工测试一步一确认** |
| **2.0** | **2026-03-25** | **🆕 重大升级: 新增数据契约验证、参数传递链检查、AI响应大小限制、文档自动同步、置信度系统规范；新增人工测试阶段方案确认流程；新增用户确认后自动化版本管理与开发流程** |

---

## 🔧 V2.0 新增功能模块

---

## Data Contract Validation (数据契约验证)

### 前后端数据结构一致性检查

在 L3 集成测试阶段，自动执行以下检查：

#### 1. API Response Schema Validation

```javascript
// 自动生成的契约检查脚本
const validateContract = (response, expectedSchema) => {
  const errors = []

  Object.entries(expectedSchema).forEach(([field, config]) => {
    const value = response[field]

    // 检查必需字段
    if (config.required && value === undefined) {
      errors.push(`Missing required field: ${field}`)
    }

    // 检查类型
    if (value !== undefined && typeof value !== config.type) {
      errors.push(`Type mismatch for ${field}: expected ${config.type}, got ${typeof value}`)
    }
  })

  return { valid: errors.length === 0, errors }
}
```

#### 2. 共享类型定义

```
frontend/src/
└── types/
    └── api.d.ts        # TypeScript 类型定义（前后端共用）

backend/src/
└── types/
    └── api.d.ts        # 符号链接到前端类型文件
```

#### 3. 关键数据契约检查点

| API 端点 | 关键字段 | 类型要求 |
|---------|---------|---------|
| `/api/extract` | `confidence` | `number` (1-5) |
| `/api/extract` | `financialMetrics` | `Array<{name, value, unit}>` |
| `/api/extract` | `companyInfo` | `{name, stockCode, reportDate}` |
| `/api/extract` | `auditLog` | `Array<{model, timestamp, tokens}>` |

---

## Parameter Passing Chain Check (参数传递链检查)

### 函数调用链参数完整性验证

#### 1. Required Parameter Tracing

```javascript
// 在开发阶段，自动追踪参数传递
const traceParams = (fn, requiredParams) => {
  return function(...args) {
    const missingParams = requiredParams.filter(
      (param, index) => args[index] === undefined
    )
    if (missingParams.length > 0) {
      console.warn(`⚠️ Missing params in ${fn.name}: ${missingParams.join(', ')}`)
    }
    return fn.apply(this, args)
  }
}
```

#### 2. Service Dependency Matrix

| 调用者 | 被调用者 | 必需参数 |
|--------|---------|---------|
| ExtractionService.extract() | adapter.extract() | file, apiKey, options |
| ExtractionService.extract() | adapter.validate() | resultA, resultB, **aiLogService** |
| ExtractionService.extract() | ValidationService.validate() | extractionResult, **aiLogService** |

#### 3. 参数传递检查清单

```
□ aiLogService 是否传递到所有需要日志记录的函数？
□ apiKey 是否在整个调用链中安全传递？
□ options 配置是否正确传递到所有子函数？
□ 回调函数是否正确绑定 this 上下文？
```

---

## AI Response Size Limits (AI响应大小限制)

### 响应大小控制策略

#### 1. Prompt Optimization Rules

```
✅ DO: 使用简化的结构化输出格式
✅ DO: 只返回决策结果，不返回完整数据
✅ DO: 使用字段引用而非字段复制

❌ DON'T: 在响应中重复输入数据
❌ DON'T: 返回完整的提取结果
❌ DON'T: 包含冗余的解释文本
```

#### 2. Response Size Monitoring

| 响应大小 | 处理方式 |
|---------|---------|
| < 2000 字符 | ✅ 正常 |
| 2000-4000 字符 | ⚠️ 警告，考虑优化 |
| 4000-8000 字符 | 🔶 需要优化 prompt |
| > 8000 字符 | 🚨 强制优化，可能导致截断 |

#### 3. 简化输出格式示例

```json
// ❌ 避免：返回完整数据 (~8500 字符)
{
  "finalResult": {
    "companyInfo": { ... },
    "financialMetrics": [ ... 24项 ... ],
    "nonFinancialInfo": { ... }
  },
  "confidence": 5
}

// ✅ 推荐：只返回决策 (~600 字符)
{
  "confidence": 5,
  "decisions": [
    { "field": "营业收入", "choose": "A", "reason": "数值更精确" },
    { "field": "净利润", "choose": "B", "reason": "包含完整上下文" }
  ],
  "companyInfoDecision": { "choose": "A" },
  "notes": "两者整体一致，A的财务指标更完整"
}
```

---

## Documentation Auto-Sync (文档自动同步)

### 版本更新时的文档同步规则

#### 1. 必须更新的文档清单

| 文档 | 更新内容 | 触发条件 |
|------|---------|---------|
| PRD.md | 版本历史 + 功能变更 | 功能变更 |
| ARCHITECTURE.md | 版本历史 + 技术变更 | 技术变更 |
| 项目开发日志.md | 版本历程 + 开发记录 | 任何变更 |
| README.md | 版本号 + 功能列表 | 功能变更 |

#### 2. 版本号自动递增规则

```
当前版本: V1.14
新版本:   V1.15  (小修复/优化)
          V1.20  (功能增强)
          V2.0   (重大更新)

自动递增逻辑:
- Bug修复/小优化: patch +1 (V1.14 → V1.15)
- 新功能/增强:    minor +1 (V1.14 → V1.20)
- 架构变更/重大更新: major +1 (V1.14 → V2.0)
```

#### 3. 文档同步提示模板

```
📋 版本 V{version} 开发完成，以下文档需要更新：

┌─────────────────────────────────────────────────────┐
│  文档状态检查                                        │
├─────────────────────────────────────────────────────┤
│  [ ] PRD.md: 添加版本历史条目                        │
│  [ ] ARCHITECTURE.md: 更新技术变更                   │
│  [ ] 项目开发日志.md: 记录开发过程                   │
│  [ ] README.md: 更新版本号                           │
└─────────────────────────────────────────────────────┘

正在自动更新文档...
```

---

## Confidence System Specification (置信度系统规范)

### 五档置信度系统规范

#### 1. 数据结构定义

```typescript
type ConfidenceLevel = 1 | 2 | 3 | 4 | 5

interface ConfidenceInfo {
  score: ConfidenceLevel
  label: string
  color: string
  icon: string
  description: string
}
```

#### 2. 置信度配置常量

```javascript
const CONFIDENCE_CONFIG = {
  5: {
    label: '高置信度',
    color: 'success',
    icon: 'CheckCircleOutlined',
    description: '三模型一致 + 勾稽通过 + 无警告',
    criteria: 'tri_model_match AND accounting_pass AND no_warnings'
  },
  4: {
    label: '中高置信度',
    color: 'processing',
    icon: 'CheckCircleOutlined',
    description: '双模型一致 + 勾稽通过',
    criteria: 'dual_model_match AND accounting_pass'
  },
  3: {
    label: '中置信度',
    color: 'warning',
    icon: 'WarningOutlined',
    description: '模型有差异但可裁决',
    criteria: 'model_diff_resolvable OR accounting_warnings'
  },
  2: {
    label: '中低置信度',
    color: 'orange',
    icon: 'WarningOutlined',
    description: '模型差异较大 或 勾稽未通过',
    criteria: 'large_model_diff OR accounting_fail'
  },
  1: {
    label: '低置信度',
    color: 'error',
    icon: 'CloseCircleOutlined',
    description: '检测到模拟数据 或 解析失败',
    criteria: 'mock_data_detected OR parse_failed'
  }
}
```

#### 3. 向后兼容处理

```javascript
const normalizeConfidence = (confidence) => {
  // 数字类型直接使用
  if (typeof confidence === 'number') {
    return Math.max(1, Math.min(5, Math.round(confidence)))
  }

  // 字符串类型转换
  const stringMap = {
    'high': 5,
    'medium-high': 4,
    'medium': 3,
    'medium-low': 2,
    'low': 1
  }

  return stringMap[confidence] || 3
}
```

---

## L8 Automation Enhancement (L8测试自动化增强)

### L8 人工验收测试优化

#### 1. 可自动化预检 (新增 L7.5)

| 检查项 | 自动化方式 | 通过条件 |
|--------|-----------|---------|
| API 响应格式 | Schema 验证 | 所有必需字段存在且类型正确 |
| 前端渲染无报错 | Console 错误检测 | 0 个 error 级别日志 |
| 关键字段非空 | 断言检查 | confidence, financialMetrics 非空 |
| 导出功能可用 | 文件生成检查 | Excel 文件成功生成且非空 |
| 数据契约一致性 | 前后端类型比对 | 类型定义完全匹配 |

#### 2. 必须人工验证项

| 检查项 | 原因 | 验证方式 |
|--------|------|---------|
| 数据准确性 | 需要领域知识判断 | 与源 PDF 对比 |
| UI/UX 体验 | 主观评估 | 用户操作反馈 |
| 错误提示友好度 | 主观评估 | 模拟错误场景 |
| 置信度合理性 | 需要理解业务逻辑 | 分析具体案例 |

---

## 🎯 Human Testing Phase Solution Proposal (人工测试阶段方案确认流程)

### 核心原则

```
╔══════════════════════════════════════════════════════════════╗
║              用户提出问题/需求时的标准流程                    ║
╠══════════════════════════════════════════════════════════════╣
║  1. 分析需求，理解问题本质                                    ║
║  2. 给出完整解决方案                                          ║
║  3. 绘制 ASCII 原型图（包含所有影响部分）                     ║
║  4. 检查是否影响非相关模块                                    ║
║  5. 等待用户确认后再执行                                      ║
╚══════════════════════════════════════════════════════════════╝
```

### 方案输出模板

```markdown
## 需求分析

**原始需求**: [用户描述]
**理解**: [需求本质分析]
**影响范围**: [列出所有受影响的模块/文件]

---

## 解决方案

### 方案概述
[简述解决方案的核心思路]

### 技术方案
[详细的技术实现方案]

---

## ASCII 原型图

### 1. UI 变化
[绘制 UI 变化前后对比]

### 2. 数据流变化
[绘制数据流图]

### 3. 架构变化
[绘制架构变化图（如有）]

---

## 影响分析

### 受影响的文件
| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|---------|
| path/to/file | 新增/修改/删除 | 具体变更 |

### 不受影响的模块
[列出确认不受影响的模块，证明方案的隔离性]

---

## 风险评估
[潜在风险及应对措施]

---

## 请确认
是否按照此方案实施？[确认/修改/取消]
```

### ASCII 原型图绘制规范

#### 1. UI 原型图

```
┌─────────────────────────────────────────────────────────────┐
│                      变更前                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  置信度: 高                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

                            ↓ 变更

┌─────────────────────────────────────────────────────────────┐
│                      变更后                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  置信度: 🟢 高置信度 (5分)                           │   │
│  │  原因: 三模型一致，勾稽核对通过                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2. 数据流图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   前端组件   │ ──► │   API层      │ ──► │   服务层     │
│              │     │              │     │              │
│ onChange()   │     │ /api/extract │     │ Extraction   │
│              │     │              │     │ Service      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                    ┌────────────────────────────┘
                    ▼
           ┌──────────────┐     ┌──────────────┐
           │   适配器层   │ ──► │   AI模型     │
           │              │     │              │
           │ DoubaoAdapter│     │ Model A/B/C  │
           └──────────────┘     └──────────────┘
```

#### 3. 架构变化图

```
                     变更前
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  模块A      │ │  模块B      │ │  模块C      │
└─────────────┘ └─────────────┘ └─────────────┘

                     变更后
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  模块A      │ │  模块B      │ │  模块C      │
│  (修改)     │ │  (不变)     │ │  (新增)     │
│  +新功能    │ │             │ │  新服务     │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 影响范围检查清单

```
□ 是否影响现有 API 接口？
  └─ [ ] 是 → 需要更新 API 文档
  └─ [ ] 否 → 确认不影响

□ 是否影响数据库/数据结构？
  └─ [ ] 是 → 需要数据迁移方案
  └─ [ ] 否 → 确认不影响

□ 是否影响其他页面/组件？
  └─ [ ] 是 → 列出所有受影响组件
  └─ [ ] 否 → 确认隔离性

□ 是否影响现有配置？
  └─ [ ] 是 → 需要配置迁移指南
  └─ [ ] 否 → 确认不影响

□ 是否影响测试用例？
  └─ [ ] 是 → 需要更新测试用例
  └─ [ ] 否 → 确认不影响
```

---

## 🚀 Automated Version Management (用户确认后自动化流程)

### 核心流程

```
用户确认方案
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: 版本号自动设定                                      │
│  ─────────────────────                                      │
│  读取当前版本 → 根据变更类型递增 → 设定新版本号              │
│  例: V1.14 + 功能增强 → V1.15                               │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: 二次验证                                            │
│  ─────────────────                                           │
│  □ 方案能否完整实现需求？                                    │
│  □ 是否影响非相关模块？                                      │
│  □ 是否有遗漏的边界情况？                                    │
│                                                              │
│  如果有问题 → 重新制定方案 → 与用户同步                      │
│  如果没问题 → 继续                                           │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: 更新 PRD.md                                         │
│  ────────────────────                                        │
│  在文档顶部新版本更新区域:                                    │
│  • 产品需求更新描述                                          │
│  • ASCII 原型图                                              │
│  • 技术架构和要点更新                                        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: 创建 TodoList                                       │
│  ─────────────────────                                       │
│  将代码实现切分为合理的任务列表:                              │
│  1. [后端] xxx                                               │
│  2. [前端] xxx                                               │
│  3. [测试] xxx                                               │
│  4. [文档] xxx                                               │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: 按顺序执行                                          │
│  ─────────────────                                           │
│  严格按 TodoList 顺序执行，每个任务完成后标记                 │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: 整体检查 (UltraThink)                               │
│  ────────────────────────────────                            │
│  • 功能完整性检查                                            │
│  • 回归测试（确保不影响其他模块）                            │
│  • 文档同步检查                                              │
│  • 代码质量检查                                              │
└─────────────────────────────────────────────────────────────┘
```

### 版本号递增规则

```javascript
const determineNewVersion = (currentVersion, changeType) => {
  const [major, minor, patch] = currentVersion.replace('V', '').split('.').map(Number)

  switch (changeType) {
    case 'bugfix':      // Bug修复
      return `V${major}.${minor}.${patch + 1}`
    case 'enhancement': // 功能增强/优化
      return `V${major}.${minor + 1}`
    case 'feature':     // 新功能
      return `V${major}.${minor + 1}`
    case 'breaking':    // 重大变更/架构调整
      return `V${major + 1}.0`
    default:
      return `V${major}.${minor}.${patch + 1}`
  }
}

// 示例:
// V1.14 + bugfix      → V1.15
// V1.14 + enhancement → V1.15
// V1.14 + feature     → V1.15
// V1.14 + breaking    → V2.0
```

### PRD.md 更新模板

```markdown
## V{version} ({date})

### 📝 更新概述
{简述本次更新的核心内容}

### 🎯 功能变更
| 功能 | 变更类型 | 描述 |
|------|---------|------|
| xxx | 新增/修改/删除 | xxx |

### 📐 原型图
```
[ASCII 原型图]
```

### 🔧 技术要点
- {技术实现要点1}
- {技术实现要点2}

### 📋 影响范围
- 前端: {受影响的组件/页面}
- 后端: {受影响的API/服务}
- 数据: {数据结构变更}
```

### TodoList 模板

```markdown
## V{version} 开发任务

### 后端任务
- [ ] BE-01: {任务描述}
- [ ] BE-02: {任务描述}

### 前端任务
- [ ] FE-01: {任务描述}
- [ ] FE-02: {任务描述}

### 测试任务
- [ ] TEST-01: {任务描述}

### 文档任务
- [ ] DOC-01: 更新 PRD.md
- [ ] DOC-02: 更新 ARCHITECTURE.md
- [ ] DOC-03: 更新 项目开发日志.md
```

### 整体检查清单 (UltraThink)

```
╔══════════════════════════════════════════════════════════════╗
║                    开发完成检查清单                          ║
╠══════════════════════════════════════════════════════════════╣

□ 功能完整性
  └─ [ ] 所有需求都已实现
  └─ [ ] 边界情况已处理
  └─ [ ] 错误处理已覆盖

□ 回归测试
  └─ [ ] 现有功能未受影响
  └─ [ ] 其他模块正常运行
  └─ [ ] API 接口兼容

□ 代码质量
  └─ [ ] 无 console.log 残留
  └─ [ ] 无 TODO/FIXME 残留
  └─ [ ] 代码风格一致

□ 文档同步
  └─ [ ] PRD.md 已更新
  └─ [ ] ARCHITECTURE.md 已更新
  └─ [ ] 项目开发日志.md 已更新
  └─ [ ] README.md 已更新

□ 测试通过
  └─ [ ] L0-L6 自动化测试通过
  └─ [ ] L8 人工验收测试通过

╚══════════════════════════════════════════════════════════════╝
```
