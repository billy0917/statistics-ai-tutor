# 題庫系統使用指南 (Question Bank System Guide)

## 📚 系統概述

題庫系統是統計學 AI 教學助理的擴展功能，提供 Topic 1-10 的結構化練習題目。題目來自課程教材，涵蓋了完整的統計學知識體系。

### 主要功能特色

- ✅ **10 個主題涵蓋**：從資料類型到卡方檢定
- ✅ **多種題型**：選擇題、計算題、解釋題
- ✅ **三種難度**：基礎、中級、高級
- ✅ **結構化數據**：題目編號、子主題、詳細解釋
- ✅ **靈活查詢**：按主題、難度、題型篩選

---

## 🗂️ 題庫結構

### Topic 列表

| Topic | 主題名稱 | 包含概念 |
|-------|---------|---------|
| T1 | Data Types and Measurement Scales | 質性/量化、離散/連續、名義/順序/等距/比率 |
| T2 | Descriptive Statistics | 平均數、標準差、頻率分佈 |
| T3 | Normal Distribution and Z-scores | 常態分佈、z 分數、機率計算 |
| T4 | Sampling Distribution | 母體與樣本、抽樣分佈、中央極限定理 |
| T5 | One Sample T-Test | 單樣本 t 檢定、假設檢定 |
| T6 | Paired Sample T-Test | 配對樣本 t 檢定、前後測比較 |
| T7 | Independent Sample T-Test | 獨立樣本 t 檢定、兩組比較 |
| T8 | Sample Size Calculation | 樣本量計算、統計檢定力 |
| T9 | Correlation and Regression | 相關分析、簡單迴歸 |
| T10 | Chi-Square Test | 卡方檢定、獨立性檢定 |

---

## 🚀 快速開始

### 1. 準備題庫文件

確保以下文件存在於項目根目錄的父目錄中：
```
C:\Users\Billy\Documents\statistic_chatbot\
├── T1_Q&A.txt
├── T2_Q&A.txt
├── T3_Q&A.txt
├── ...
└── T10_Q&A.txt
```

### 2. 更新數據庫架構

在 Supabase SQL Editor 中執行：
```bash
database/update-question-bank-schema.sql
```

這會添加必要的欄位和索引：
- `topic_number` - 主題編號 (1-10)
- `topic_name` - 主題名稱
- `sub_topic` - 子主題
- `question_number` - 原始題號
- `source` - 題目來源 (question_bank 或 ai_generated)

### 3. 導入題庫

執行導入腳本：
```bash
npm run import-questions
```

這會：
- 解析所有 T1-T10 文件
- 將題目轉換為結構化格式
- 導入到 Supabase 數據庫
- 顯示導入統計報告

### 4. 驗證導入

檢查導入結果：
```bash
# 測試 API 端點
curl http://localhost:3000/api/question-bank/stats

# 或在瀏覽器中訪問
http://localhost:3000/api/question-bank/topics
```

---

## 📡 API 端點

### 1. 獲取所有主題概覽
```http
GET /api/question-bank/topics
```

**回應範例：**
```json
{
  "success": true,
  "topics": [
    {
      "topic_number": 1,
      "topic_name": "Data Types and Measurement Scales",
      "total_questions": 35,
      "difficulty_breakdown": {
        "basic": 20,
        "medium": 10,
        "advanced": 5
      }
    }
  ]
}
```

### 2. 獲取特定主題的題目
```http
GET /api/question-bank/topic/:topicNumber
```

**參數：**
- `difficulty` - 難度篩選 (1, 2, 3)
- `questionType` - 題型 (multiple_choice, calculation, interpretation)
- `source` - 來源 (question_bank, ai_generated)
- `random` - 隨機排序 (true/false)
- `limit` - 數量限制 (預設 50)

**範例：**
```bash
# 獲取 Topic 5 的所有基礎題
GET /api/question-bank/topic/5?difficulty=1

# 隨機獲取 Topic 7 的 10 道題
GET /api/question-bank/topic/7?random=true&limit=10
```

### 3. 生成練習組合
```http
GET /api/question-bank/practice-set
```

**參數：**
- `topics` - 主題列表 (逗號分隔，如 "1,2,3")
- `difficulty` - 難度
- `count` - 題目數量 (預設 10)

**範例：**
```bash
# 從 Topic 5, 6, 7 各取題目組成 15 道練習題
GET /api/question-bank/practice-set?topics=5,6,7&count=15
```

### 4. 驗證答案
```http
POST /api/question-bank/validate-answer
Content-Type: application/json

{
  "questionId": "uuid",
  "userAnswer": "A"
}
```

**回應：**
```json
{
  "success": true,
  "is_correct": true,
  "correct_answer": "A",
  "explanation": "詳細解釋..."
}
```

### 5. 獲取統計資訊
```http
GET /api/question-bank/stats
```

**回應範例：**
```json
{
  "success": true,
  "stats": {
    "total_questions": 250,
    "total_topics": 10,
    "by_difficulty": {
      "basic": 100,
      "medium": 100,
      "advanced": 50
    },
    "by_source": {
      "question_bank": 200,
      "ai_generated": 50
    }
  }
}
```

---

## 🔧 開發工具

### 解析題庫 (不導入)
查看解析結果而不導入數據庫：
```bash
npm run parse-questions
```

### 自定義解析
```javascript
const { parseAllQuestionBanks } = require('./utils/questionBankParser');

// 解析指定目錄的題庫
const questions = parseAllQuestionBanks('../question-banks');
console.log(`Total parsed: ${questions.length}`);
```

### 添加新的 Topic 解析器

在 `utils/questionBankParser.js` 中添加：
```javascript
function parseT11Questions(content) {
    const questions = [];
    
    // 解析邏輯
    // ...
    
    return questions;
}

// 在 parseQuestionBank 函數中添加
switch(topicCode) {
    // ... 其他 case
    case 'T11':
        questions = parseT11Questions(content);
        break;
}
```

---

## 📊 數據庫架構

### 新增欄位

```sql
-- practice_questions 表新增欄位
topic_number INTEGER          -- 主題編號 (1-10)
topic_name VARCHAR(200)        -- 主題名稱
sub_topic VARCHAR(200)         -- 子主題
question_number VARCHAR(50)    -- 原始題號 (如 T1-1, T2-3)
source VARCHAR(50)             -- 'question_bank' 或 'ai_generated'
```

### 查詢函數

```sql
-- 按條件查詢題目
SELECT * FROM get_questions_by_topic(
    p_topic_number := 5,
    p_difficulty_level := 2,
    p_question_type := 'calculation',
    p_limit := 10
);

-- 獲取主題概覽
SELECT * FROM get_topic_overview();

-- 隨機獲取練習題
SELECT * FROM get_random_practice_questions(
    p_topic_number := 6,
    p_count := 5
);
```

---

## 🎯 使用場景

### 場景 1: 學生按主題練習

學生想練習 "獨立樣本 t 檢定" (Topic 7)：

```javascript
// 前端請求
fetch('/api/question-bank/topic/7?difficulty=1&limit=10')
  .then(res => res.json())
  .then(data => {
    // 顯示 10 道基礎題
    displayQuestions(data.questions);
  });
```

### 場景 2: 混合主題測驗

教師想創建涵蓋假設檢定的綜合測驗：

```javascript
// 請求 Topic 5, 6, 7 的題目
fetch('/api/question-bank/practice-set?topics=5,6,7&count=20')
  .then(res => res.json())
  .then(data => {
    // 20 道題混合自三個主題
    createExam(data.questions);
  });
```

### 場景 3: 自適應練習

根據學生表現調整難度：

```javascript
async function adaptivePractice(userId) {
  // 1. 獲取用戶進度
  const progress = await fetch(`/api/users/${userId}/progress`);
  
  // 2. 確定弱項主題
  const weakTopics = identifyWeakTopics(progress.data);
  
  // 3. 生成針對性練習
  const questions = await fetch(
    `/api/question-bank/practice-set?topics=${weakTopics.join(',')}&difficulty=2&count=15`
  );
  
  return questions.data;
}
```

---

## 🐛 故障排除

### 導入失敗

**問題：** `npm run import-questions` 失敗

**解決方案：**
1. 檢查環境變數配置 (`.env` 文件)
2. 確認 Supabase 連接正常
3. 執行數據庫更新腳本
4. 檢查題庫文件路徑

```bash
# 檢查環境變數
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# 測試連接
node -e "require('./config/supabase')"
```

### 題目格式錯誤

**問題：** 解析出的題目格式不正確

**解決方案：**
1. 使用 `npm run parse-questions` 查看解析結果
2. 檢查原始 txt 文件格式
3. 更新 `questionBankParser.js` 中對應的解析函數

### API 查詢無結果

**問題：** API 返回空數組

**解決方案：**
```bash
# 1. 檢查數據是否導入
curl http://localhost:3000/api/question-bank/stats

# 2. 檢查查詢參數
# 確保 topic_number 在 1-10 之間
# 確保 difficulty 為 1, 2, 或 3

# 3. 直接查詢數據庫
# 在 Supabase 中執行：
SELECT COUNT(*) FROM practice_questions WHERE source = 'question_bank';
```

---

## 📈 性能優化

### 索引策略

系統已創建以下索引：
- `idx_practice_questions_topic` - 按主題查詢
- `idx_practice_questions_source` - 按來源篩選
- `idx_practice_questions_topic_difficulty` - 組合索引

### 緩存建議

對於頻繁訪問的數據，建議實施緩存：

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 分鐘

// 緩存主題列表
router.get('/topics', async (req, res) => {
  const cacheKey = 'all_topics';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  // ... 從數據庫查詢
  cache.set(cacheKey, result);
  res.json(result);
});
```

---

## 🔄 更新與維護

### 添加新題目

1. 創建新的 txt 文件（如 `T11_Q&A.txt`）
2. 在 `TOPIC_DEFINITIONS` 中添加定義
3. 實現對應的解析函數
4. 運行導入腳本

### 更新現有題目

```sql
-- 直接在 Supabase 中更新
UPDATE practice_questions
SET explanation = '新的解釋內容'
WHERE question_number = 'T5-2';
```

### 備份題庫

```bash
# 導出題庫數據
npx supabase db dump --table practice_questions > backup.sql

# 恢復
psql -h [host] -U [user] -d [database] < backup.sql
```

---

## 🎓 最佳實踐

1. **定期更新**：隨著課程更新同步題庫
2. **版本控制**：使用 Git 追蹤題庫文件變更
3. **質量檢查**：導入後驗證題目和答案正確性
4. **用戶反饋**：收集錯誤報告並及時修正
5. **統計分析**：追蹤高錯誤率題目並改進

---

## 📞 支持

如有問題，請：
1. 查閱本文檔
2. 檢查 [GitHub Issues](https://github.com/billy0917/statistics-ai-tutor/issues)
3. 聯繫開發團隊

---

**最後更新：** 2024-11-04  
**版本：** 1.1.0




