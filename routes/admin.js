const express = require('express');
const { db } = require('../config/supabase');
const router = express.Router();

// 中間件：驗證管理員權限
const requireAdmin = (req, res, next) => {
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== 'admin-admin123') {
        return res.status(403).json({
            success: false,
            error: '需要管理員權限'
        });
    }
    next();
};

// 獲取所有用戶列表及其基本統計
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { data: users, error: usersError } = await db.client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError) {
            throw usersError;
        }

        // 獲取每個用戶的統計數據
        const usersWithStats = await Promise.all(users.map(async (user) => {
            try {
                // 獲取學習進度
                const { data: progress } = await db.client
                    .from('learning_progress')
                    .select('*')
                    .eq('user_id', user.user_id);

                // 獲取練習記錄
                const { data: answers } = await db.client
                    .from('user_answers')
                    .select('is_correct, answered_at')
                    .eq('user_id', user.user_id)
                    .order('answered_at', { ascending: false })
                    .limit(100);

                // 獲取聊天會話
                const { data: sessions } = await db.client
                    .from('chat_sessions')
                    .select('session_id, start_time, message_count')
                    .eq('user_id', user.user_id);

                // 計算統計數據
                const totalPractice = answers ? answers.length : 0;
                const correctAnswers = answers ? answers.filter(a => a.is_correct).length : 0;
                const accuracy = totalPractice > 0 ? (correctAnswers / totalPractice * 100).toFixed(1) : 0;
                
                const totalConcepts = progress ? progress.length : 0;
                const averageMastery = totalConcepts > 0
                    ? (progress.reduce((sum, p) => sum + parseFloat(p.mastery_level), 0) / totalConcepts * 100).toFixed(1)
                    : 0;

                const totalSessions = sessions ? sessions.length : 0;
                const totalMessages = sessions ? sessions.reduce((sum, s) => sum + (s.message_count || 0), 0) : 0;

                const lastActivity = answers && answers.length > 0 
                    ? answers[0].answered_at 
                    : user.last_active;

                return {
                    ...user,
                    stats: {
                        totalPractice,
                        correctAnswers,
                        accuracy: parseFloat(accuracy),
                        totalConcepts,
                        averageMastery: parseFloat(averageMastery),
                        totalSessions,
                        totalMessages,
                        lastActivity
                    }
                };
            } catch (error) {
                console.error(`獲取用戶 ${user.user_id} 統計失敗:`, error);
                return {
                    ...user,
                    stats: {
                        totalPractice: 0,
                        correctAnswers: 0,
                        accuracy: 0,
                        totalConcepts: 0,
                        averageMastery: 0,
                        totalSessions: 0,
                        totalMessages: 0,
                        lastActivity: user.last_active
                    }
                };
            }
        }));

        res.json({
            success: true,
            users: usersWithStats,
            total: usersWithStats.length
        });
    } catch (error) {
        console.error('獲取用戶列表失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶列表失敗'
        });
    }
});

// 獲取單個用戶的詳細進度
router.get('/users/:userId/details', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // 獲取用戶基本信息
        const { data: user, error: userError } = await db.client
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: '用戶不存在'
            });
        }

        // 獲取學習進度
        const { data: progress } = await db.client
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .order('last_practiced', { ascending: false });

        // 獲取練習記錄（最近100條）
        const { data: answers } = await db.client
            .from('user_answers')
            .select(`
                answer_id,
                question_id,
                user_answer,
                is_correct,
                time_taken,
                answered_at,
                practice_questions (
                    question_text,
                    concept_name,
                    difficulty_level,
                    question_type
                )
            `)
            .eq('user_id', userId)
            .order('answered_at', { ascending: false })
            .limit(100);

        // 獲取聊天會話
        const { data: sessions } = await db.client
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false })
            .limit(20);

        res.json({
            success: true,
            user: user,
            progress: progress || [],
            recentAnswers: answers || [],
            recentSessions: sessions || []
        });
    } catch (error) {
        console.error('獲取用戶詳情失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶詳情失敗'
        });
    }
});

// 獲取系統總體統計
router.get('/stats/overview', requireAdmin, async (req, res) => {
    try {
        // 總用戶數
        const { count: totalUsers } = await db.client
            .from('users')
            .select('*', { count: 'exact', head: true });

        // 總練習題數
        const { count: totalQuestions } = await db.client
            .from('practice_questions')
            .select('*', { count: 'exact', head: true });

        // 總答題數
        const { count: totalAnswers } = await db.client
            .from('user_answers')
            .select('*', { count: 'exact', head: true });

        // 今日活躍用戶（最近24小時）
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: activeToday } = await db.client
            .from('user_answers')
            .select('user_id', { count: 'exact', head: true })
            .gte('answered_at', yesterday);

        // 獲取最近7天的活動趨勢
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentActivity } = await db.client
            .from('user_answers')
            .select('answered_at, is_correct')
            .gte('answered_at', sevenDaysAgo)
            .order('answered_at', { ascending: false });

        // 按日期統計
        const activityByDate = {};
        if (recentActivity) {
            recentActivity.forEach(item => {
                const date = new Date(item.answered_at).toISOString().split('T')[0];
                if (!activityByDate[date]) {
                    activityByDate[date] = { total: 0, correct: 0 };
                }
                activityByDate[date].total++;
                if (item.is_correct) {
                    activityByDate[date].correct++;
                }
            });
        }

        res.json({
            success: true,
            overview: {
                totalUsers: totalUsers || 0,
                totalQuestions: totalQuestions || 0,
                totalAnswers: totalAnswers || 0,
                activeToday: activeToday || 0
            },
            recentActivity: Object.entries(activityByDate).map(([date, stats]) => ({
                date,
                total: stats.total,
                correct: stats.correct,
                accuracy: (stats.correct / stats.total * 100).toFixed(1)
            })).reverse()
        });
    } catch (error) {
        console.error('獲取系統統計失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取系統統計失敗'
        });
    }
});

// 獲取熱門概念統計
router.get('/stats/popular-concepts', requireAdmin, async (req, res) => {
    try {
        const { data: concepts } = await db.client
            .from('user_answers')
            .select(`
                practice_questions (
                    concept_name,
                    difficulty_level
                ),
                is_correct
            `);

        // 統計每個概念的練習次數和正確率

        if (messagesError) throw messagesError;

        res.json({
            success: true,
            session: session,
            messages: messages || []
        });
    } catch (error) {
        console.error('獲取聊天記錄失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取聊天記錄失敗'
        });
    }
});

// 導出單個用戶的聊天記錄
router.get('/users/:userId/export-chats', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // 獲取用戶信息
        const { data: user } = await db.client
            .from('users')
            .select('username')
            .eq('user_id', userId)
            .single();

        // 獲取該用戶的所有會話
        const { data: sessions } = await db.client
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

        // 獲取所有會話的消息
        const exportData = [];
        for (const session of (sessions || [])) {
            const { data: messages } = await db.client
                .from('messages')
                .select('*')
                .eq('session_id', session.session_id)
                .order('timestamp', { ascending: true });

            exportData.push({
                session_id: session.session_id,
                topic: session.topic || 'General Conversation',
                start_time: session.start_time,
                end_time: session.end_time,
                message_count: session.message_count,
                messages: (messages || []).map(m => ({
                    sender: m.sender_type,
                    content: m.content,
                    timestamp: m.timestamp
                }))
            });
        }

        res.json({
            success: true,
            user: {
                user_id: userId,
                username: user?.username || 'Unknown'
            },
            export_date: new Date().toISOString(),
            total_sessions: exportData.length,
            sessions: exportData
        });
    } catch (error) {
        console.error('導出用戶聊天記錄失敗:', error);
        res.status(500).json({
            success: false,
            error: '導出聊天記錄失敗'
        });
    }
});

// 導出所有用戶的聊天記錄
router.get('/export-all-chats', requireAdmin, async (req, res) => {
    try {
        // 獲取所有用戶
        const readClient = db.admin || db.client;
        const { data: users } = await readClient
            .from('users')
            .select('user_id, username')
            .order('created_at', { ascending: false });

        const allExportData = [];

        for (const user of (users || [])) {
            // 獲取該用戶的所有會話
            const { data: sessions } = await readClient
                .from('chat_sessions')
                .select('*')
                .eq('user_id', user.user_id)
                .order('start_time', { ascending: false });

            const userSessions = [];
            for (const session of (sessions || [])) {
                const { data: messages } = await readClient
                    .from('messages')
                    .select('*')
                    .eq('session_id', session.session_id)
                    .order('timestamp', { ascending: true });

                userSessions.push({
                    session_id: session.session_id,
                    topic: session.topic || 'General Conversation',
                    start_time: session.start_time,
                    end_time: session.end_time,
                    message_count: session.message_count,
                    messages: (messages || []).map(m => ({
                        sender: m.sender_type,
                        content: m.content,
                        timestamp: m.timestamp
                    }))
                });
            }

            if (userSessions.length > 0) {
                allExportData.push({
                    user_id: user.user_id,
                    username: user.username,
                    total_sessions: userSessions.length,
                    sessions: userSessions
                });
            }
        }

        res.json({
            success: true,
            export_date: new Date().toISOString(),
            total_users: allExportData.length,
            users: allExportData
        });
    } catch (error) {
        console.error('導出所有聊天記錄失敗:', error);
        res.status(500).json({
            success: false,
            error: '導出聊天記錄失敗'
        });
    }
});

// 導出所有資料（聊天記錄 + AI Practice 問答記錄）
router.get('/export-all-data', requireAdmin, async (req, res) => {
    try {
        const readClient = db.admin || db.client;

        // 匯出聊天記錄（沿用 export-all-chats 的結構）
        const { data: users } = await readClient
            .from('users')
            .select('user_id, username')
            .order('created_at', { ascending: false });

        const chatExportData = [];
        for (const user of (users || [])) {
            const { data: sessions } = await readClient
                .from('chat_sessions')
                .select('*')
                .eq('user_id', user.user_id)
                .order('start_time', { ascending: false });

            const userSessions = [];
            for (const session of (sessions || [])) {
                const { data: messages } = await readClient
                    .from('messages')
                    .select('*')
                    .eq('session_id', session.session_id)
                    .order('timestamp', { ascending: true });

                userSessions.push({
                    session_id: session.session_id,
                    topic: session.topic || 'General Conversation',
                    start_time: session.start_time,
                    end_time: session.end_time,
                    message_count: session.message_count,
                    messages: (messages || []).map(m => ({
                        sender: m.sender_type,
                        content: m.content,
                        timestamp: m.timestamp
                    }))
                });
            }

            if (userSessions.length > 0) {
                chatExportData.push({
                    user_id: user.user_id,
                    username: user.username,
                    total_sessions: userSessions.length,
                    sessions: userSessions
                });
            }
        }

        // 匯出 AI Practice 問答記錄
        const { data: practiceRecords, error: practiceError } = await readClient
            .from('user_answers')
            .select(`
                answer_id,
                user_id,
                question_id,
                user_answer,
                is_correct,
                time_taken,
                answered_at,
                users (
                    username
                ),
                practice_questions (
                    question_id,
                    question_text,
                    concept_name,
                    difficulty_level,
                    question_type,
                    correct_answer,
                    explanation,
                    options
                )
            `)
            .order('answered_at', { ascending: false });

        if (practiceError) throw practiceError;

        res.json({
            success: true,
            export_date: new Date().toISOString(),
            chats: {
                total_users: chatExportData.length,
                users: chatExportData
            },
            practice_records: {
                total_records: practiceRecords?.length || 0,
                records: practiceRecords || []
            }
        });
    } catch (error) {
        console.error('導出所有資料失敗:', error);
        res.status(500).json({
            success: false,
            error: '導出所有資料失敗'
        });
    }
});

// 獲取所有 AI Practice 答題記錄（分頁）
router.get('/practice-records', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const conceptFilter = req.query.concept || '';
        const difficultyFilter = req.query.difficulty || '';
        const correctFilter = req.query.correct; // 'true', 'false', or undefined

        // 構建查詢
        let query = db.client
            .from('user_answers')
            .select(`
                answer_id,
                user_id,
                question_id,
                user_answer,
                is_correct,
                time_taken,
                answered_at,
                users (
                    username
                ),
                practice_questions (
                    question_id,
                    question_text,
                    concept_name,
                    difficulty_level,
                    question_type,
                    correct_answer,
                    explanation,
                    options
                )
            `, { count: 'exact' })
            .order('answered_at', { ascending: false });

        // 獲取總數和記錄
        const { data: records, error, count } = await query
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 應用篩選（在應用層處理，因為 Supabase 嵌套查詢篩選有限制）
        let filteredRecords = records || [];
        
        if (conceptFilter) {
            filteredRecords = filteredRecords.filter(r => 
                r.practice_questions?.concept_name?.toLowerCase().includes(conceptFilter.toLowerCase())
            );
        }
        
        if (difficultyFilter) {
            filteredRecords = filteredRecords.filter(r => 
                r.practice_questions?.difficulty_level === parseInt(difficultyFilter)
            );
        }
        
        if (correctFilter !== undefined) {
            const isCorrect = correctFilter === 'true';
            filteredRecords = filteredRecords.filter(r => r.is_correct === isCorrect);
        }

        res.json({
            success: true,
            records: filteredRecords,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('獲取答題記錄失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取答題記錄失敗'
        });
    }
});

// 獲取 AI Practice 統計摘要
router.get('/practice-stats', requireAdmin, async (req, res) => {
    try {
        // 獲取所有答題記錄
        const { data: allAnswers, error } = await db.client
            .from('user_answers')
            .select(`
                is_correct,
                answered_at,
                practice_questions (
                    concept_name,
                    difficulty_level,
                    question_type
                )
            `);

        if (error) throw error;

        // 總體統計
        const totalAnswers = allAnswers?.length || 0;
        const correctAnswers = allAnswers?.filter(a => a.is_correct).length || 0;
        const overallAccuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers * 100).toFixed(1) : 0;

        // 按概念統計
        const conceptStats = {};
        allAnswers?.forEach(answer => {
            const concept = answer.practice_questions?.concept_name || 'Unknown';
            if (!conceptStats[concept]) {
                conceptStats[concept] = { total: 0, correct: 0 };
            }
            conceptStats[concept].total++;
            if (answer.is_correct) conceptStats[concept].correct++;
        });

        // 按難度統計
        const difficultyStats = { 1: { total: 0, correct: 0 }, 2: { total: 0, correct: 0 }, 3: { total: 0, correct: 0 } };
        allAnswers?.forEach(answer => {
            const diff = answer.practice_questions?.difficulty_level || 1;
            difficultyStats[diff].total++;
            if (answer.is_correct) difficultyStats[diff].correct++;
        });

        // 按題型統計
        const typeStats = {};
        allAnswers?.forEach(answer => {
            const type = answer.practice_questions?.question_type || 'unknown';
            if (!typeStats[type]) {
                typeStats[type] = { total: 0, correct: 0 };
            }
            typeStats[type].total++;
            if (answer.is_correct) typeStats[type].correct++;
        });

        // 最近7天趨勢
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyStats = {};
        allAnswers?.forEach(answer => {
            const date = new Date(answer.answered_at);
            if (date >= sevenDaysAgo) {
                const dateKey = date.toISOString().split('T')[0];
                if (!dailyStats[dateKey]) {
                    dailyStats[dateKey] = { total: 0, correct: 0 };
                }
                dailyStats[dateKey].total++;
                if (answer.is_correct) dailyStats[dateKey].correct++;
            }
        });

        res.json({
            success: true,
            stats: {
                overall: {
                    totalAnswers,
                    correctAnswers,
                    accuracy: parseFloat(overallAccuracy)
                },
                byConcept: Object.entries(conceptStats).map(([name, stats]) => ({
                    concept: name,
                    total: stats.total,
                    correct: stats.correct,
                    accuracy: (stats.correct / stats.total * 100).toFixed(1)
                })).sort((a, b) => b.total - a.total),
                byDifficulty: Object.entries(difficultyStats).map(([level, stats]) => ({
                    level: parseInt(level),
                    levelName: level === '1' ? 'Basic' : level === '2' ? 'Medium' : 'Advanced',
                    total: stats.total,
                    correct: stats.correct,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : 0
                })),
                byType: Object.entries(typeStats).map(([type, stats]) => ({
                    type,
                    total: stats.total,
                    correct: stats.correct,
                    accuracy: (stats.correct / stats.total * 100).toFixed(1)
                })).sort((a, b) => b.total - a.total),
                dailyTrend: Object.entries(dailyStats)
                    .map(([date, stats]) => ({
                        date,
                        total: stats.total,
                        correct: stats.correct,
                        accuracy: (stats.correct / stats.total * 100).toFixed(1)
                    }))
                    .sort((a, b) => a.date.localeCompare(b.date))
            }
        });
    } catch (error) {
        console.error('獲取練習統計失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取練習統計失敗'
        });
    }
});

// ============================================
// 老師題目管理 API
// ============================================

// 獲取所有老師題目
router.get('/teacher-questions', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const conceptFilter = req.query.concept || '';
        const activeOnly = req.query.active === 'true';

        let query = db.client
            .from('teacher_questions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        if (conceptFilter) {
            query = query.ilike('concept_name', `%${conceptFilter}%`);
        }

        const { data: questions, error, count } = await query
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            questions: questions || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('獲取老師題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取老師題目失敗'
        });
    }
});

// 獲取單個老師題目
router.get('/teacher-questions/:questionId', requireAdmin, async (req, res) => {
    try {
        const { questionId } = req.params;

        const { data: question, error } = await db.client
            .from('teacher_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();

        if (error || !question) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }

        res.json({
            success: true,
            question
        });
    } catch (error) {
        console.error('獲取題目詳情失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目詳情失敗'
        });
    }
});

// 創建新的老師題目
router.post('/teacher-questions', requireAdmin, async (req, res) => {
    try {
        const {
            concept_name,
            difficulty_level,
            question_type,
            question_text,
            options,
            correct_answer,
            explanation
        } = req.body;

        // 驗證必填欄位
        if (!concept_name || !question_type || !question_text || !correct_answer) {
            return res.status(400).json({
                success: false,
                error: '缺少必填欄位：concept_name, question_type, question_text, correct_answer'
            });
        }

        // 驗證題型
        const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'open_ended'];
        if (!validTypes.includes(question_type)) {
            return res.status(400).json({
                success: false,
                error: '無效的題型，必須是：multiple_choice, true_false, fill_blank, open_ended'
            });
        }

        // 選擇題需要 options
        if (question_type === 'multiple_choice' && (!options || options.length < 2)) {
            return res.status(400).json({
                success: false,
                error: '選擇題需要至少2個選項'
            });
        }

        const { data: question, error } = await db.client
            .from('teacher_questions')
            .insert({
                concept_name,
                difficulty_level: difficulty_level || 2,
                question_type,
                question_text,
                options: options || null,
                correct_answer,
                explanation: explanation || null,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: '題目創建成功',
            question
        });
    } catch (error) {
        console.error('創建題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '創建題目失敗'
        });
    }
});

// 更新老師題目
router.put('/teacher-questions/:questionId', requireAdmin, async (req, res) => {
    try {
        const { questionId } = req.params;
        const {
            concept_name,
            difficulty_level,
            question_type,
            question_text,
            options,
            correct_answer,
            explanation,
            is_active
        } = req.body;

        const updateData = {};
        if (concept_name !== undefined) updateData.concept_name = concept_name;
        if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
        if (question_type !== undefined) updateData.question_type = question_type;
        if (question_text !== undefined) updateData.question_text = question_text;
        if (options !== undefined) updateData.options = options;
        if (correct_answer !== undefined) updateData.correct_answer = correct_answer;
        if (explanation !== undefined) updateData.explanation = explanation;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data: question, error } = await db.client
            .from('teacher_questions')
            .update(updateData)
            .eq('question_id', questionId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: '題目更新成功',
            question
        });
    } catch (error) {
        console.error('更新題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '更新題目失敗'
        });
    }
});

// 刪除老師題目
router.delete('/teacher-questions/:questionId', requireAdmin, async (req, res) => {
    try {
        const { questionId } = req.params;

        const { error } = await db.client
            .from('teacher_questions')
            .delete()
            .eq('question_id', questionId);

        if (error) throw error;

        res.json({
            success: true,
            message: '題目已刪除'
        });
    } catch (error) {
        console.error('刪除題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '刪除題目失敗'
        });
    }
});

// 切換題目啟用狀態
router.patch('/teacher-questions/:questionId/toggle', requireAdmin, async (req, res) => {
    try {
        const { questionId } = req.params;

        // 先獲取當前狀態
        const { data: current, error: getError } = await db.client
            .from('teacher_questions')
            .select('is_active')
            .eq('question_id', questionId)
            .single();

        if (getError || !current) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }

        // 切換狀態
        const { data: question, error } = await db.client
            .from('teacher_questions')
            .update({ is_active: !current.is_active })
            .eq('question_id', questionId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: question.is_active ? '題目已啟用' : '題目已停用',
            question
        });
    } catch (error) {
        console.error('切換題目狀態失敗:', error);
        res.status(500).json({
            success: false,
            error: '切換題目狀態失敗'
        });
    }
});

// 獲取老師題目的答題統計
router.get('/teacher-questions/:questionId/stats', requireAdmin, async (req, res) => {
    try {
        const { questionId } = req.params;

        const { data: answers, error } = await db.client
            .from('teacher_question_answers')
            .select(`
                *,
                users (
                    username
                )
            `)
            .eq('question_id', questionId)
            .order('answered_at', { ascending: false });

        if (error) throw error;

        const totalAnswers = answers?.length || 0;
        const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
        const averageScore = totalAnswers > 0
            ? (answers.reduce((sum, a) => sum + (a.score || 0), 0) / totalAnswers).toFixed(1)
            : 0;
        const averageTime = totalAnswers > 0
            ? (answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / totalAnswers).toFixed(0)
            : 0;

        res.json({
            success: true,
            stats: {
                totalAnswers,
                correctAnswers,
                accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers * 100).toFixed(1) : 0,
                averageScore: parseFloat(averageScore),
                averageTime: parseInt(averageTime)
            },
            recentAnswers: answers?.slice(0, 20) || []
        });
    } catch (error) {
        console.error('獲取題目統計失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目統計失敗'
        });
    }
});

// 獲取老師題目總體統計
router.get('/teacher-questions-stats', requireAdmin, async (req, res) => {
    try {
        // 獲取題目數量
        const { count: totalQuestions } = await db.client
            .from('teacher_questions')
            .select('*', { count: 'exact', head: true });

        const { count: activeQuestions } = await db.client
            .from('teacher_questions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // 獲取答題記錄統計
        const { data: allAnswers } = await db.client
            .from('teacher_question_answers')
            .select('is_correct, score');

        const totalAnswers = allAnswers?.length || 0;
        const correctAnswers = allAnswers?.filter(a => a.is_correct).length || 0;
        const averageScore = totalAnswers > 0
            ? (allAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / totalAnswers).toFixed(1)
            : 0;

        // 按概念統計
        const { data: questionsByConcept } = await db.client
            .from('teacher_questions')
            .select('concept_name');

        const conceptCounts = {};
        questionsByConcept?.forEach(q => {
            const concept = q.concept_name || 'Unknown';
            conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
        });

        res.json({
            success: true,
            stats: {
                totalQuestions: totalQuestions || 0,
                activeQuestions: activeQuestions || 0,
                totalAnswers,
                correctAnswers,
                accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers * 100).toFixed(1) : 0,
                averageScore: parseFloat(averageScore),
                byConcept: Object.entries(conceptCounts).map(([name, count]) => ({
                    concept: name,
                    count
                })).sort((a, b) => b.count - a.count)
            }
        });
    } catch (error) {
        console.error('獲取老師題目統計失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取統計失敗'
        });
    }
});

module.exports = router;


