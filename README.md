# 統計學 AI 教學助理

一個基於 AI 的互動式統計學習平台，專為 PSY2032 統計方法課程設計。

## 🎯 項目特色

### 核心功能
- **智能對話系統**：基於 FastGPT API 的專業統計學問答
- **學習進度追蹤**：記錄用戶學習歷程和概念掌握度
- **個性化學習**：根據用戶表現調整難度和內容
- **統計概念識別**：自動檢測和標記對話中的統計概念
- **數學公式渲染**：支援 LaTeX 格式的統計公式顯示

### 技術架構
- **前端**：HTML5 + CSS3 + JavaScript + Tailwind CSS
- **後端**：Node.js + Express.js
- **數據庫**：Supabase (PostgreSQL)
- **部署**：Vercel
- **AI API**：FastGPT

## 🚀 快速開始

### 1. 環境準備

確保您的系統已安裝：
- Node.js (v16 或更高版本)
- npm 或 yarn

### 2. 項目設置

```bash
# 克隆項目
git clone <your-repo-url>
cd statistics-ai-tutor

# 安裝依賴
npm install

# 複製環境變數文件
cp env.example .env
```

### 3. 配置環境變數

編輯 `.env` 文件，填入以下配置：

```env
# Supabase 配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# FastGPT API 配置
FASTGPT_API_KEY=your_fastgpt_api_key
FASTGPT_API_BASE_URL=https://maas.eduhk.hk/api

# 應用配置
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret_key_here
```

### 4. 數據庫設置

1. 在 [Supabase](https://supabase.com) 創建新項目
2. 在 Supabase SQL Editor 中執行 `database/supabase-schema.sql`
3. 複製項目 URL 和 API 密鑰到 `.env` 文件

### 5. 啟動應用

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

應用將在 `http://localhost:3000` 啟動。

## 📊 數據庫結構

### 核心表格

1. **users** - 用戶信息
2. **chat_sessions** - 對話會話
3. **messages** - 訊息記錄
4. **learning_progress** - 學習進度
5. **statistical_concepts** - 統計概念定義
6. **practice_questions** - 練習題庫
7. **common_issues** - 常見問題分析

### 功能特性

- **Row Level Security (RLS)**：確保用戶只能訪問自己的數據
- **自動索引**：優化查詢性能
- **數據完整性**：外鍵約束和檢查約束
- **實時更新**：支援 Supabase 實時功能

## 🔧 API 端點

### 用戶管理
- `POST /api/users/register` - 用戶註冊
- `POST /api/users/login` - 用戶登入
- `GET /api/users/:userId` - 獲取用戶資料
- `GET /api/users/:userId/progress` - 獲取學習進度

### 聊天功能
- `POST /api/chat/session` - 創建會話
- `POST /api/chat/message` - 發送訊息
- `GET /api/chat/history/:sessionId` - 獲取會話歷史
- `GET /api/chat/concepts` - 獲取統計概念列表

### 分析功能
- `GET /api/analytics/overview` - 整體分析數據
- `GET /api/analytics/common-issues` - 常見問題分析
- `GET /api/analytics/learning-progress` - 學習進度分析
- `GET /api/analytics/export-report/:userId` - 導出學習報告

## 🎨 前端功能

### 用戶界面
- **響應式設計**：支援桌面和移動設備
- **暗色主題**：護眼的深色配色方案
- **動畫效果**：流暢的頁面載入和互動動畫
- **玻璃擬態**：現代化的視覺效果

### 互動功能
- **實時聊天**：即時的 AI 對話體驗
- **概念標籤**：自動顯示檢測到的統計概念
- **數學公式**：MathJax 渲染的數學表達式
- **程式碼高亮**：支援多種程式語言語法高亮

## 📈 學習追蹤功能

### 進度記錄
- **概念掌握度**：0.0 到 1.0 的掌握程度評分
- **練習次數**：記錄每個概念的練習頻率
- **正確率**：追蹤答題準確性
- **學習時間**：記錄學習活動時間

### 分析報告
- **個人進度**：詳細的學習進度報告
- **概念排名**：掌握度排行榜
- **常見錯誤**：錯誤模式分析
- **學習建議**：個性化學習建議

## 🚀 部署到 Vercel

### 自動部署

1. 將代碼推送到 GitHub
2. 在 Vercel 中連接 GitHub 倉庫
3. 配置環境變數
4. 部署完成

### 手動部署

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署
vercel --prod
```

### 環境變數配置

在 Vercel 控制台中設置以下環境變數：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `FASTGPT_API_KEY`
- `FASTGPT_API_BASE_URL`
- `SESSION_SECRET`

## 🔒 安全考慮

### 數據安全
- **Row Level Security**：數據庫級別的訪問控制
- **API 速率限制**：防止 API 濫用
- **輸入驗證**：防止 XSS 和注入攻擊
- **HTTPS 強制**：生產環境強制使用 HTTPS

### 隱私保護
- **最小化數據收集**：只收集必要的學習數據
- **用戶控制**：用戶可以刪除自己的數據
- **匿名選項**：支援訪客模式使用

## 🛠 開發指南

### 項目結構
```
├── server.js              # 主服務器文件
├── package.json           # 項目配置
├── vercel.json           # Vercel 部署配置
├── config/
│   └── supabase.js       # Supabase 配置和數據庫服務
├── routes/
│   ├── chat.js           # 聊天相關路由
│   ├── users.js          # 用戶管理路由
│   └── analytics.js      # 分析功能路由
├── database/
│   └── supabase-schema.sql # 數據庫結構
└── statistics-ai-tutor.html # 前端頁面
```

### 開發流程
1. 創建功能分支
2. 實現功能並測試
3. 提交代碼審查
4. 合併到主分支
5. 自動部署到生產環境

### 測試
```bash
# 運行測試（待實現）
npm test

# 代碼檢查
npm run lint
```

## 📝 更新日誌

### v1.0.0 (2024-10-01)
- ✨ 初始版本發布
- 🎯 基本聊天功能
- 📊 學習進度追蹤
- 🔐 用戶管理系統
- 📈 分析功能
- 🚀 Vercel 部署支援

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 提交規範
- `feat:` 新功能
- `fix:` 修復 bug
- `docs:` 文檔更新
- `style:` 代碼格式調整
- `refactor:` 代碼重構
- `test:` 測試相關
- `chore:` 其他雜項

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 📞 聯繫方式

如有問題或建議，請聯繫項目團隊。

---

**統計學 AI 教學助理** - 讓統計學習更智能、更有趣！ 🎓✨

