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
                    .select('is_correct, created_at')
                    .eq('user_id', user.user_id)
                    .order('created_at', { ascending: false })
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
                    ? answers[0].created_at 
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
                created_at,
                practice_questions (
                    question_text,
                    concept_name,
                    difficulty_level,
                    question_type
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
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
            .gte('created_at', yesterday);

        // 獲取最近7天的活動趨勢
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentActivity } = await db.client
            .from('user_answers')
            .select('created_at, is_correct')
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false });

        // 按日期統計
        const activityByDate = {};
        if (recentActivity) {
            recentActivity.forEach(item => {
                const date = new Date(item.created_at).toISOString().split('T')[0];
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
        const conceptStats = {};
        if (concepts) {
            concepts.forEach(item => {
                if (item.practice_questions) {
                    const conceptName = item.practice_questions.concept_name;
                    if (!conceptStats[conceptName]) {
                        conceptStats[conceptName] = {
                            total: 0,
                            correct: 0
                        };
                    }
                    conceptStats[conceptName].total++;
                    if (item.is_correct) {
                        conceptStats[conceptName].correct++;
                    }
                }
            });
        }

        const popularConcepts = Object.entries(conceptStats)
            .map(([name, stats]) => ({
                conceptName: name,
                totalPractice: stats.total,
                correctAnswers: stats.correct,
                accuracy: (stats.correct / stats.total * 100).toFixed(1)
            }))
            .sort((a, b) => b.totalPractice - a.totalPractice)
            .slice(0, 10);

        res.json({
            success: true,
            concepts: popularConcepts
        });
    } catch (error) {
        console.error('獲取熱門概念失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取熱門概念失敗'
        });
    }
});

module.exports = router;

