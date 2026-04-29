# Statistics AI Tutor

最後更新：2026-04-30

這是一個給心理學統計課程使用的 AI 學習平台。現在的專案已不只是最初的聊天機器人，而是包含以下幾個部分：

- AI 統計導師聊天頁
- AI 生成練習題頁
- 固定題庫練習頁
- 老師出題與學生作答流程
- 管理員後台、統計、匯出與清空資料
- Supabase 資料庫
- FastGPT / EduHK MAAS API 串接

這份 README 的目標是讓下一任接手者可以知道專案現況、怎樣啟動、資料庫要怎樣設、主要 API 在哪裡，以及哪些地方需要特別小心。

## 目前架構

這個專案是 Node.js + Express 的單體服務。前端沒有 React/Vue/build pipeline，主要是幾個大型 HTML 檔，裡面包含 Tailwind CDN、inline CSS 和 inline JavaScript。

```text
statistics-ai-tutor/
  server.js                         Express 入口，掛載 API 和靜態頁面
  statistics-ai-tutor.html          主 AI 聊天頁
  public/
    practice.html                   AI 練習題、老師題、adaptive practice 頁
    question-bank.html              固定題庫練習頁
    admin.html                      管理員後台
    i18n.js                         中英文介面文字
  routes/
    chat.js                         AI 聊天 API
    users.js                        用戶登入/註冊/進度 API
    practice.js                     AI 出題、答題、老師題、自適應練習 API
    questionBank.js                 固定題庫 API
    analytics.js                    分析 API
    admin.js                        管理員 API
  config/
    supabase.js                     Supabase client 與資料庫 helper
  database/
    supabase-schema.sql             基本 schema
    update-question-bank-schema.sql 固定題庫欄位、view、RPC
    teacher-questions-schema.sql    老師出題 schema
    init-concepts.sql               初始概念資料
    add-english-concepts.sql        英文概念資料
  scripts/
    testQuestionBank.js             檢查題庫檔案與 parser
    importQuestionBank.js           匯入題庫到 Supabase
  utils/
    questionBankParser.js           T1-T10 題庫 parser
  prompts/
    chat-system-prompt.md           聊天導師 system prompt 版本紀錄
```

## 技術棧

- 後端：Node.js、Express
- 資料庫：Supabase PostgreSQL
- AI：FastGPT API，預設 base URL 是 EduHK MAAS
- 前端：HTML、Tailwind CSS CDN、vanilla JavaScript、MathJax、Highlight.js
- 部署：Vercel serverless function
- 套件管理：npm

注意：`sqlite3` 目前在 dependencies 內，但目前主要資料儲存走 Supabase。

## 頁面

| 路徑 | 檔案 | 用途 |
| --- | --- | --- |
| `/` | `statistics-ai-tutor.html` | AI 統計聊天導師 |
| `/practice.html` | `public/practice.html` | AI 生成題、老師題、自適應練習 |
| `/question-bank.html` | `public/question-bank.html` | 固定題庫練習 |
| `/admin.html` | `public/admin.html` | 管理員後台 |
| `/api/health` | `server.js` | 健康檢查 |

前端主要使用 `localStorage` 保存：

- `currentUser`
- `chatSessionId`
- `language`
- 自訂背景圖片資料

## 快速啟動

需要 Node.js 16 或以上。

```bash
npm install
npm start
```

開發時可以用：

```bash
npm run dev
```

預設網址：

```text
http://localhost:3000
```

Windows 上也有 `restart.bat`，會殺掉所有 `node.exe` 後重新 `npm start`。這很方便，但會影響同一台機器上其他 Node 程序，使用前要小心。

## npm scripts

| 指令 | 用途 |
| --- | --- |
| `npm start` | `node server.js` |
| `npm run dev` | `nodemon server.js` |
| `npm run build` | 只輸出 `Build completed`，沒有真正 build |
| `npm run vercel-build` | Vercel 用，執行 `npm install` |
| `npm run test-question-bank` | 檢查父目錄的 `T1_Q&A.txt` 至 `T10_Q&A.txt` |
| `npm run import-questions` | 解析並匯入題庫到 Supabase |
| `npm run parse-questions` | 把 parser 結果輸出成 JSON |

目前沒有真正的 `npm test` 或 lint script。

## 環境變數

`.env` 需要放在專案根目錄。不要提交真實 secret。

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
FASTGPT_API_KEY=
FASTGPT_API_BASE_URL=https://maas.eduhk.hk/api
PORT=3000
NODE_ENV=development
SESSION_SECRET=
```

重點：

- `SUPABASE_SERVICE_KEY` 很重要。很多寫入、後台、建立用戶、出題資料操作會需要 service role 繞過 RLS。
- `FASTGPT_API_KEY` 與 `FASTGPT_API_BASE_URL` 用於聊天與 AI 出題。
- `SESSION_SECRET` 目前未大量使用，但保留在環境設定內。

## 資料庫設定

資料庫使用 Supabase。新環境建議按以下順序在 Supabase SQL Editor 執行：

1. `database/supabase-schema.sql`
2. `database/update-question-bank-schema.sql`
3. `database/teacher-questions-schema.sql`
4. 視需要執行 `database/init-concepts.sql`
5. 視需要執行 `database/add-english-concepts.sql`

主要資料表：

| 表 | 用途 |
| --- | --- |
| `users` | 系統用戶。普通用戶目前只有 username，沒有真正密碼驗證 |
| `chat_sessions` | 聊天 session |
| `messages` | 使用者與 AI 訊息 |
| `learning_progress` | 概念掌握度與練習進度 |
| `statistical_concepts` | 統計概念 |
| `practice_questions` | AI 題與固定題庫題 |
| `user_answers` | 學生答題紀錄 |
| `common_issues` | 常見錯誤模式 |
| `teacher_questions` | 老師建立的題目 |

`update-question-bank-schema.sql` 會為 `practice_questions` 加上：

- `topic_number`
- `topic_name`
- `sub_topic`
- `question_number`
- `source`

也會建立：

- `question_bank_stats` view
- `get_questions_by_topic`
- `get_topic_overview`
- `get_random_practice_questions`

部分舊 SQL 註解或舊中文資料看起來有編碼問題，但 schema 結構本身是目前程式依賴的重點。

## 題庫匯入流程

固定題庫 parser 預期題庫文字檔放在「專案上一層目錄」，檔名如下：

```text
T1_Q&A.txt
T2_Q&A.txt
...
T10_Q&A.txt
```

檢查題庫檔案與 parser：

```bash
npm run test-question-bank
```

匯入 Supabase：

```bash
npm run import-questions
```

已實作 parser 的 topic：

- T1 Data Types and Measurement Scales
- T2 Descriptive Statistics
- T3 Normal Distribution and Z-scores
- T5 One Sample T-Test
- T6 Paired Sample T-Test
- T7 Independent Sample T-Test
- T9 Correlation and Regression
- T10 Chi-Square Test

T4 Sampling Distribution 和 T8 Sample Size Calculation 有 topic definition，但目前 parser 會顯示未實作。接手者如果要完整 10 個 topic，需要補 `utils/questionBankParser.js`。

## AI 與 Prompt

聊天頁的 AI 回覆走：

```text
POST /api/chat/message
```

後端會把最近聊天歷史轉成 FastGPT chat completions 格式，送到：

```text
${FASTGPT_API_BASE_URL}/v1/chat/completions
```

重要：聊天導師的 system prompt 目前不是由 app code 注入，而是在 FastGPT 平台設定。`prompts/chat-system-prompt.md` 是版本控管與交接文件，修改後要手動同步到 FastGPT 平台。

目前 prompt 核心規則：

- 用蘇格拉底式引導
- 每次只問一個問題
- 不直接給答案
- 先鼓勵學生
- 回覆要短
- 根據學生語言用中文或英文回覆
- APA reporting 要符合格式

AI 練習題則在 `routes/practice.js` 內建立 prompt 並呼叫 FastGPT。該檔也有後端計算校驗邏輯，例如描述統計、t-test、correlation 等，會嘗試用後端重新計算並修正 AI 題目的部分數值或選項。

## API 總覽

### Chat

| Method | Path | 用途 |
| --- | --- | --- |
| `POST` | `/api/chat/session` | 建立聊天 session |
| `POST` | `/api/chat/message` | 發送訊息並取得 AI 回覆 |
| `GET` | `/api/chat/history/:sessionId` | 取得聊天歷史 |
| `POST` | `/api/chat/session/:sessionId/end` | 結束 session |
| `GET` | `/api/chat/concepts` | 取得統計概念 |
| `GET` | `/api/chat/practice/:concept` | 依概念取得練習題 |

### Users

| Method | Path | 用途 |
| --- | --- | --- |
| `POST` | `/api/users/register` | 建立普通用戶 |
| `POST` | `/api/users/login` | 登入普通用戶或 admin |
| `GET` | `/api/users/:userId` | 取得用戶 |
| `PUT` | `/api/users/:userId` | 更新用戶 |
| `GET` | `/api/users/:userId/progress` | 取得學習進度 |
| `POST` | `/api/users/:userId/progress` | 更新學習進度 |
| `GET` | `/api/users/:userId/sessions` | 取得用戶 sessions |
| `DELETE` | `/api/users/:userId` | 刪除用戶 |

### Practice

| Method | Path | 用途 |
| --- | --- | --- |
| `POST` | `/api/practice/generate` | AI 生成新題 |
| `GET` | `/api/practice/questions` | 查詢題目 |
| `GET` | `/api/practice/question/:questionId` | 取得單題 |
| `POST` | `/api/practice/submit` | 提交 AI / 題庫題答案 |
| `GET` | `/api/practice/concepts` | 取得可用概念 |
| `GET` | `/api/practice/user-progress/:userId` | 取得練習進度 |
| `GET` | `/api/practice/adaptive-recommendation` | 取得自適應練習建議 |
| `POST` | `/api/practice/generate-adaptive` | 生成自適應題目 |

### Teacher Questions

這些 route 寫在 `routes/practice.js` 與 `routes/admin.js`。

學生端：

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/practice/teacher-questions/list` | 列出老師題 |
| `GET` | `/api/practice/teacher-questions/count` | 題目數量 |
| `GET` | `/api/practice/teacher-questions/:questionId` | 取得老師題 |
| `GET` | `/api/practice/teacher-questions/random` | 隨機老師題 |
| `POST` | `/api/practice/teacher-questions/submit` | 提交老師題答案，開放題會用 AI 評分 |

管理端：

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/admin/teacher-questions` | 管理題目列表 |
| `GET` | `/api/admin/teacher-questions/:questionId` | 取得單題 |
| `POST` | `/api/admin/teacher-questions` | 新增老師題 |
| `PUT` | `/api/admin/teacher-questions/:questionId` | 更新老師題 |
| `DELETE` | `/api/admin/teacher-questions/:questionId` | 刪除老師題 |
| `PATCH` | `/api/admin/teacher-questions/:questionId/toggle` | 啟用/停用 |
| `GET` | `/api/admin/teacher-questions/:questionId/stats` | 單題統計 |
| `GET` | `/api/admin/teacher-questions-stats` | 老師題整體統計 |

### Question Bank

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/question-bank/topics` | 取得 topic overview |
| `GET` | `/api/question-bank/topic/:topicNumber` | 依 topic 查題 |
| `GET` | `/api/question-bank/question/:questionId` | 取得單題 |
| `GET` | `/api/question-bank/practice-set` | 產生混合練習 |
| `GET` | `/api/question-bank/stats` | 題庫統計 |
| `POST` | `/api/question-bank/validate-answer` | 驗答案，不寫入資料庫 |

### Analytics

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | 系統總覽 |
| `GET` | `/api/analytics/common-issues` | 常見錯誤 |
| `GET` | `/api/analytics/learning-progress` | 學習進度 |
| `GET` | `/api/analytics/user-behavior` | 用戶行為 |
| `GET` | `/api/analytics/concept-mastery-ranking` | 概念掌握排名 |
| `GET` | `/api/analytics/export-report/:userId` | 匯出個人報告 |

### Admin

管理端 API 需要 header：

```text
X-Admin-Auth: admin-admin123
```

主要 endpoints：

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/admin/users` | 用戶列表 |
| `GET` | `/api/admin/users/:userId/details` | 用戶詳情 |
| `GET` | `/api/admin/stats/overview` | 後台總覽 |
| `GET` | `/api/admin/stats/popular-concepts` | 熱門概念 |
| `GET` | `/api/admin/sessions/:sessionId/messages` | session 訊息 |
| `GET` | `/api/admin/users/:userId/export-chats` | 匯出單一用戶聊天 |
| `GET` | `/api/admin/export-all-chats` | 匯出所有聊天 |
| `GET` | `/api/admin/export-all-data` | 匯出所有資料 |
| `POST` | `/api/admin/purge-all-data` | 清空本學期資料 |
| `GET` | `/api/admin/practice-records` | 練習紀錄 |
| `GET` | `/api/admin/practice-stats` | 練習統計 |

`purge-all-data` 是破壞性操作。前端有二次確認，但後端仍只靠硬編碼 admin header 保護。

## 管理員登入

目前管理員登入寫死在程式：

```text
username: admin
password: admin123
```

登入後前端會使用：

```text
X-Admin-Auth: admin-admin123
```

這是目前最大安全風險之一。若要正式給更多人使用，應改成真正的身份驗證與權限系統。

## 部署到 Vercel

`vercel.json` 會把：

- `/api/*` 導到 `server.js`
- `/practice.html` 導到 `server.js`
- 靜態資源導到 `public`
- 其他路徑導到 `server.js`

Vercel 需要設定以下環境變數：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
FASTGPT_API_KEY
FASTGPT_API_BASE_URL
SESSION_SECRET
```

`NODE_ENV` 在 `vercel.json` 裡設成 `production`。

## 重要風險與待改進

接手者請優先知道這幾點：

1. 管理員帳密與 admin API header 是硬編碼，不能視為安全。
2. 普通用戶登入只有 username，沒有真正密碼驗證。
3. 很多檔案內的舊中文註解與部分字串是 mojibake，但新近前端文案與 README 已用正常 UTF-8。
4. `routes/practice.js` 非常大，包含 AI 生成、校驗、老師題、自適應練習，後續最好拆分。
5. 沒有自動化測試、沒有 lint、沒有 CI。
6. AI 出題依賴 FastGPT 回傳 JSON。程式有做解析與部分修正，但仍要人工抽查題目品質。
7. 題庫 parser 不完整，T4 和 T8 尚未實作。
8. 前端是大型 inline HTML/JS，改動時容易牽連大量全域函式。
9. `purge-all-data` 可以清空資料，部署前要重新設計權限或至少更換 admin secret。
10. Supabase RLS 有啟用，但後端常用 service key 操作資料，所以 server 端 API 權限設計很重要。

## 常見維護工作

### 更新聊天導師 prompt

1. 修改 `prompts/chat-system-prompt.md`
2. 到 FastGPT 平台同步 system prompt
3. 用中英文問題測試
4. 確認 AI 仍然每次只問一個引導問題
5. 提交 prompt 檔案變更

### 新增老師題

1. 用 admin 登入 `/admin.html`
2. 在老師題管理區新增題目
3. 確認 `concept_name`、`question_type`、`difficulty_level` 正確
4. 到 `/practice.html` 選 Teacher Questions 測試

### 重新匯入固定題庫

1. 確認 Supabase 已執行 `update-question-bank-schema.sql`
2. 把 `T1_Q&A.txt` 至 `T10_Q&A.txt` 放在專案上一層目錄
3. 執行 `npm run test-question-bank`
4. 執行 `npm run import-questions`
5. 到 `/question-bank.html` 測試 topic 是否載入

### 檢查服務是否正常

```bash
npm start
```

打開：

```text
http://localhost:3000/api/health
```

應該看到：

```json
{
  "status": "OK",
  "timestamp": "...",
  "version": "1.0.0"
}
```

## Troubleshooting

### 題庫頁沒有 topic

通常是以下其中一個原因：

- 沒有執行 `update-question-bank-schema.sql`
- `practice_questions` 沒有 `source = 'question_bank'` 的資料
- `get_topic_overview()` RPC 沒建好
- 題庫文字檔沒有成功匯入

### AI 聊天沒有回覆

檢查：

- `FASTGPT_API_KEY`
- `FASTGPT_API_BASE_URL`
- FastGPT 平台是否可用
- 瀏覽器 console 與 server log
- Supabase 是否能建立 session 與 message

### 註冊或登入失敗

檢查：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `users` table 是否存在
- RLS 是否阻擋匿名 client 寫入；目前註冊依賴 `db.admin`

### 管理員頁無權訪問

前端會檢查 `localStorage.currentUser.role === 'admin'`。請先在首頁用：

```text
admin / admin123
```

登入。API 端還會檢查 header `X-Admin-Auth: admin-admin123`。

### AI 練習題 JSON 解析失敗

`routes/practice.js` 會嘗試從 AI 回覆中抽 JSON。若常失敗：

- 檢查生成 prompt 是否要求 valid JSON
- 降低模型自由度
- 檢查 FastGPT 是否替換或包裝了回覆格式
- 看 server log 中的原始 AI 回覆

## 接手建議

第一天建議先做：

1. 本地 `npm install`、`npm start`
2. 打開 `/api/health`
3. 用普通 username 註冊/登入一次
4. 測試 `/` 聊天
5. 測試 `/practice.html` AI Generated
6. 用 admin/admin123 登入 `/admin.html`
7. 看 Supabase 內 `users`、`chat_sessions`、`messages`、`practice_questions`、`user_answers`
8. 檢查 Vercel 環境變數是否與本地一致

如果要做下一輪重構，優先順序建議：

1. 換掉 hardcoded admin auth
2. 為普通用戶加入真正身份驗證
3. 拆分 `routes/practice.js`
4. 補最小 API 測試
5. 補完整題庫 parser，尤其 T4、T8
6. 把前端大型 inline script 拆成可維護模組
