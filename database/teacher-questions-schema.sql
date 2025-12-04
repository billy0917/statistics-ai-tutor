-- 老師出題表結構
-- 在 Supabase SQL Editor 中執行此腳本

-- 老師出的題目表
CREATE TABLE teacher_questions (
    question_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    concept_name VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) DEFAULT 'open_ended', -- 'multiple_choice', 'open_ended', 'calculation'
    options JSONB, -- 選擇題選項 {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer TEXT, -- 正確答案（選擇題）或參考答案（開放式）
    explanation TEXT, -- 解釋說明
    difficulty_level INTEGER DEFAULT 1, -- 1: Basic, 2: Medium, 3: Advanced
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引
CREATE INDEX idx_teacher_questions_concept ON teacher_questions(concept_name);
CREATE INDEX idx_teacher_questions_active ON teacher_questions(is_active);
CREATE INDEX idx_teacher_questions_difficulty ON teacher_questions(difficulty_level);

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_teacher_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_questions_updated_at
    BEFORE UPDATE ON teacher_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_questions_updated_at();
