-- 統計學 AI 教學助理數據庫結構
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 用戶表
CREATE TABLE users (
    user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    learning_level INTEGER DEFAULT 1, -- 1:初學者, 2:中級, 3:高級
    total_sessions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0
);

-- 2. 對話會話表
CREATE TABLE chat_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    topic VARCHAR(100), -- 統計學主題 (如: t-test, correlation, etc.)
    difficulty_level INTEGER DEFAULT 1,
    message_count INTEGER DEFAULT 0,
    session_summary TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. 訊息記錄表
CREATE TABLE messages (
    message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    concept_tags TEXT[], -- 統計概念標籤陣列
    message_type VARCHAR(20) DEFAULT 'text', -- text, formula, code, etc.
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5)
);

-- 4. 學習進度表
CREATE TABLE learning_progress (
    progress_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    concept_name VARCHAR(100) NOT NULL, -- 統計概念名稱
    mastery_level DECIMAL(3,2) DEFAULT 0.0, -- 0.0 到 1.0 的掌握程度
    practice_count INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    last_practiced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, concept_name)
);

-- 5. 常見問題分析表
CREATE TABLE common_issues (
    issue_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_area VARCHAR(100) NOT NULL,
    error_pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    suggested_improvement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 統計概念定義表
CREATE TABLE statistical_concepts (
    concept_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50), -- basic_stats, hypothesis_testing, correlation, etc.
    difficulty_level INTEGER DEFAULT 1,
    description TEXT,
    formula TEXT,
    example_usage TEXT,
    prerequisites TEXT[], -- 前置概念陣列
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 練習題庫表
CREATE TABLE practice_questions (
    question_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_name VARCHAR(100) REFERENCES statistical_concepts(concept_name),
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice', -- multiple_choice, calculation, interpretation
    options JSONB, -- 選擇題選項
    correct_answer TEXT,
    explanation TEXT,
    difficulty_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 用戶答題記錄表
CREATE TABLE user_answers (
    answer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    question_id UUID REFERENCES practice_questions(question_id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    time_taken INTEGER, -- 秒數
    hints_used INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引以提升查詢性能
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);

-- 插入基本統計概念數據
INSERT INTO statistical_concepts (concept_name, category, difficulty_level, description) VALUES
('描述統計', 'basic_stats', 1, '用於描述和總結數據特徵的統計方法'),
('標準差', 'basic_stats', 1, '衡量數據分散程度的統計量'),
('平均數', 'basic_stats', 1, '數據的中心趨勢測量'),
('中位數', 'basic_stats', 1, '將數據分為兩半的中間值'),
('單樣本t檢定', 'hypothesis_testing', 2, '檢驗單一樣本平均數是否等於特定值'),
('獨立樣本t檢定', 'hypothesis_testing', 2, '比較兩個獨立群體平均數的差異'),
('配對樣本t檢定', 'hypothesis_testing', 2, '比較同一群體在兩個時間點的差異'),
('相關分析', 'correlation', 2, '測量兩個變數之間線性關係的強度'),
('簡單迴歸', 'regression', 3, '用一個變數預測另一個變數的統計方法'),
('卡方檢定', 'hypothesis_testing', 2, '檢驗類別變數之間是否獨立');

-- 插入範例練習題
INSERT INTO practice_questions (concept_name, question_text, question_type, options, correct_answer, explanation, difficulty_level) VALUES
('標準差', '標準差的主要用途是什麼？', 'multiple_choice', 
 '{"A": "測量中心趨勢", "B": "測量數據分散程度", "C": "測量數據的偏態", "D": "測量數據的峰態"}',
 'B', '標準差是衡量數據點相對於平均數分散程度的統計量，數值越大表示數據越分散。', 1),

('單樣本t檢定', '進行單樣本t檢定的前提假設包括哪些？', 'multiple_choice',
 '{"A": "數據呈常態分佈", "B": "觀察值相互獨立", "C": "數據為連續變數", "D": "以上皆是"}',
 'D', '單樣本t檢定需要滿足常態分佈、獨立性和連續變數等假設條件。', 2);

-- 啟用 Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策（用戶只能訪問自己的數據）
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM chat_sessions WHERE session_id = messages.session_id)
);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM chat_sessions WHERE session_id = messages.session_id)
);

CREATE POLICY "Users can view own progress" ON learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON learning_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own answers" ON user_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON user_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 公開表格（所有用戶都可以讀取）
CREATE POLICY "Anyone can view concepts" ON statistical_concepts FOR SELECT USING (true);
CREATE POLICY "Anyone can view questions" ON practice_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can view common issues" ON common_issues FOR SELECT USING (true);

