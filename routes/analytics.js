const express = require('express');
const { db } = require('../config/supabase');
const router = express.Router();

// 獲取整體分析數據
router.get('/overview', async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        
        // 計算時間範圍
        let startDate;
        switch (timeRange) {
            case '1d':
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }
        
        // 獲取用戶統計
        const { data: userStats } = await db.client
            .from('users')
            .select('user_id, created_at, total_sessions, total_messages')
            .gte('created_at', startDate.toISOString());
        
        // 獲取會話統計
        const { data: sessionStats } = await db.client
            .from('chat_sessions')
            .select('session_id, start_time, topic, message_count, user_id')
            .gte('start_time', startDate.toISOString());
        
        // 獲取訊息統計
        const { data: messageStats } = await db.client
            .from('messages')
            .select('message_id, timestamp, sender_type, concept_tags')
            .gte('timestamp', startDate.toISOString());
        
        // 計算統計數據
        const totalUsers = userStats?.length || 0;
        const totalSessions = sessionStats?.length || 0;
        const totalMessages = messageStats?.length || 0;
        const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;
        
        // 主題分布
        const topicDistribution = {};
        sessionStats?.forEach(session => {
            if (session.topic) {
                topicDistribution[session.topic] = (topicDistribution[session.topic] || 0) + 1;
            }
        });
        
        // 概念標籤統計
        const conceptFrequency = {};
        messageStats?.forEach(message => {
            if (message.concept_tags && Array.isArray(message.concept_tags)) {
                message.concept_tags.forEach(concept => {
                    conceptFrequency[concept] = (conceptFrequency[concept] || 0) + 1;
                });
            }
        });
        
        // 每日活動統計
        const dailyActivity = {};
        sessionStats?.forEach(session => {
            const date = new Date(session.start_time).toISOString().split('T')[0];
            dailyActivity[date] = (dailyActivity[date] || 0) + 1;
        });
        
        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalSessions,
                    totalMessages,
                    avgMessagesPerSession,
                    timeRange
                },
                topicDistribution,
                conceptFrequency,
                dailyActivity
            }
        });
        
    } catch (error) {
        console.error('獲取分析數據失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取分析數據失敗'
        });
    }
});

// 獲取常見問題分析
router.get('/common-issues', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const result = await db.client
            .from('common_issues')
            .select('*')
            .order('frequency', { ascending: false })
            .limit(parseInt(limit));
        
        if (result.error) {
            throw result.error;
        }
        
        // 按概念區域分組
        const issuesByArea = {};
        result.data.forEach(issue => {
            if (!issuesByArea[issue.concept_area]) {
                issuesByArea[issue.concept_area] = [];
            }
            issuesByArea[issue.concept_area].push(issue);
        });
        
        res.json({
            success: true,
            data: {
                issues: result.data,
                issuesByArea,
                totalIssues: result.data.length
            }
        });
        
    } catch (error) {
        console.error('獲取常見問題失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取常見問題失敗'
        });
    }
});

// 獲取學習進度分析
router.get('/learning-progress', async (req, res) => {
    try {
        const { conceptName } = req.query;
        
        let query = db.client
            .from('learning_progress')
            .select(`
                concept_name,
                mastery_level,
                practice_count,
                correct_answers,
                last_practiced,
                users!inner(username, learning_level)
            `);
        
        if (conceptName) {
            query = query.eq('concept_name', conceptName);
        }
        
        const { data, error } = await query.order('mastery_level', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        // 計算統計數據
        const conceptStats = {};
        data.forEach(progress => {
            const concept = progress.concept_name;
            if (!conceptStats[concept]) {
                conceptStats[concept] = {
                    totalLearners: 0,
                    avgMastery: 0,
                    totalPractice: 0,
                    masteryLevels: []
                };
            }
            
            conceptStats[concept].totalLearners += 1;
            conceptStats[concept].totalPractice += progress.practice_count;
            conceptStats[concept].masteryLevels.push(parseFloat(progress.mastery_level));
        });
        
        // 計算平均掌握度
        Object.keys(conceptStats).forEach(concept => {
            const levels = conceptStats[concept].masteryLevels;
            conceptStats[concept].avgMastery = levels.length > 0 
                ? Math.round((levels.reduce((sum, level) => sum + level, 0) / levels.length) * 100) / 100
                : 0;
        });
        
        res.json({
            success: true,
            data: {
                progressData: data,
                conceptStats,
                totalRecords: data.length
            }
        });
        
    } catch (error) {
        console.error('獲取學習進度分析失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取學習進度分析失敗'
        });
    }
});

// 獲取用戶行為分析
router.get('/user-behavior', async (req, res) => {
    try {
        const { userId, timeRange = '30d' } = req.query;
        
        // 計算時間範圍
        let startDate;
        switch (timeRange) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }
        
        let sessionQuery = db.client
            .from('chat_sessions')
            .select(`
                session_id,
                start_time,
                end_time,
                topic,
                message_count,
                user_id,
                users!inner(username, learning_level)
            `)
            .gte('start_time', startDate.toISOString());
        
        if (userId) {
            sessionQuery = sessionQuery.eq('user_id', userId);
        }
        
        const { data: sessions, error } = await sessionQuery
            .order('start_time', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        // 分析用戶行為模式
        const userBehavior = {};
        const hourlyActivity = new Array(24).fill(0);
        const weeklyActivity = new Array(7).fill(0);
        
        sessions.forEach(session => {
            const userId = session.user_id;
            const startTime = new Date(session.start_time);
            const hour = startTime.getHours();
            const dayOfWeek = startTime.getDay();
            
            hourlyActivity[hour] += 1;
            weeklyActivity[dayOfWeek] += 1;
            
            if (!userBehavior[userId]) {
                userBehavior[userId] = {
                    username: session.users.username,
                    learning_level: session.users.learning_level,
                    totalSessions: 0,
                    totalMessages: 0,
                    topics: {},
                    avgSessionDuration: 0,
                    sessionDurations: []
                };
            }
            
            userBehavior[userId].totalSessions += 1;
            userBehavior[userId].totalMessages += session.message_count || 0;
            
            if (session.topic) {
                userBehavior[userId].topics[session.topic] = 
                    (userBehavior[userId].topics[session.topic] || 0) + 1;
            }
            
            // 計算會話時長（如果有結束時間）
            if (session.end_time) {
                const duration = (new Date(session.end_time) - startTime) / (1000 * 60); // 分鐘
                userBehavior[userId].sessionDurations.push(duration);
            }
        });
        
        // 計算平均會話時長
        Object.keys(userBehavior).forEach(userId => {
            const durations = userBehavior[userId].sessionDurations;
            if (durations.length > 0) {
                userBehavior[userId].avgSessionDuration = 
                    Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
            }
            delete userBehavior[userId].sessionDurations; // 清理臨時數據
        });
        
        res.json({
            success: true,
            data: {
                userBehavior,
                hourlyActivity,
                weeklyActivity: {
                    Sunday: weeklyActivity[0],
                    Monday: weeklyActivity[1],
                    Tuesday: weeklyActivity[2],
                    Wednesday: weeklyActivity[3],
                    Thursday: weeklyActivity[4],
                    Friday: weeklyActivity[5],
                    Saturday: weeklyActivity[6]
                },
                totalSessions: sessions.length,
                timeRange
            }
        });
        
    } catch (error) {
        console.error('獲取用戶行為分析失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶行為分析失敗'
        });
    }
});

// 獲取概念掌握度排名
router.get('/concept-mastery-ranking', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // 獲取所有學習進度數據
        const { data: progressData, error } = await db.client
            .from('learning_progress')
            .select(`
                concept_name,
                mastery_level,
                practice_count,
                users!inner(username, learning_level)
            `)
            .order('mastery_level', { ascending: false })
            .limit(parseInt(limit) * 5); // 獲取更多數據以便分析
        
        if (error) {
            throw error;
        }
        
        // 按概念分組並計算排名
        const conceptRanking = {};
        progressData.forEach(progress => {
            const concept = progress.concept_name;
            if (!conceptRanking[concept]) {
                conceptRanking[concept] = {
                    conceptName: concept,
                    learners: [],
                    avgMastery: 0,
                    totalLearners: 0
                };
            }
            
            conceptRanking[concept].learners.push({
                username: progress.users.username,
                learning_level: progress.users.learning_level,
                mastery_level: parseFloat(progress.mastery_level),
                practice_count: progress.practice_count
            });
        });
        
        // 計算每個概念的平均掌握度並排序學習者
        Object.keys(conceptRanking).forEach(concept => {
            const learners = conceptRanking[concept].learners;
            conceptRanking[concept].totalLearners = learners.length;
            
            // 按掌握度排序學習者
            learners.sort((a, b) => b.mastery_level - a.mastery_level);
            
            // 計算平均掌握度
            const avgMastery = learners.length > 0 
                ? learners.reduce((sum, learner) => sum + learner.mastery_level, 0) / learners.length
                : 0;
            conceptRanking[concept].avgMastery = Math.round(avgMastery * 100) / 100;
            
            // 只保留前幾名
            conceptRanking[concept].topLearners = learners.slice(0, 5);
        });
        
        // 按平均掌握度排序概念
        const sortedConcepts = Object.values(conceptRanking)
            .sort((a, b) => b.avgMastery - a.avgMastery)
            .slice(0, parseInt(limit));
        
        res.json({
            success: true,
            data: {
                conceptRanking: sortedConcepts,
                totalConcepts: Object.keys(conceptRanking).length
            }
        });
        
    } catch (error) {
        console.error('獲取概念掌握度排名失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取概念掌握度排名失敗'
        });
    }
});

// 導出學習報告
router.get('/export-report/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { format = 'json' } = req.query;
        
        // 獲取用戶基本信息
        const userResult = await db.getUserById(userId);
        if (!userResult.success) {
            return res.status(404).json({
                success: false,
                error: '用戶不存在'
            });
        }
        
        // 獲取學習進度
        const progressResult = await db.getUserProgress(userId);
        
        // 獲取會話歷史
        const { data: sessions } = await db.client
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false });
        
        // 獲取訊息統計
        const { data: messages } = await db.client
            .from('messages')
            .select('concept_tags, timestamp, sender_type')
            .in('session_id', sessions?.map(s => s.session_id) || []);
        
        // 生成報告
        const report = {
            user: userResult.data,
            generatedAt: new Date().toISOString(),
            summary: {
                totalSessions: sessions?.length || 0,
                totalMessages: messages?.length || 0,
                learningProgress: progressResult.success ? progressResult.data : [],
                studyPeriod: {
                    firstSession: sessions?.length > 0 ? sessions[sessions.length - 1].start_time : null,
                    lastSession: sessions?.length > 0 ? sessions[0].start_time : null
                }
            },
            detailedProgress: progressResult.success ? progressResult.data : [],
            sessionHistory: sessions || [],
            conceptActivity: {}
        };
        
        // 分析概念活動
        if (messages) {
            messages.forEach(message => {
                if (message.concept_tags && Array.isArray(message.concept_tags)) {
                    message.concept_tags.forEach(concept => {
                        if (!report.conceptActivity[concept]) {
                            report.conceptActivity[concept] = 0;
                        }
                        report.conceptActivity[concept] += 1;
                    });
                }
            });
        }
        
        if (format === 'json') {
            res.json({
                success: true,
                report
            });
        } else {
            // 未來可以支援其他格式如 PDF, CSV 等
            res.status(400).json({
                success: false,
                error: '不支援的導出格式'
            });
        }
        
    } catch (error) {
        console.error('導出學習報告失敗:', error);
        res.status(500).json({
            success: false,
            error: '導出學習報告失敗'
        });
    }
});

module.exports = router;

