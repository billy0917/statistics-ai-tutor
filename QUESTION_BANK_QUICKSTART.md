# 題庫系統快速開始指南

## ✅ 系統狀態

**測試結果：**
- ✅ 61 道題目已解析 (來自 8 個主題)
- ✅ 100% 題目格式驗證通過
- ✅ 所有題庫文件已找到

## 🚀 三步啟動

### 步驟 1: 更新數據庫架構

在 Supabase SQL Editor 執行：

```bash
database/update-question-bank-schema.sql
```

### 步驟 2: 導入題庫

```bash
npm run import-questions
```

### 步驟 3: 啟動服務器並測試

```bash
npm start
```

然後訪問：`http://localhost:3000/api/question-bank/stats`

## 📊 已實現的主題

| Topic | 名稱 | 題目數量 | 狀態 |
|-------|------|---------|------|
| T1 | Data Types & Measurement | 35 題 | ✅ |
| T2 | Descriptive Statistics | 5 題 | ✅ |
| T3 | Normal Distribution | 4 題 | ✅ |
| T4 | Sampling Distribution | 0 題 | ⏳ 待實現 |
| T5 | One Sample T-Test | 3 題 | ✅ |
| T6 | Paired Sample T-Test | 3 題 | ✅ |
| T7 | Independent T-Test | 3 題 | ✅ |
| T8 | Sample Size Calculation | 0 題 | ⏳ 待實現 |
| T9 | Correlation & Regression | 4 題 | ✅ |
| T10 | Chi-Square Test | 4 題 | ✅ |

**總計：61 道題目已準備好導入**

## 🔧 常用命令

### 測試題庫系統
```bash
npm run test-question-bank
```

### 查看解析結果（JSON 格式）
```bash
npm run parse-questions
```

### 導入題目到數據庫
```bash
npm run import-questions
```

### 啟動開發服務器
```bash
npm run dev
```

## 📡 API 範例

### 1. 獲取所有主題
```bash
curl http://localhost:3000/api/question-bank/topics
```

### 2. 獲取 Topic 1 的題目
```bash
curl http://localhost:3000/api/question-bank/topic/1
```

### 3. 獲取 Topic 5 的基礎題
```bash
curl http://localhost:3000/api/question-bank/topic/5?difficulty=1
```

### 4. 生成混合練習題
```bash
curl http://localhost:3000/api/question-bank/practice-set?topics=1,5,9&count=10
```

### 5. 查看統計資訊
```bash
curl http://localhost:3000/api/question-bank/stats
```

### 6. 驗證答案
```bash
curl -X POST http://localhost:3000/api/question-bank/validate-answer \
  -H "Content-Type: application/json" \
  -d '{"questionId":"<uuid>","userAnswer":"A"}'
```

## 📈 題目分佈

- **選擇題**：35 題 (57.4%)
- **計算題**：17 題 (27.9%)  
- **解釋題**：9 題 (14.8%)

**難度分佈：**
- 基礎：21 題 (34.4%)
- 中級：28 題 (45.9%)
- 高級：12 題 (19.7%)

## 🎯 前端整合範例

### React/JavaScript 範例

```javascript
// 獲取主題列表
async function getTopics() {
  const response = await fetch('/api/question-bank/topics');
  const data = await response.json();
  return data.topics;
}

// 生成練習組
async function generatePracticeSet(topics, count = 10) {
  const response = await fetch(
    `/api/question-bank/practice-set?topics=${topics.join(',')}&count=${count}`
  );
  const data = await response.json();
  return data.questions;
}

// 提交答案
async function submitAnswer(questionId, userAnswer) {
  const response = await fetch('/api/question-bank/validate-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, userAnswer })
  });
  return await response.json();
}

// 使用範例
(async () => {
  // 1. 獲取 Topic 5 的題目
  const questions = await fetch('/api/question-bank/topic/5').then(r => r.json());
  
  // 2. 顯示第一題
  const firstQ = questions.questions[0];
  console.log('Question:', firstQ.question_text);
  
  // 3. 用戶回答後驗證
  const result = await submitAnswer(firstQ.question_id, 'A');
  console.log('Correct:', result.is_correct);
  console.log('Explanation:', result.explanation);
})();
```

## 🔨 添加新主題解析器

如需為 T4 或 T8 添加解析器：

1. 打開 `utils/questionBankParser.js`
2. 添加解析函數：

```javascript
function parseT4Questions(content) {
    const questions = [];
    
    // 解析邏輯
    // ...
    
    return questions;
}
```

3. 在 `parseQuestionBank` 的 switch 中添加：

```javascript
case 'T4':
    questions = parseT4Questions(content);
    break;
```

4. 運行測試：`npm run test-question-bank`

## 📚 詳細文檔

完整文檔請參考：[QUESTION_BANK_GUIDE.md](./QUESTION_BANK_GUIDE.md)

## ❓ 常見問題

### Q: 為什麼 T4 和 T8 沒有題目？
A: 這兩個主題的解析器尚未實現。你可以參考其他主題的解析器來實現它們。

### Q: 如何修改現有題目？
A: 可以直接在 Supabase 中更新，或修改 txt 文件後重新導入。

### Q: 能否導出題庫數據？
A: 可以，運行 `npm run parse-questions > questions.json`

### Q: API 需要認證嗎？
A: 查看題目不需要認證，但提交答案並記錄進度需要用戶 ID。

---

**準備就緒！** 🎉 你的題庫系統已經可以使用了。

有問題？查看 [QUESTION_BANK_GUIDE.md](./QUESTION_BANK_GUIDE.md) 或聯繫開發團隊。




