# 快照: 税金计算器网站404修复
> 时间: 2026-04-13 10:15
> Phase: 全部完成 (0-7)

## 问题
1. **(致命) 网站返回404** — index.html被移到子目录，Vercel找不到
2. **(严重) 中文路径编码错误** — Vercel cleanUrls将UTF-8中文重定向为GBK编码

## 解决方案
- 将 `tax-calculators` 仓库重构为只含网站文件，index.html在根目录
- 移除 vercel.json 中的 cleanUrls/trailingSlash/builds/routes

## 变更文件
- `D:\ai\tax-calculators-deploy\vercel.json`: 移除导致中文编码问题的配置项
- `D:\ai\tax-calculators-deploy\` 整个目录: 从 税金计算器/ 复制到根级别

## 关键命令
```bash
# 创建部署目录
mkdir -p D:/ai/tax-calculators-deploy
# 复制文件（去掉子目录包装）
cp -r D:/ai/ai编程/财税小工具/税金计算器/* D:/ai/tax-calculators-deploy/
# Force push
cd D:/ai/tax-calculators-deploy && git init && git push --force origin main
# 第二次 push（修复中文编码）
git commit --amend vercel.json && git push
```

## 验证结果
- 首页: https://shuiwu.tianjiwantong.com.cn/ → 200 OK
- 增值税: 200 OK
- 个人所得税: 200 OK
- 企业所得税: 200 OK
- 附加税费: 200 OK
- report站点: 200 OK（未受影响）

## GitHub 仓库
- `imhyb1105/tax-calculators` — 已清理，仅含网站文件
- `imhyb1105/financial_report_extractor` — 未触碰

## 待恢复信息
如中断，从此处继续: 仓库已push完成，网站已恢复。可清理临时目录 D:\ai\tax-calculators-deploy\
