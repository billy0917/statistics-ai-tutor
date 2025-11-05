/**
 * Question Bank Routes
 * API endpoints for accessing topic-based question bank
 */

const express = require('express');
const { db } = require('../config/supabase');
const router = express.Router();

/**
 * GET /api/question-bank/topics
 * Get all available topics with statistics
 */
router.get('/topics', async (req, res) => {
    try {
        const { data, error } = await db.client
            .rpc('get_topic_overview');
        
        if (error) throw error;
        
        // Group by topic number
        const topicMap = {};
        data.forEach(item => {
            if (!topicMap[item.topic_number]) {
                topicMap[item.topic_number] = {
                    topic_number: item.topic_number,
                    topic_name: item.topic_name,
                    concepts: [],
                    total_questions: 0,
                    difficulty_breakdown: { basic: 0, medium: 0, advanced: 0 },
                    type_breakdown: { multiple_choice: 0, calculation: 0, interpretation: 0, case_study: 0 }
                };
            }
            
            topicMap[item.topic_number].concepts.push(item.concept_name);
            topicMap[item.topic_number].total_questions += parseInt(item.total_questions);
            
            // Aggregate difficulty counts
            const diff = item.difficulty_breakdown;
            topicMap[item.topic_number].difficulty_breakdown.basic += parseInt(diff.basic || 0);
            topicMap[item.topic_number].difficulty_breakdown.medium += parseInt(diff.medium || 0);
            topicMap[item.topic_number].difficulty_breakdown.advanced += parseInt(diff.advanced || 0);
            
            // Aggregate type counts
            const type = item.type_breakdown;
            topicMap[item.topic_number].type_breakdown.multiple_choice += parseInt(type.multiple_choice || 0);
            topicMap[item.topic_number].type_breakdown.calculation += parseInt(type.calculation || 0);
            topicMap[item.topic_number].type_breakdown.interpretation += parseInt(type.interpretation || 0);
            topicMap[item.topic_number].type_breakdown.case_study += parseInt(type.case_study || 0);
        });
        
        const topics = Object.values(topicMap).sort((a, b) => a.topic_number - b.topic_number);
        
        res.json({
            success: true,
            topics,
            total_topics: topics.length
        });
        
    } catch (error) {
        console.error('Get topics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve topics'
        });
    }
});

/**
 * GET /api/question-bank/topic/:topicNumber
 * Get all questions for a specific topic
 */
router.get('/topic/:topicNumber', async (req, res) => {
    try {
        const { topicNumber } = req.params;
        const { 
            difficulty, 
            questionType, 
            source = 'question_bank',
            limit = 50,
            offset = 0,
            random = false
        } = req.query;
        
        const topicNum = parseInt(topicNumber);
        
        if (isNaN(topicNum) || topicNum < 1 || topicNum > 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid topic number. Must be between 1 and 10.'
            });
        }
        
        let query = db.client
            .from('practice_questions')
            .select('*')
            .eq('topic_number', topicNum);
        
        if (source) {
            query = query.eq('source', source);
        }
        
        if (difficulty) {
            const diffLevel = parseInt(difficulty);
            if (!isNaN(diffLevel)) {
                query = query.eq('difficulty_level', diffLevel);
            }
        }
        
        if (questionType) {
            query = query.eq('question_type', questionType);
        }
        
        if (random === 'true') {
            // Random selection is handled differently
            const { data: allQuestions, error } = await query;
            
            if (error) throw error;
            
            // Shuffle and limit
            const shuffled = allQuestions.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, parseInt(limit));
            
            return res.json({
                success: true,
                questions: selected,
                count: selected.length,
                topic_number: topicNum
            });
        } else {
            query = query
                .order('question_number', { ascending: true })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            questions: data,
            count: data.length,
            topic_number: topicNum
        });
        
    } catch (error) {
        console.error('Get topic questions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve questions'
        });
    }
});

/**
 * GET /api/question-bank/question/:questionId
 * Get a single question by ID
 */
router.get('/question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        const { include_answer = 'false' } = req.query;
        
        const { data, error } = await db.client
            .from('practice_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }
        
        // Optionally hide answer and explanation
        if (include_answer !== 'true') {
            delete data.correct_answer;
            delete data.explanation;
        }
        
        res.json({
            success: true,
            question: data
        });
        
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve question'
        });
    }
});

/**
 * GET /api/question-bank/practice-set
 * Generate a practice set with mixed questions
 */
router.get('/practice-set', async (req, res) => {
    try {
        const {
            topics, // comma-separated topic numbers
            difficulty,
            count = 10,
            mix = 'true' // mix questions from different topics
        } = req.query;
        
        let query = db.client
            .from('practice_questions')
            .select('*')
            .eq('source', 'question_bank');
        
        // Filter by topics if specified
        if (topics) {
            const topicNumbers = topics.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            if (topicNumbers.length > 0) {
                query = query.in('topic_number', topicNumbers);
            }
        }
        
        // Filter by difficulty if specified
        if (difficulty) {
            const diffLevel = parseInt(difficulty);
            if (!isNaN(diffLevel)) {
                query = query.eq('difficulty_level', diffLevel);
            }
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.json({
                success: true,
                questions: [],
                count: 0,
                message: 'No questions found matching the criteria'
            });
        }
        
        // Randomly select questions
        const shuffled = data.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, parseInt(count));
        
        // Remove answers and explanations from the response
        const questionsForPractice = selected.map(q => ({
            question_id: q.question_id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            difficulty_level: q.difficulty_level,
            topic_number: q.topic_number,
            topic_name: q.topic_name,
            sub_topic: q.sub_topic
        }));
        
        res.json({
            success: true,
            questions: questionsForPractice,
            count: questionsForPractice.length,
            metadata: {
                total_available: data.length,
                requested_count: parseInt(count),
                topics: topics || 'all',
                difficulty: difficulty || 'all'
            }
        });
        
    } catch (error) {
        console.error('Generate practice set error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate practice set'
        });
    }
});

/**
 * GET /api/question-bank/stats
 * Get overall question bank statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Get overall stats from the view
        const { data: viewData, error: viewError } = await db.client
            .from('question_bank_stats')
            .select('*');
        
        if (viewError) throw viewError;
        
        // Calculate totals
        const totals = {
            total_questions: 0,
            total_topics: viewData.length,
            by_difficulty: { basic: 0, medium: 0, advanced: 0 },
            by_type: { mc: 0, calculation: 0, interpretation: 0 },
            by_source: { question_bank: 0, ai_generated: 0 }
        };
        
        viewData.forEach(row => {
            totals.total_questions += parseInt(row.total_questions);
            totals.by_difficulty.basic += parseInt(row.basic_count);
            totals.by_difficulty.medium += parseInt(row.medium_count);
            totals.by_difficulty.advanced += parseInt(row.advanced_count);
            totals.by_type.mc += parseInt(row.mc_count);
            totals.by_type.calculation += parseInt(row.calc_count);
            totals.by_type.interpretation += parseInt(row.interp_count);
            totals.by_source.question_bank += parseInt(row.bank_questions);
            totals.by_source.ai_generated += parseInt(row.ai_questions);
        });
        
        res.json({
            success: true,
            stats: totals,
            topics: viewData
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

/**
 * POST /api/question-bank/validate-answer
 * Validate a user's answer (without saving to database)
 */
router.post('/validate-answer', async (req, res) => {
    try {
        const { questionId, userAnswer } = req.body;
        
        if (!questionId || userAnswer === undefined) {
            return res.status(400).json({
                success: false,
                error: 'questionId and userAnswer are required'
            });
        }
        
        // Get the question with correct answer
        const { data: question, error } = await db.client
            .from('practice_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();
        
        if (error || !question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }
        
        // Validate answer
        const isCorrect = checkAnswer(userAnswer, question.correct_answer, question.question_type);
        
        res.json({
            success: true,
            is_correct: isCorrect,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
            question_type: question.question_type
        });
        
    } catch (error) {
        console.error('Validate answer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate answer'
        });
    }
});

/**
 * Helper function to check if answer is correct
 */
function checkAnswer(userAnswer, correctAnswer, questionType) {
    const normalizedUser = userAnswer.toString().trim().toLowerCase();
    const normalizedCorrect = correctAnswer.toString().trim().toLowerCase();
    
    if (questionType === 'multiple_choice') {
        return normalizedUser === normalizedCorrect;
    } else if (questionType === 'calculation') {
        // Allow small numerical differences
        const userNum = parseFloat(normalizedUser);
        const correctNum = parseFloat(normalizedCorrect);
        if (!isNaN(userNum) && !isNaN(correctNum)) {
            return Math.abs(userNum - correctNum) < 0.01;
        }
        return normalizedUser === normalizedCorrect;
    } else {
        // For interpretation/case study, check if key concepts are present
        return normalizedUser.includes(normalizedCorrect) || 
               normalizedCorrect.includes(normalizedUser);
    }
}

module.exports = router;

