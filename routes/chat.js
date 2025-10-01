const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/supabase');
const router = express.Router();

// UUID 驗證和生成函數
function isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

function generateUUID() {
    return uuidv4();
}

// FastGPT API 配置
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;
const FASTGPT_API_BASE_URL = process.env.FASTGPT_API_BASE_URL;

// 統計概念關鍵詞映射
const CONCEPT_KEYWORDS = {
    '描述統計': ['平均數', '中位數', '眾數', '標準差', '變異數', '描述', '統計量'],
    '標準差': ['標準差', '變異數', 'SD', 'variance', '分散', '離散'],
    '單樣本t檢定': ['單樣本', 't檢定', 't-test', '假設檢定', '顯著性'],
    '獨立樣本t檢定': ['獨立樣本', '兩樣本', '比較', '群體差異'],
    '配對樣本t檢定': ['配對', '前後測', '重複測量', '相依樣本'],
    '相關分析': ['相關', 'correlation', '關聯', '線性關係', 'r值'],
    '簡單迴歸': ['迴歸', 'regression', '預測', '線性迴歸', '斜率'],
    '卡方檢定': ['卡方', 'chi-square', '類別變數', '獨立性檢定', '適合度檢定']
};

// 辨識訊息中的統計概念
function identifyConcepts(message) {
    const concepts = [];
    const lowerMessage = message.toLowerCase();
    
    for (const [concept, keywords] of Object.entries(CONCEPT_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                concepts.push(concept);
                break;
            }
        }
    }
    
    return [...new Set(concepts)]; // 去除重複
}

// 分析錯誤模式
function analyzeErrorPattern(userMessage, aiResponse) {
    const errorPatterns = [];
    
    // 檢查常見的統計錯誤概念
    if (userMessage.includes('標準差') && userMessage.includes('平均數')) {
        if (userMessage.includes('一樣') || userMessage.includes('相同')) {
            errorPatterns.push('混淆標準差與平均數的概念');
        }
    }
    
    if (userMessage.includes('相關') && userMessage.includes('因果')) {
        errorPatterns.push('混淆相關與因果關係');
    }
    
    if (userMessage.includes('p值') && (userMessage.includes('機率') || userMessage.includes('可能性'))) {
        errorPatterns.push('誤解p值的意義');
    }
    
    return errorPatterns;
}

// 創建或獲取會話
router.post('/session', async (req, res) => {
    try {
        const { userId, topic } = req.body;
        let sessionId = req.sessionId;
        
        // 確保 sessionId 是有效的 UUID 格式
        if (!sessionId || !isValidUUID(sessionId)) {
            sessionId = generateUUID();
        }
        
        // 創建新會話
        const sessionData = {
            session_id: sessionId,
            user_id: userId || null,
            topic: topic || null,
            difficulty_level: 1,
            is_active: true
        };
        
        const result = await db.createChatSession(sessionData);
        
        if (result.success) {
            res.json({
                success: true,
                sessionId: sessionId,
                session: result.data
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('創建會話失敗:', error);
        res.status(500).json({
            success: false,
            error: '創建會話失敗'
        });
    }
});

// 發送訊息並獲取 AI 回應
router.post('/message', async (req, res) => {
    try {
        const { message, userId } = req.body;
        let sessionId = req.sessionId;
        
        // 確保 sessionId 是有效的 UUID 格式
        if (!sessionId || !isValidUUID(sessionId)) {
            sessionId = generateUUID();
            
            // 創建新會話
            const sessionData = {
                session_id: sessionId,
                user_id: userId || null,
                difficulty_level: 1,
                is_active: true
            };
            
            await db.createChatSession(sessionData);
        }
        
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: '訊息內容不能為空'
            });
        }
        
        // 辨識統計概念
        const concepts = identifyConcepts(message);
        
        // 保存用戶訊息
        const userMessageData = {
            session_id: sessionId,
            sender_type: 'user',
            content: message.trim(),
            concept_tags: concepts
        };
        
        await db.saveMessage(userMessageData);
        
        // 調用 FastGPT API
        const response = await fetch(`${FASTGPT_API_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FASTGPT_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `你是一位專業的統計學教學助理，專門幫助心理學系學生理解 PSY2032 統計方法課程。請遵循以下原則：

1. 使用繁體中文回答
2. 提供清晰、準確且易懂的解釋
3. 使用蘇格拉底式提問法引導學習
4. 結合心理學實例說明統計概念
5. 適時提供練習建議
6. 注重統計倫理和批判性思維
7. 根據學生程度調整解釋深度

當前檢測到的統計概念: ${concepts.join(', ') || '無特定概念'}

請針對學生的問題提供有幫助的回答，並在適當時候提出引導性問題。`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`FastGPT API 請求失敗: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('FastGPT API 回應格式錯誤');
        }

        const aiResponse = data.choices[0].message.content;
        
        // 保存 AI 回應
        const aiMessageData = {
            session_id: sessionId,
            sender_type: 'ai',
            content: aiResponse,
            concept_tags: concepts
        };
        
        await db.saveMessage(aiMessageData);
        
        // 分析錯誤模式
        const errorPatterns = analyzeErrorPattern(message, aiResponse);
        if (errorPatterns.length > 0 && concepts.length > 0) {
            for (const pattern of errorPatterns) {
                await db.recordCommonIssue(concepts[0], pattern);
            }
        }
        
        // 更新學習進度
        if (userId && concepts.length > 0) {
            for (const concept of concepts) {
                await db.updateLearningProgress(userId, concept, {
                    practice_count: 1, // 這裡可以根據實際邏輯調整
                    mastery_level: 0.1 // 簡單的進度增加，實際應該更複雜
                });
            }
        }
        
        // 更新會話統計
        await db.updateChatSession(sessionId, {
            message_count: 2, // 用戶訊息 + AI 回應
            topic: concepts[0] || null
        });
        
        res.json({
            success: true,
            response: aiResponse,
            concepts: concepts,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('處理訊息失敗:', error);
        res.status(500).json({
            success: false,
            error: '處理訊息時發生錯誤，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 獲取會話歷史
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50 } = req.query;
        
        const result = await db.getSessionMessages(sessionId, parseInt(limit));
        
        if (result.success) {
            res.json({
                success: true,
                messages: result.data
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('獲取會話歷史失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取會話歷史失敗'
        });
    }
});

// 結束會話
router.post('/session/:sessionId/end', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { summary } = req.body;
        
        const result = await db.updateChatSession(sessionId, {
            end_time: new Date().toISOString(),
            is_active: false,
            session_summary: summary || null
        });
        
        if (result.success) {
            res.json({
                success: true,
                message: '會話已結束'
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('結束會話失敗:', error);
        res.status(500).json({
            success: false,
            error: '結束會話失敗'
        });
    }
});

// 獲取統計概念列表
router.get('/concepts', async (req, res) => {
    try {
        const result = await db.getAllConcepts();
        
        if (result.success) {
            res.json({
                success: true,
                concepts: result.data
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('獲取概念列表失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取概念列表失敗'
        });
    }
});

// 獲取練習題
router.get('/practice/:concept', async (req, res) => {
    try {
        const { concept } = req.params;
        const { difficulty } = req.query;
        
        const result = await db.getQuestionsByConcept(concept, difficulty ? parseInt(difficulty) : null);
        
        if (result.success) {
            res.json({
                success: true,
                questions: result.data
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('獲取練習題失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取練習題失敗'
        });
    }
});

module.exports = router;

