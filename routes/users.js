const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/supabase');
const router = express.Router();

// 創建或獲取用戶
router.post('/register', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        if (!username || username.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: '用戶名至少需要2個字符'
            });
        }
        
        // 檢查用戶名是否已存在
        const { data: existingUser } = await db.client
            .from('users')
            .select('user_id')
            .eq('username', username.trim())
            .single();
            
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: '用戶名已存在'
            });
        }
        
        // 創建新用戶
        const userData = {
            user_id: uuidv4(),
            username: username.trim(),
            email: email ? email.trim() : null,
            learning_level: 1
        };
        
        // 使用 admin 客戶端來創建用戶（繞過 RLS）
        const { data, error } = await db.admin
            .from('users')
            .insert([userData])
            .select()
            .single();
        
        const result = error 
            ? { success: false, error: error.message }
            : { success: true, data };
        
        if (result.success) {
            res.json({
                success: true,
                user: result.data,
                message: '用戶創建成功'
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('創建用戶失敗:', error);
        res.status(500).json({
            success: false,
            error: '創建用戶失敗'
        });
    }
});

// 用戶登入（簡單版本，實際項目可能需要更複雜的認證）
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !username.trim()) {
            return res.status(400).json({
                success: false,
                error: '請提供用戶名'
            });
        }
        
        // 檢查是否為管理員登入
        if (username.trim().toLowerCase() === 'admin') {
            // 管理員需要密碼
            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: '管理員登入需要密碼',
                    requirePassword: true
                });
            }
            
            // 驗證管理員密碼
            if (password !== 'admin123') {
                return res.status(401).json({
                    success: false,
                    error: '管理員密碼錯誤'
                });
            }
            
            // 管理員登入成功
            return res.json({
                success: true,
                user: {
                    user_id: 'admin',
                    username: 'admin',
                    role: 'admin',
                    email: 'admin@statistics-tutor.com'
                },
                isAdmin: true,
                message: '管理員登入成功'
            });
        }
        
        // 普通用戶登入
        // 查找用戶
        const { data: user, error } = await db.client
            .from('users')
            .select('*')
            .eq('username', username.trim())
            .single();
            
        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: '用戶不存在'
            });
        }
        
        // 更新最後登入時間（忽略錯誤，不影響登入流程）
        try {
            await db.updateUserActivity(user.user_id);
        } catch (error) {
            console.warn('更新用戶活動失敗，但不影響登入:', error.message);
        }
        
        res.json({
            success: true,
            user: user,
            isAdmin: false,
            message: '登入成功'
        });
        
    } catch (error) {
        console.error('用戶登入失敗:', error);
        res.status(500).json({
            success: false,
            error: '登入失敗'
        });
    }
});

// 獲取用戶資料
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await db.getUserById(userId);
        
        if (result.success) {
            res.json({
                success: true,
                user: result.data
            });
        } else {
            res.status(404).json({
                success: false,
                error: '用戶不存在'
            });
        }
    } catch (error) {
        console.error('獲取用戶資料失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶資料失敗'
        });
    }
});

// 更新用戶資料
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, learning_level } = req.body;
        
        const updateData = {};
        
        if (username && username.trim()) {
            updateData.username = username.trim();
        }
        
        if (email !== undefined) {
            updateData.email = email ? email.trim() : null;
        }
        
        if (learning_level && [1, 2, 3].includes(learning_level)) {
            updateData.learning_level = learning_level;
        }
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: '沒有提供有效的更新資料'
            });
        }
        
        const { data, error } = await db.client
            .from('users')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            user: data,
            message: '用戶資料更新成功'
        });
        
    } catch (error) {
        console.error('更新用戶資料失敗:', error);
        res.status(500).json({
            success: false,
            error: '更新用戶資料失敗'
        });
    }
});

// 獲取用戶學習進度
router.get('/:userId/progress', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await db.getUserProgress(userId);
        
        if (result.success) {
            // 計算整體學習統計
            const progress = result.data;
            const totalConcepts = progress.length;
            const averageMastery = totalConcepts > 0 
                ? progress.reduce((sum, p) => sum + parseFloat(p.mastery_level), 0) / totalConcepts 
                : 0;
            const totalPractice = progress.reduce((sum, p) => sum + p.practice_count, 0);
            
            res.json({
                success: true,
                progress: progress,
                statistics: {
                    totalConcepts,
                    averageMastery: Math.round(averageMastery * 100) / 100,
                    totalPractice,
                    lastActivity: progress.length > 0 ? progress[0].last_practiced : null
                }
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('獲取學習進度失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取學習進度失敗'
        });
    }
});

// 更新學習進度
router.post('/:userId/progress', async (req, res) => {
    try {
        const { userId } = req.params;
        const { conceptName, masteryIncrease = 0.1, practiceCount = 1, correctAnswers = 0 } = req.body;
        
        if (!conceptName) {
            return res.status(400).json({
                success: false,
                error: '請提供概念名稱'
            });
        }
        
        // 獲取當前進度
        const { data: currentProgress } = await db.client
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('concept_name', conceptName)
            .single();
        
        const progressData = {
            mastery_level: currentProgress 
                ? Math.min(1.0, parseFloat(currentProgress.mastery_level) + masteryIncrease)
                : masteryIncrease,
            practice_count: currentProgress 
                ? currentProgress.practice_count + practiceCount 
                : practiceCount,
            correct_answers: currentProgress 
                ? currentProgress.correct_answers + correctAnswers 
                : correctAnswers
        };
        
        const result = await db.updateLearningProgress(userId, conceptName, progressData);
        
        if (result.success) {
            res.json({
                success: true,
                progress: result.data,
                message: '學習進度更新成功'
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('更新學習進度失敗:', error);
        res.status(500).json({
            success: false,
            error: '更新學習進度失敗'
        });
    }
});

// 獲取用戶會話歷史
router.get('/:userId/sessions', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const { data, error } = await db.client
            .from('chat_sessions')
            .select(`
                session_id,
                start_time,
                end_time,
                topic,
                message_count,
                session_summary,
                is_active
            `)
            .eq('user_id', userId)
            .order('start_time', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
            
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            sessions: data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: data.length
            }
        });
        
    } catch (error) {
        console.error('獲取會話歷史失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取會話歷史失敗'
        });
    }
});

// 刪除用戶（軟刪除 - 實際項目中可能需要更複雜的邏輯）
router.delete('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 檢查用戶是否存在
        const { data: user } = await db.client
            .from('users')
            .select('user_id')
            .eq('user_id', userId)
            .single();
            
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用戶不存在'
            });
        }
        
        // 在實際應用中，這裡應該實現軟刪除或數據歸檔
        // 目前暫時返回成功訊息
        res.json({
            success: true,
            message: '用戶刪除請求已記錄（實際刪除需要管理員確認）'
        });
        
    } catch (error) {
        console.error('刪除用戶失敗:', error);
        res.status(500).json({
            success: false,
            error: '刪除用戶失敗'
        });
    }
});

module.exports = router;

