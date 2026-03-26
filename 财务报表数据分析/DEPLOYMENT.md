# 部署指南

## 智能财务报表数据提取工具 V2.5 部署文档

---

## 目录

1. [环境要求](#环境要求)
2. [本地开发部署](#本地开发部署)
3. [Docker部署](#docker部署)
4. [云服务器部署](#云服务器部署)
5. [Vercel + Railway部署](#vercel--railway部署)
6. [环境变量配置](#环境变量配置)
7. [安全配置](#安全配置)
8. [监控与日志](#监控与日志)
9. [常见问题](#常见问题)

---

## 环境要求

### 最低要求

| 组件 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| 内存 | >= 512MB |
| 磁盘 | >= 1GB |

### 推荐配置

| 组件 | 版本要求 |
|------|----------|
| Node.js | 18.x LTS 或 20.x LTS |
| 内存 | >= 1GB |
| 磁盘 | >= 5GB |

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/financial-report-extractor.git
cd financial-report-extractor
```

### 2. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp ../.env.example ../.env

# 编辑配置文件
# 至少配置以下项：
# - JWT_SECRET（JWT密钥）
# - ADMIN_PASSWORD（管理员密码）
# - 使用的AI模型API密钥
```

### 4. 启动服务

```bash
# 终端1 - 启动后端
cd backend
npm run dev

# 终端2 - 启动前端
cd frontend
npm run dev
```

### 5. 访问应用

- 前端: http://localhost:5173
- 后端API: http://localhost:3000
- 健康检查: http://localhost:3000/api/health

---

## Docker部署

### 1. 构建镜像

```bash
# 在项目根目录执行
docker-compose build
```

### 2. 启动服务

```bash
# 前台启动
docker-compose up

# 后台启动
docker-compose up -d
```

### 3. 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 只查看后端日志
docker-compose logs -f backend

# 只查看前端日志
docker-compose logs -f frontend
```

### 4. 停止服务

```bash
docker-compose down

# 同时删除数据卷
docker-compose down -v
```

### 5. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

---

## 云服务器部署

### 前置条件

- 一台云服务器（阿里云/腾讯云/AWS等）
- 已安装 Docker 和 Docker Compose
- 已配置域名和SSL证书（推荐）

### 部署步骤

#### 1. 连接服务器

```bash
ssh user@your-server-ip
```

#### 2. 创建应用目录

```bash
mkdir -p /opt/financial-report
cd /opt/financial-report
```

#### 3. 上传代码

```bash
# 方式1: Git克隆
git clone https://github.com/your-repo/financial-report-extractor.git .

# 方式2: SCP上传
scp -r ./financial-report-extractor/* user@your-server-ip:/opt/financial-report/
```

#### 4. 配置环境变量

```bash
cp .env.example .env
nano .env

# 必须修改：
# JWT_SECRET=your-random-secret-string
# ADMIN_PASSWORD=your-secure-password
# 配置AI模型API密钥
```

#### 5. 启动服务

```bash
docker-compose up -d
```

#### 6. 配置Nginx反向代理（可选）

```nginx
# /etc/nginx/sites-available/financial-report
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 7. 配置SSL证书（推荐使用Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

---

## Vercel + Railway部署

### 架构说明

- **Vercel**: 部署前端静态文件
- **Railway**: 部署后端API服务

### 1. 部署后端到Railway

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up

# 添加环境变量
railway variables set JWT_SECRET=your-secret
railway variables set ADMIN_PASSWORD=your-password
# ... 其他环境变量
```

### 2. 部署前端到Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd frontend
vercel

# 设置环境变量
vercel env add VITE_API_BASE_URL
# 输入Railway后端URL，如: https://your-app.railway.app/api
```

### 3. 配置vercel.json

项目根目录已有 `vercel.json`，确保配置正确：

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.railway.app/api/$1" }
  ]
}
```

---

## 环境变量配置

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT签名密钥 | `random-string-32chars` |
| `ADMIN_PASSWORD` | 管理员密码 | `SecurePass123!` |

### AI模型配置（至少配置一个）

| 变量名 | 说明 |
|--------|------|
| `DOUBAO_API_KEY` | 豆包模型API密钥 |
| `ZHIPU_API_KEY` | 智谱AI API密钥 |
| `QWEN_API_KEY` | 通义千问 API密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 |
| `OPENAI_API_KEY` | OpenAI API密钥 |
| `ANTHROPIC_API_KEY` | Claude API密钥 |

### 可选变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | development | 运行环境 |
| `PORT` | 3000 | 后端端口 |
| `LOG_LEVEL` | info | 日志级别 |
| `MAX_FILE_SIZE` | 50 | 最大文件大小(MB) |
| `RATE_LIMIT_MAX` | 100 | 速率限制 |

---

## 安全配置

### 1. JWT密钥

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 管理员密码

- 最少8个字符
- 包含大小写字母、数字、特殊字符
- 不要使用常见密码

### 3. HTTPS

生产环境必须启用HTTPS：
- 使用云服务商的SSL证书
- 或使用Let's Encrypt免费证书

### 4. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

---

## 监控与日志

### 查看日志

```bash
# Docker日志
docker-compose logs -f backend

# 审计日志
tail -f backend/logs/audit.log
```

### 健康检查

```bash
# API健康检查
curl http://localhost:3000/api/health

# 预期响应
{
  "status": "ok",
  "version": "2.5.0",
  "timestamp": "2026-03-26T..."
}
```

### 监控指标

- CPU使用率 < 70%
- 内存使用率 < 80%
- 响应时间 < 5秒
- 错误率 < 1%

---

## 常见问题

### Q1: 后端启动失败

检查：
1. Node.js版本是否>=18
2. 依赖是否正确安装
3. 环境变量是否配置

### Q2: AI模型调用失败

检查：
1. API密钥是否正确
2. 网络是否可访问AI服务
3. 账户余额是否充足

### Q3: PDF上传失败

检查：
1. 文件大小是否超过限制
2. 文件格式是否为PDF
3. 磁盘空间是否充足

### Q4: 跨域错误

确保后端CORS配置正确：
```javascript
app.use(cors({
  origin: ['https://your-domain.com'],
  credentials: true
}))
```

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| V2.5.0 | 2026-03-26 | 新增Docker部署、审计日志、环境变量管理 |
| V2.3.0 | 2026-03-25 | 新增PDF自动抓取功能 |
| V2.0.0 | 2026-03-24 | 数据库架构升级、统计功能 |

---

*文档最后更新: 2026-03-26*
