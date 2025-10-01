const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('缺少 Supabase 環境變數。請檢查 SUPABASE_URL 和 SUPABASE_ANON_KEY');
}

// 創建客戶端實例
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});

// 創建服務角色客戶端（用於管理員操作）
const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// 數據庫操作輔助函數
class DatabaseService {
    constructor() {
        this.client = supabase;
        this.admin = supabaseAdmin;
    }

    // 用戶相關操作
    async createUser(userData) {
        try {
            const { data, error } = await this.client
                .from('users')
                .insert([userData])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('創建用戶失敗:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserById(userId) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('獲取用戶失敗:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUserActivity(userId) {
        try {
            // 先獲取當前的 total_sessions 值
            const { data: currentUser, error: fetchError } = await this.client
                .from('users')
                .select('total_sessions')
                .eq('user_id', userId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // 更新用戶活動
            const { data, error } = await this.client
                .from('users')
                .update({ 
                    last_login: new Date().toISOString(),
                    total_sessions: (currentUser.total_sessions || 0) + 1
                })
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('更新用戶活動失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 會話相關操作
    async createChatSession(sessionData) {
        try {
            const { data, error } = await this.client
                .from('chat_sessions')
                .insert([sessionData])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('創建會話失敗:', error);
            return { success: false, error: error.message };
        }
    }

    async updateChatSession(sessionId, updateData) {
        try {
            const { data, error } = await this.client
                .from('chat_sessions')
                .update(updateData)
                .eq('session_id', sessionId)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('更新會話失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 訊息相關操作
    async saveMessage(messageData) {
        try {
            const { data, error } = await this.client
                .from('messages')
                .insert([messageData])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('保存訊息失敗:', error);
            return { success: false, error: error.message };
        }
    }

    async getSessionMessages(sessionId, limit = 50) {
        try {
            const { data, error } = await this.client
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true })
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('獲取會話訊息失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 學習進度相關操作
    async updateLearningProgress(userId, conceptName, progressData) {
        try {
            const { data, error } = await this.client
                .from('learning_progress')
                .upsert([{
                    user_id: userId,
                    concept_name: conceptName,
                    ...progressData,
                    last_practiced: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('更新學習進度失敗:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserProgress(userId) {
        try {
            const { data, error } = await this.client
                .from('learning_progress')
                .select('*')
                .eq('user_id', userId)
                .order('last_practiced', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('獲取用戶進度失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 統計概念相關操作
    async getAllConcepts() {
        try {
            const { data, error } = await this.client
                .from('statistical_concepts')
                .select('*')
                .order('difficulty_level', { ascending: true });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('獲取統計概念失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 練習題相關操作
    async getQuestionsByConcept(conceptName, difficultyLevel = null) {
        try {
            let query = this.client
                .from('practice_questions')
                .select('*')
                .eq('concept_name', conceptName);
            
            if (difficultyLevel) {
                query = query.eq('difficulty_level', difficultyLevel);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('獲取練習題失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 分析相關操作
    async recordCommonIssue(conceptArea, errorPattern) {
        try {
            // 先檢查是否已存在相同的錯誤模式
            const { data: existing } = await this.client
                .from('common_issues')
                .select('*')
                .eq('concept_area', conceptArea)
                .eq('error_pattern', errorPattern)
                .single();

            if (existing) {
                // 如果存在，增加頻率
                const { data, error } = await this.client
                    .from('common_issues')
                    .update({ 
                        frequency: existing.frequency + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('issue_id', existing.issue_id)
                    .select()
                    .single();
                
                if (error) throw error;
                return { success: true, data };
            } else {
                // 如果不存在，創建新記錄
                const { data, error } = await this.client
                    .from('common_issues')
                    .insert([{
                        concept_area: conceptArea,
                        error_pattern: errorPattern,
                        frequency: 1
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                return { success: true, data };
            }
        } catch (error) {
            console.error('記錄常見問題失敗:', error);
            return { success: false, error: error.message };
        }
    }

    // 獲取分析數據
    async getAnalytics(userId = null, timeRange = '7 days') {
        try {
            const results = {};

            // 用戶統計
            if (userId) {
                const { data: userStats } = await this.client
                    .from('chat_sessions')
                    .select('session_id, start_time, message_count, topic')
                    .eq('user_id', userId)
                    .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
                
                results.userSessions = userStats || [];
            }

            // 常見問題統計
            const { data: commonIssues } = await this.client
                .from('common_issues')
                .select('*')
                .order('frequency', { ascending: false })
                .limit(10);
            
            results.commonIssues = commonIssues || [];

            return { success: true, data: results };
        } catch (error) {
            console.error('獲取分析數據失敗:', error);
            return { success: false, error: error.message };
        }
    }
}

// 導出實例
const db = new DatabaseService();

module.exports = {
    supabase,
    supabaseAdmin,
    db
};

