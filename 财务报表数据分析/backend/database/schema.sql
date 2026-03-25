-- V2.0 数据库表结构
-- 创建日期: 2026-03-25
-- 数据库类型: SQLite

-- ============================================
-- 用户反馈表
-- ============================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_no VARCHAR(20) UNIQUE NOT NULL,   -- 反馈编号: FB-2026032501
  type VARCHAR(20) NOT NULL,                  -- 类型: bug/suggestion/consultation/other
  title VARCHAR(200) NOT NULL,                -- 标题
  content TEXT NOT NULL,                      -- 详细内容
  contact VARCHAR(100),                       -- 联系方式(选填)
  status VARCHAR(20) DEFAULT 'pending',       -- 状态: pending/replied/resolved/closed
  admin_reply TEXT,                           -- 管理员回复
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 反馈表索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);

-- ============================================
-- 使用统计表
-- ============================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id VARCHAR(50),                     -- 匿名会话ID
  extraction_mode VARCHAR(20),                -- 提取模式: single/dual/tri
  total_duration INTEGER,                     -- 总耗时(毫秒)
  total_tokens INTEGER,                       -- 总Token数
  model_a_tokens INTEGER,                     -- 模型A Token数
  model_b_tokens INTEGER,                     -- 模型B Token数
  model_c_tokens INTEGER,                     -- 模型C Token数
  confidence_score INTEGER,                   -- 置信度分数 1-5
  success INTEGER DEFAULT 1,                  -- 是否成功: 0/1
  error_message TEXT,                         -- 错误信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 使用统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_session_id ON usage_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_extraction_mode ON usage_stats(extraction_mode);

-- ============================================
-- 每日统计汇总表 (用于快速查询)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_date DATE UNIQUE NOT NULL,             -- 统计日期
  total_extractions INTEGER DEFAULT 0,        -- 总提取次数
  successful_extractions INTEGER DEFAULT 0,   -- 成功次数
  failed_extractions INTEGER DEFAULT 0,       -- 失败次数
  total_tokens INTEGER DEFAULT 0,             -- 总Token消耗
  avg_duration INTEGER DEFAULT 0,             -- 平均耗时(毫秒)
  avg_confidence REAL DEFAULT 0,              -- 平均置信度
  single_mode_count INTEGER DEFAULT 0,        -- 单模型次数
  dual_mode_count INTEGER DEFAULT 0,          -- 双模型次数
  tri_mode_count INTEGER DEFAULT 0,           -- 三模型次数
  feedbacks_count INTEGER DEFAULT 0,          -- 当日反馈数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 每日统计表索引
CREATE INDEX IF NOT EXISTS idx_daily_stats_stat_date ON daily_stats(stat_date);

-- ============================================
-- 管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,       -- 用户名
  password_hash VARCHAR(200) NOT NULL,        -- 密码哈希(bcrypt)
  last_login DATETIME,                        -- 最后登录时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 初始数据
-- ============================================

-- 插入默认管理员 (密码: admin123, 需要在应用启动时用bcrypt加密)
-- INSERT INTO admins (username, password_hash) VALUES ('admin', '$2b$10$...');

-- 插入今日统计记录(如果不存在)
-- INSERT OR IGNORE INTO daily_stats (stat_date) VALUES (date('now', 'localtime'));
