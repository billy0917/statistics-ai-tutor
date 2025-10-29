const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/supabase');
const axios = require('axios');
const router = express.Router();

// FastGPT API 配置
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;
const FASTGPT_API_BASE_URL = process.env.FASTGPT_API_BASE_URL;

// 統計概念定義（與 chat.js 保持一致）
const STATISTICAL_CONCEPTS = [
    '描述統計',
    '標準差',
    '單樣本t檢定',
    '獨立樣本t檢定',
    '配對樣本t檢定',
    '相關分析',
    '簡單迴歸',
    '卡方檢定'
];

// 概念名稱映射（英文 -> 中文）
const CONCEPT_NAME_MAP = {
    // 英文名稱映射
    'descriptive statistics': '描述統計',
    'standard deviation': '標準差',
    'one sample t test': '單樣本t檢定',
    'one-sample t test': '單樣本t檢定',
    'independent t test': '獨立樣本t檢定',
    'independent samples t test': '獨立樣本t檢定',
    'paired t test': '配對樣本t檢定',
    'paired samples t test': '配對樣本t檢定',
    'correlation': '相關分析',
    'correlation analysis': '相關分析',
    'simple regression': '簡單迴歸',
    'regression': '簡單迴歸',
    'chi square': '卡方檢定',
    'chi-square': '卡方檢定',
    'chi square test': '卡方檢定',
    // 確保中文也能正確映射（標準化）
    '描述统计': '描述統計',
    '标准差': '標準差',
    '单样本t检定': '單樣本t檢定',
    '独立样本t检定': '獨立樣本t檢定',
    '配对样本t检定': '配對樣本t檢定',
    '相关分析': '相關分析',
    '简单回归': '簡單迴歸',
    '卡方检定': '卡方檢定'
};

// 標準化概念名稱
function normalizeConceptName(conceptName) {
    if (!conceptName) return null;
    
    const normalized = conceptName.toLowerCase().trim();
    
    // 如果在映射表中找到，返回標準中文名稱
    if (CONCEPT_NAME_MAP[normalized]) {
        return CONCEPT_NAME_MAP[normalized];
    }
    
    // 如果是標準中文名稱之一，直接返回
    if (STATISTICAL_CONCEPTS.includes(conceptName)) {
        return conceptName;
    }
    
    // 否則返回原始名稱（可能會失敗，但至少記錄了）
    console.warn('⚠️ 未知的概念名稱:', conceptName);
    return conceptName;
}

// 難度級別定義
const DIFFICULTY_LEVELS = {
    basic: 1,
    medium: 2,
    advanced: 3
};

// 題型定義
const QUESTION_TYPES = {
    multiple_choice: 'MC',
    case_study: 'Case Study',
    calculation: 'Calculation',
    interpretation: 'Interpretation'
};

/**
 * 使用 FastGPT 生成練習題
 * @param {string} concept - 統計概念
 * @param {string} difficulty - 難度等級 (basic/medium/advanced)
 * @param {string} questionType - 題型
 * @returns {Object} 生成的題目
 */
async function generateQuestionWithFastGPT(concept, difficulty, questionType) {
    try {
        // 構建生成題目的提示詞 (English version for English-speaking users)
        const prompt = `You are a statistics question generator. Based on your knowledge base, generate a ${getDifficultyName(difficulty)} difficulty ${getQuestionTypeName(questionType)} question for the concept "${concept}".

**IMPORTANT: Return ONLY JSON format, no other text or explanation.**

JSON format example:
\`\`\`json
{
    "question_text": "Question content (must include psychology context)",
    "question_type": "${questionType}",
    "options": ${questionType === 'multiple_choice' ? '["Option A", "Option B", "Option C", "Option D"]' : 'null'},
    "correct_answer": "${questionType === 'multiple_choice' ? 'A' : 'Correct answer (for multiple choice, use ONLY the letter: A, B, C, or D)'}",
    "explanation": "Detailed explanation of why this is the correct answer",
    "difficulty_level": ${DIFFICULTY_LEVELS[difficulty]},
    "concept_name": "${concept}"
}
\`\`\`

${questionType === 'multiple_choice' ? '**CRITICAL: For multiple choice questions, "correct_answer" must be ONLY a single letter (A, B, C, or D), NOT the full option text.**' : ''}

Difficulty description: ${getDifficultyDescription(difficulty)}

**Generate the question now, return ONLY JSON, no other content.**`;

        const response = await axios.post(`${FASTGPT_API_BASE_URL}/v1/chat/completions`, {
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FASTGPT_API_KEY}`
            }
        });

        const data = response.data;
        
        // 檢查回應結構
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('FastGPT 回應格式錯誤:', JSON.stringify(data, null, 2));
            throw new Error('FastGPT 回應格式錯誤');
        }
        
        const aiResponse = data.choices[0].message.content;
        console.log('🤖 AI 回應內容:', aiResponse);
        
        // 確保 aiResponse 是字符串
        if (typeof aiResponse !== 'string') {
            console.error('AI 回應不是字符串:', typeof aiResponse, aiResponse);
            throw new Error('AI 回應格式錯誤：不是字符串');
        }
        
        // 解析 JSON 回應
        let questionData;
        try {
            // 先嘗試直接解析
            try {
                questionData = JSON.parse(aiResponse);
                console.log('✅ 直接解析成功');
            } catch (directParseError) {
                // 嘗試提取 JSON（可能包含在 markdown 代碼塊中）
                console.log('⚠️ 直接解析失敗，嘗試提取 JSON...');
                
                // 方法1: 提取 ```json ... ``` 代碼塊
                let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
                
                // 方法2: 提取 ``` ... ``` 代碼塊（無 json 標記）
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
                }
                
                // 方法3: 提取第一個完整的 JSON 對象
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                }
                
                if (jsonMatch) {
                    const jsonStr = jsonMatch[1] || jsonMatch[0];
                    console.log('📝 提取的 JSON 字符串:', jsonStr);
                    questionData = JSON.parse(jsonStr);
                    console.log('✅ 提取解析成功');
                } else {
                    throw new Error('無法找到 JSON 格式的內容');
                }
            }
            
            // 驗證必要欄位
            if (!questionData.question_text || !questionData.correct_answer) {
                console.error('❌ JSON 缺少必要欄位:', questionData);
                throw new Error('題目缺少必要欄位');
            }
            
            // 清理 correct_answer：提取選項字母（處理 AI 可能返回 "D) Standard Deviation" 的情況）
            if (questionData.question_type === 'multiple_choice') {
                const originalAnswer = questionData.correct_answer;
                const answerMatch = questionData.correct_answer.toString().trim().match(/^([A-D])/i);
                if (answerMatch) {
                    questionData.correct_answer = answerMatch[1].toUpperCase();
                    console.log(`📌 清理答案格式: "${originalAnswer}" → "${questionData.correct_answer}"`);
                }
            }
            
            console.log('✅ 題目解析成功:', questionData);
            
        } catch (parseError) {
            console.error('❌ 解析錯誤:', parseError.message);
            console.error('📄 AI 原始回應:', aiResponse);
            throw new Error(`AI 回應格式不正確: ${parseError.message}`);
        }

        return questionData;

    } catch (error) {
        console.error('生成題目失敗:', error);
        throw error;
    }
}

/**
 * 獲取難度名稱
 */
function getDifficultyName(difficulty) {
    const names = {
        basic: 'Basic',
        medium: 'Intermediate',
        advanced: 'Advanced'
    };
    return names[difficulty] || 'Basic';
}

/**
 * 獲取題型名稱
 */
function getQuestionTypeName(questionType) {
    const names = {
        multiple_choice: 'Multiple Choice',
        case_study: 'Case Study',
        calculation: 'Calculation',
        interpretation: 'Interpretation'
    };
    return names[questionType] || 'Multiple Choice';
}

/**
 * 獲取難度描述
 */
function getDifficultyDescription(difficulty) {
    const descriptions = {
        basic: 'Basic concept understanding, suitable for beginners',
        medium: 'Concept application and analysis, requires some understanding',
        advanced: 'In-depth analysis and critical thinking, requires mastery of knowledge'
    };
    return descriptions[difficulty] || descriptions.basic;
}

// ============ API 路由 ============

/**
 * POST /api/practice/generate
 * 生成新的練習題
 */
router.post('/generate', async (req, res) => {
    try {
        const { 
            concept, 
            difficulty = 'basic', 
            questionType = 'multiple_choice',
            userId = null,
            saveToDatabase = true
        } = req.body;

        // 驗證輸入
        if (!concept || !STATISTICAL_CONCEPTS.includes(concept)) {
            return res.status(400).json({
                success: false,
                error: '請提供有效的統計概念',
                availableConcepts: STATISTICAL_CONCEPTS
            });
        }

        if (!['basic', 'medium', 'advanced'].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                error: '難度級別必須是 basic, medium 或 advanced'
            });
        }

        // 使用 FastGPT 生成題目
        const questionData = await generateQuestionWithFastGPT(concept, difficulty, questionType);

        // 標準化概念名稱（處理 AI 可能返回英文的情況）
        const normalizedConceptName = normalizeConceptName(questionData.concept_name) || concept;
        console.log(`📌 概念名稱標準化: "${questionData.concept_name}" -> "${normalizedConceptName}"`);
        
        // 保存到資料庫
        let savedQuestion = null;
        if (saveToDatabase) {
            const dbData = {
                concept_name: normalizedConceptName,  // 使用標準化的中文名稱
                question_text: questionData.question_text,
                question_type: questionData.question_type,
                options: questionData.options ? JSON.stringify(questionData.options) : null,
                correct_answer: questionData.correct_answer,
                explanation: questionData.explanation,
                difficulty_level: questionData.difficulty_level
            };

            const result = await db.client
                .from('practice_questions')
                .insert([dbData])
                .select()
                .single();

            if (result.error) {
                console.error('❌ 保存題目失敗:', result.error);
            } else {
                console.log('✅ 題目已保存到資料庫');
                savedQuestion = result.data;
            }
        }

        res.json({
            success: true,
            question: savedQuestion || questionData,
            generated: true,
            message: '題目生成成功'
        });

    } catch (error) {
        console.error('生成練習題失敗:', error);
        res.status(500).json({
            success: false,
            error: '生成練習題失敗',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/practice/questions
 * 獲取練習題列表（從資料庫）
 */
router.get('/questions', async (req, res) => {
    try {
        const { 
            concept, 
            difficulty, 
            questionType,
            limit = 10 
        } = req.query;

        let query = db.client
            .from('practice_questions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (concept) {
            query = query.eq('concept_name', concept);
        }
        if (difficulty) {
            query = query.eq('difficulty_level', DIFFICULTY_LEVELS[difficulty]);
        }
        if (questionType) {
            query = query.eq('question_type', questionType);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            questions: data,
            count: data.length
        });

    } catch (error) {
        console.error('獲取練習題失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取練習題失敗'
        });
    }
});

/**
 * GET /api/practice/question/:questionId
 * 獲取單個題目詳情
 */
router.get('/question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;

        const { data, error } = await db.client
            .from('practice_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }

        res.json({
            success: true,
            question: data
        });

    } catch (error) {
        console.error('獲取題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目失敗'
        });
    }
});

/**
 * POST /api/practice/submit
 * 提交答案並批改
 */
router.post('/submit', async (req, res) => {
    try {
        const {
            questionId,
            userId,
            sessionId,
            userAnswer,
            timeTaken = 0
        } = req.body;

        if (!questionId || !userAnswer) {
            return res.status(400).json({
                success: false,
                error: '缺少必要參數'
            });
        }

        // 獲取題目
        const { data: question, error: questionError } = await db.client
            .from('practice_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();

        if (questionError || !question) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }

        // 判斷答案是否正確
        const isCorrect = checkAnswer(userAnswer, question.correct_answer, question.question_type);

        // 保存答題記錄
        const answerData = {
            user_id: userId || null,
            question_id: questionId,
            session_id: sessionId || null,
            user_answer: userAnswer,
            is_correct: isCorrect,
            time_taken: timeTaken
        };

        const { data: answerRecord, error: saveError } = await db.client
            .from('user_answers')
            .insert([answerData])
            .select()
            .single();

        if (saveError) {
            console.error('保存答題記錄失敗:', saveError);
        }

        // 更新學習進度
        if (userId && question.concept_name) {
            await updateLearningProgress(userId, question.concept_name, isCorrect);
        }

        res.json({
            success: true,
            isCorrect,
            correctAnswer: question.correct_answer,
            explanation: question.explanation,
            answerRecord: answerRecord,
            feedback: generateFeedback(isCorrect, question.difficulty_level)
        });

    } catch (error) {
        console.error('提交答案失敗:', error);
        res.status(500).json({
            success: false,
            error: '提交答案失敗'
        });
    }
});

/**
 * GET /api/practice/concepts
 * 獲取所有可用的統計概念
 */
router.get('/concepts', (req, res) => {
    res.json({
        success: true,
        concepts: STATISTICAL_CONCEPTS
    });
});

/**
 * GET /api/practice/user-progress/:userId
 * 獲取用戶練習進度
 */
router.get('/user-progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 獲取答題統計
        const { data: answers, error } = await db.client
            .from('user_answers')
            .select('*, practice_questions(concept_name, difficulty_level)')
            .eq('user_id', userId)
            .order('answered_at', { ascending: false });

        if (error) throw error;

        // 統計分析
        const stats = calculateUserStats(answers);

        res.json({
            success: true,
            stats,
            recentAnswers: answers.slice(0, 20)
        });

    } catch (error) {
        console.error('獲取用戶進度失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶進度失敗'
        });
    }
});

// ============ 輔助函數 ============

/**
 * 檢查答案是否正確
 */
function checkAnswer(userAnswer, correctAnswer, questionType) {
    const normalizedUser = userAnswer.toString().trim().toLowerCase();
    const normalizedCorrect = correctAnswer.toString().trim().toLowerCase();
    
    if (questionType === 'multiple_choice') {
        return normalizedUser === normalizedCorrect;
    } else if (questionType === 'calculation') {
        // 數值計算題，允許小誤差
        const userNum = parseFloat(normalizedUser);
        const correctNum = parseFloat(normalizedCorrect);
        if (!isNaN(userNum) && !isNaN(correctNum)) {
            return Math.abs(userNum - correctNum) < 0.01;
        }
        return normalizedUser === normalizedCorrect;
    } else {
        // 其他題型，檢查關鍵字包含
        return normalizedUser.includes(normalizedCorrect) || 
               normalizedCorrect.includes(normalizedUser);
    }
}

/**
 * 生成反饋訊息 (English version)
 */
function generateFeedback(isCorrect, difficultyLevel) {
    if (isCorrect) {
        const positiveFeedback = [
            'Excellent! Your answer is completely correct!',
            'Very good! You have a great understanding!',
            'Correct! Keep it up!',
            'Outstanding! You understand this very well!'
        ];
        return positiveFeedback[Math.floor(Math.random() * positiveFeedback.length)];
    } else {
        const encouragingFeedback = {
            1: 'That\'s okay, this is part of learning. Review the explanation and try again!',
            2: 'Keep practicing. After understanding the explanation, you\'ll master it better!',
            3: 'This question is indeed challenging. Think it through a few more times, and you\'ll get it!'
        };
        return encouragingFeedback[difficultyLevel] || encouragingFeedback[1];
    }
}

/**
 * 更新學習進度
 */
async function updateLearningProgress(userId, conceptName, isCorrect) {
    try {
        // 標準化概念名稱
        const normalizedConceptName = normalizeConceptName(conceptName) || conceptName;
        
        // 獲取當前進度
        const { data: current } = await db.client
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('concept_name', normalizedConceptName)
            .single();

        let newMasteryLevel;
        let newPracticeCount;
        let newCorrectAnswers;

        if (current) {
            newPracticeCount = current.practice_count + 1;
            newCorrectAnswers = current.correct_answers + (isCorrect ? 1 : 0);
            
            // 計算新的掌握度（0.0 - 1.0）
            const correctRate = newCorrectAnswers / newPracticeCount;
            newMasteryLevel = Math.min(0.95, correctRate * 1.1); // 最高 0.95
        } else {
            newPracticeCount = 1;
            newCorrectAnswers = isCorrect ? 1 : 0;
            newMasteryLevel = isCorrect ? 0.2 : 0.05;
        }

        // 更新或插入
        await db.client
            .from('learning_progress')
            .upsert({
                user_id: userId,
                concept_name: normalizedConceptName,  // 使用標準化的名稱
                mastery_level: newMasteryLevel,
                practice_count: newPracticeCount,
                correct_answers: newCorrectAnswers,
                last_practiced: new Date().toISOString()
            });

    } catch (error) {
        console.error('更新學習進度失敗:', error);
    }
}

/**
 * 計算用戶統計數據
 */
function calculateUserStats(answers) {
    if (!answers || answers.length === 0) {
        return {
            totalQuestions: 0,
            correctCount: 0,
            accuracy: 0,
            averageTime: 0,
            conceptStats: {}
        };
    }

    const totalQuestions = answers.length;
    const correctCount = answers.filter(a => a.is_correct).length;
    const accuracy = (correctCount / totalQuestions * 100).toFixed(1);
    const averageTime = answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / totalQuestions;

    // 按概念統計
    const conceptStats = {};
    answers.forEach(answer => {
        const concept = answer.practice_questions?.concept_name;
        if (concept) {
            if (!conceptStats[concept]) {
                conceptStats[concept] = {
                    total: 0,
                    correct: 0,
                    accuracy: 0
                };
            }
            conceptStats[concept].total++;
            if (answer.is_correct) {
                conceptStats[concept].correct++;
            }
        }
    });

    // 計算每個概念的正確率
    Object.keys(conceptStats).forEach(concept => {
        const stats = conceptStats[concept];
        stats.accuracy = (stats.correct / stats.total * 100).toFixed(1);
    });

    return {
        totalQuestions,
        correctCount,
        accuracy: parseFloat(accuracy),
        averageTime: Math.round(averageTime),
        conceptStats
    };
}

module.exports = router;


