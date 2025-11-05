-- Update Schema to Support Question Bank Features
-- Execute this in Supabase SQL Editor after initial schema

-- Add new columns to practice_questions table for question bank support
ALTER TABLE practice_questions 
ADD COLUMN IF NOT EXISTS topic_number INTEGER,
ADD COLUMN IF NOT EXISTS topic_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS sub_topic VARCHAR(200),
ADD COLUMN IF NOT EXISTS question_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'ai_generated' CHECK (source IN ('ai_generated', 'question_bank'));

-- Add related_keywords column to statistical_concepts if not exists
ALTER TABLE statistical_concepts 
ADD COLUMN IF NOT EXISTS related_keywords TEXT[];

-- Create index for faster topic-based queries
CREATE INDEX IF NOT EXISTS idx_practice_questions_topic ON practice_questions(topic_number);
CREATE INDEX IF NOT EXISTS idx_practice_questions_source ON practice_questions(source);
CREATE INDEX IF NOT EXISTS idx_practice_questions_sub_topic ON practice_questions(sub_topic);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_practice_questions_topic_difficulty 
ON practice_questions(topic_number, difficulty_level);

-- Create a view for question bank statistics
CREATE OR REPLACE VIEW question_bank_stats AS
SELECT 
    topic_number,
    topic_name,
    COUNT(*) as total_questions,
    COUNT(CASE WHEN difficulty_level = 1 THEN 1 END) as basic_count,
    COUNT(CASE WHEN difficulty_level = 2 THEN 1 END) as medium_count,
    COUNT(CASE WHEN difficulty_level = 3 THEN 1 END) as advanced_count,
    COUNT(CASE WHEN question_type = 'multiple_choice' THEN 1 END) as mc_count,
    COUNT(CASE WHEN question_type = 'calculation' THEN 1 END) as calc_count,
    COUNT(CASE WHEN question_type = 'interpretation' THEN 1 END) as interp_count,
    COUNT(CASE WHEN source = 'question_bank' THEN 1 END) as bank_questions,
    COUNT(CASE WHEN source = 'ai_generated' THEN 1 END) as ai_questions
FROM practice_questions
WHERE topic_number IS NOT NULL
GROUP BY topic_number, topic_name
ORDER BY topic_number;

-- Grant permissions for the view
GRANT SELECT ON question_bank_stats TO anon, authenticated;

-- Create a function to get questions by topic with filters
CREATE OR REPLACE FUNCTION get_questions_by_topic(
    p_topic_number INTEGER DEFAULT NULL,
    p_difficulty_level INTEGER DEFAULT NULL,
    p_question_type VARCHAR DEFAULT NULL,
    p_source VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    question_id UUID,
    concept_name VARCHAR,
    question_text TEXT,
    question_type VARCHAR,
    options JSONB,
    difficulty_level INTEGER,
    topic_number INTEGER,
    topic_name VARCHAR,
    sub_topic VARCHAR,
    question_number VARCHAR,
    source VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.question_id,
        pq.concept_name,
        pq.question_text,
        pq.question_type,
        pq.options,
        pq.difficulty_level,
        pq.topic_number,
        pq.topic_name,
        pq.sub_topic,
        pq.question_number,
        pq.source,
        pq.created_at
    FROM practice_questions pq
    WHERE 
        (p_topic_number IS NULL OR pq.topic_number = p_topic_number)
        AND (p_difficulty_level IS NULL OR pq.difficulty_level = p_difficulty_level)
        AND (p_question_type IS NULL OR pq.question_type = p_question_type)
        AND (p_source IS NULL OR pq.source = p_source)
    ORDER BY 
        CASE WHEN pq.source = 'question_bank' THEN 0 ELSE 1 END,
        pq.topic_number,
        pq.question_number,
        pq.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_questions_by_topic TO anon, authenticated;

-- Create function to get topic overview
CREATE OR REPLACE FUNCTION get_topic_overview()
RETURNS TABLE (
    topic_number INTEGER,
    topic_name VARCHAR,
    concept_name VARCHAR,
    total_questions BIGINT,
    difficulty_breakdown JSONB,
    type_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.topic_number,
        pq.topic_name,
        pq.concept_name,
        COUNT(*) as total_questions,
        jsonb_build_object(
            'basic', COUNT(CASE WHEN pq.difficulty_level = 1 THEN 1 END),
            'medium', COUNT(CASE WHEN pq.difficulty_level = 2 THEN 1 END),
            'advanced', COUNT(CASE WHEN pq.difficulty_level = 3 THEN 1 END)
        ) as difficulty_breakdown,
        jsonb_build_object(
            'multiple_choice', COUNT(CASE WHEN pq.question_type = 'multiple_choice' THEN 1 END),
            'calculation', COUNT(CASE WHEN pq.question_type = 'calculation' THEN 1 END),
            'interpretation', COUNT(CASE WHEN pq.question_type = 'interpretation' THEN 1 END),
            'case_study', COUNT(CASE WHEN pq.question_type = 'case_study' THEN 1 END)
        ) as type_breakdown
    FROM practice_questions pq
    WHERE pq.topic_number IS NOT NULL
    GROUP BY pq.topic_number, pq.topic_name, pq.concept_name
    ORDER BY pq.topic_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_topic_overview TO anon, authenticated;

-- Add comment for documentation
COMMENT ON COLUMN practice_questions.topic_number IS 'Topic number (1-10) from the course structure';
COMMENT ON COLUMN practice_questions.topic_name IS 'Full topic name (e.g., "One Sample T-Test")';
COMMENT ON COLUMN practice_questions.sub_topic IS 'Sub-topic within the main topic';
COMMENT ON COLUMN practice_questions.question_number IS 'Original question number from the question bank';
COMMENT ON COLUMN practice_questions.source IS 'Source of the question: ai_generated or question_bank';

-- Create a function to get random questions for practice
CREATE OR REPLACE FUNCTION get_random_practice_questions(
    p_topic_number INTEGER DEFAULT NULL,
    p_difficulty_level INTEGER DEFAULT NULL,
    p_count INTEGER DEFAULT 10
)
RETURNS SETOF practice_questions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM practice_questions
    WHERE 
        (p_topic_number IS NULL OR topic_number = p_topic_number)
        AND (p_difficulty_level IS NULL OR difficulty_level = p_difficulty_level)
    ORDER BY RANDOM()
    LIMIT p_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_random_practice_questions TO anon, authenticated;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Question bank schema update completed successfully!'; 
END $$;

