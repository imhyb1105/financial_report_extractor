# Supabase 部署指南

## 智能财务报表数据提取工具 V2.7 - Supabase 部署文档

---

## 目录

1. [概述](#概述)
2. [Supabase 配置](#supabase-配置)
3. [Vercel 部署](#vercel-部署)
4. [域名配置](#域名配置)
5. [验证部署](#验证部署)
6. [常见问题](#常见问题)

---

## 概述

### 架构图

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   Vercel        │──────│   Supabase      │      │   AI 模型       │
│   (前端托管)    │ API  │   (数据库+存储)  │──────│   (外部API)     │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
      │                        │
      ▼                        ▼
  用户浏览器              PostgreSQL 数据库
```

### 优势

- ✅ 前端全球 CDN 加速
- ✅ PostgreSQL 数据库（比 SQLite 更强大）
- ✅ 内置文件存储
- ✅ 自动备份和高可用
- ✅ 免费额度足够小型应用使用

---

## Supabase 配置

### Step 1: 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `financial-report-extractor`
   - **Database Password**: 设置一个强密码（保存好）
   - **Region**: 选择离用户最近的区域（如 Singapore）
4. 点击 "Create new project"，等待项目创建完成（约 2 分钟）

### Step 2: 获取 API 密钥

1. 进入项目后，点击左侧 "Settings" → "API"
2. 记录以下信息：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: 用于客户端（公开）
   - **service_role key**: 用于服务端（保密⚠️）

### Step 3: 执行数据库 Schema

1. 点击左侧 "SQL Editor"
2. 点击 "New query"
3. 复制 `backend/database/schema.supabase.sql` 的内容
4. 点击 "Run" 执行

或者使用 Supabase CLI:

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 关联项目
supabase link --project-ref your-project-ref

# 执行 migration
supabase db push
```

### Step 4: 配置存储桶

1. 点击左侧 "Storage"
2. 应该已自动创建 `pdf-files` 存储桶（通过 schema.sql）
3. 如果没有，手动创建：
   - 点击 "New bucket"
   - 名称: `pdf-files`
   - 取消勾选 "Public bucket"（私有存储）
   - 文件大小限制: 50 MB

---

## Vercel 部署

### Step 1: 推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init

# 添加远程仓库
git remote add origin https://github.com/your-username/financial-report-extractor.git

# 添加所有文件
git add .

# 提交
git commit -m "feat: V2.7 Supabase 支持"

# 推送
git push -u origin main
```

### Step 2: 在 Vercel 创建项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择 GitHub 仓库 `financial-report-extractor`
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`

### Step 3: 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_PROVIDER` | `supabase` | 使用 Supabase |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | anon public key |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` | service_role key ⚠️ |
| `JWT_SECRET` | `random-string-32chars` | JWT 签名密钥 |
| `ADMIN_PASSWORD` | `your-secure-password` | 管理员密码 |

### Step 4: 部署

1. 点击 "Deploy"
2. 等待构建完成（约 2-3 分钟）
3. 记录分配的域名：`https://your-project.vercel.app`

---

## 域名配置

### Step 1: 在阿里云添加域名解析

1. 登录阿里云控制台
2. 进入 "域名" → 选择域名 → "解析设置"
3. 添加记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| CNAME | @ | `cname.vercel-dns.com` | 600 |
| CNAME | www | `cname.vercel-dns.com` | 600 |
| CNAME | api | `cname.vercel-dns.com` | 600 |

### Step 2: 在 Vercel 添加自定义域名

1. 进入 Vercel 项目 → "Settings" → "Domains"
2. 添加域名：
   - `yourdomain.com`
   - `www.yourdomain.com`
   - `api.yourdomain.com`（如果需要单独的 API 域名）
3. 等待 DNS 验证（可能需要几分钟到几小时）

### Step 3: 启用 HTTPS

Vercel 自动为自定义域名配置 Let's Encrypt SSL 证书，无需额外操作。

---

## 验证部署

### 1. 检查前端

```bash
curl https://yourdomain.com
# 应返回 HTML 内容
```

### 2. 检查 API

```bash
curl https://yourdomain.com/api/health
# 应返回: {"status":"ok","version":"2.7.0"}
```

### 3. 检查数据库连接

```bash
curl https://yourdomain.com/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# 应返回统计数据
```

### 4. 检查文件上传

在浏览器中：
1. 访问 https://yourdomain.com
2. 上传一个 PDF 文件
3. 验证文件是否成功存储到 Supabase Storage

---

## 常见问题

### Q1: Vercel 函数超时

**问题**: AI 模型调用超过 10 秒超时

**解决方案**:
1. 升级 Vercel Pro 计划（60秒超时）
2. 或使用流式响应
3. 或将后端部署到 Railway/Render（无超时限制）

### Q2: Supabase 连接失败

**问题**: `Failed to connect to Supabase`

**解决方案**:
1. 检查 `SUPABASE_URL` 格式是否正确
2. 检查 `SUPABASE_SERVICE_KEY` 是否有效
3. 检查 Supabase 项目是否暂停（免费额度用尽）

### Q3: 文件上传失败

**问题**: PDF 上传返回错误

**解决方案**:
1. 检查 `pdf-files` 存储桶是否存在
2. 检查存储桶大小限制
3. 检查 RLS 策略是否正确配置

### Q4: 跨域错误

**问题**: CORS policy error

**解决方案**:
确保后端 CORS 配置包含你的域名：
```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true
}))
```

### Q5: 环境变量未生效

**问题**: 配置了环境变量但未生效

**解决方案**:
1. Vercel 环境变量修改后需要重新部署
2. 检查变量名是否完全匹配（区分大小写）
3. 使用 `process.env.VARIABLE_NAME` 访问

---

## 成本估算

### Supabase 免费额度

| 资源 | 免费额度 | 超出后费用 |
|------|----------|-----------|
| 数据库 | 500 MB | $0.125/GB |
| 存储空间 | 1 GB | $0.021/GB |
| 数据传输 | 5 GB | $0.09/GB |
| 月活用户 | 50,000 | $0.00325/MAU |

### Vercel 免费额度

| 资源 | 免费额度 | 超出后费用 |
|------|----------|-----------|
| 带宽 | 100 GB | $40/TB |
| 函数调用 | 100 GB-Hrs | 按需计费 |
| 构建时间 | 6000 分钟 | $20/1000 分钟 |

### 预估月成本

对于小型应用（日活 < 100）：
- **免费**：完全在免费额度内
- **预计**：$0/月

对于中型应用（日活 100-1000）：
- **Supabase**: ~$0-10/月
- **Vercel**: $0-20/月
- **预计**：$0-30/月

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| V2.7.0 | 2026-04-07 | 新增 Supabase 支持 |

---

*文档最后更新: 2026-04-07*
