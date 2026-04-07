-- V2.7 PostgreSQL 数据库表结构 (Supabase)
-- 创建日期: 2026-04-07
-- 数据库类型: PostgreSQL (Supabase)

-- ============================================
-- 启用 UUID 扩展
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用户反馈表
-- ============================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  feedback_no VARCHAR(20) UNIQUE NOT NULL,   -- 反馈编号: FB-2026032501
  type VARCHAR(20) NOT NULL,                  -- 类型: bug/suggestion/consultation/other
  title VARCHAR(200) NOT NULL,                -- 标题
  content TEXT NOT NULL,                      -- 详细内容
  contact VARCHAR(100),                       -- 联系方式(选填)
  status VARCHAR(20) DEFAULT 'pending',       -- 状态: pending/replied/resolved/closed
  admin_reply TEXT,                           -- 管理员回复
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 反馈表索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);

-- ============================================
-- 使用统计表
-- ============================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(50),                     -- 匿名会话ID
  extraction_mode VARCHAR(20),                -- 提取模式: single/dual/tri
  total_duration INTEGER,                     -- 总耗时(毫秒)
  total_tokens INTEGER,                       -- 总Token数
  model_a_tokens INTEGER DEFAULT 0,           -- 模型A Token数
  model_b_tokens INTEGER DEFAULT 0,           -- 模型B Token数
  model_c_tokens INTEGER DEFAULT 0,           -- 模型C Token数
  confidence_score INTEGER,                   -- 置信度分数 1-5
  success INTEGER DEFAULT 1,                  -- 是否成功: 0/1
  error_message TEXT,                         -- 错误信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 使用统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_session_id ON usage_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_extraction_mode ON usage_stats(extraction_mode);

-- ============================================
-- 每日统计汇总表 (用于快速查询)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 每日统计表索引
CREATE INDEX IF NOT EXISTS idx_daily_stats_stat_date ON daily_stats(stat_date);

-- ============================================
-- 管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,       -- 用户名
  password_hash VARCHAR(200) NOT NULL,        -- 密码哈希(bcrypt)
  last_login TIMESTAMP WITH TIME ZONE,        -- 最后登录时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 审计日志表 (替代文件存储)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(10) NOT NULL,                 -- INFO/WARN/ERROR/AUDIT
  event VARCHAR(50) NOT NULL,                 -- 事件类型
  user_id VARCHAR(50) DEFAULT 'anonymous',    -- 用户ID
  ip VARCHAR(50),                             -- IP地址
  user_agent TEXT,                            -- User Agent
  details JSONB,                              -- 详细信息
  message TEXT                                -- 消息
);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);

-- ============================================
-- 触发器: 自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要更新的表创建触发器
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_stats_updated_at ON daily_stats;
CREATE TRIGGER update_daily_stats_updated_at
    BEFORE UPDATE ON daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始数据
-- ============================================

-- 插入默认管理员 (密码: admin123, 需要在应用启动时用bcrypt加密)
-- INSERT INTO admins (username, password_hash) VALUES ('admin', '$2b$10$...');

-- 插入今日统计记录(如果不存在)
-- INSERT INTO daily_stats (stat_date) VALUES (CURRENT_DATE)
-- ON CONFLICT (stat_date) DO NOTHING;

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 允许服务端完全访问（使用 service_role key）
-- 这些策略允许使用 service_role key 的请求完全访问所有表
CREATE POLICY "Service role full access on feedbacks" ON feedbacks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on usage_stats" ON usage_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on daily_stats" ON daily_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on admins" ON admins
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on audit_logs" ON audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 允许匿名用户插入使用统计（用于前端直接调用）
CREATE POLICY "Allow anonymous insert on usage_stats" ON usage_stats
  FOR INSERT TO anon WITH CHECK (true);

-- 允许匿名用户插入反馈（用于前端直接调用）
CREATE POLICY "Allow anonymous insert on feedbacks" ON feedbacks
  FOR INSERT TO anon WITH CHECK (true);
