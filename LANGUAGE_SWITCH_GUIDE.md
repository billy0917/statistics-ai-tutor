# 🌐 語言切換功能使用指南

## 功能概述

統計學 AI 教學助理現已支持中英文雙語切換！用戶可以在任何頁面輕鬆切換界面語言。

## 支持的頁面

1. **主聊天頁面** (`statistics-ai-tutor.html`)
   - AI 對話界面
   - 用戶登入/註冊
   - 範例問題
   
2. **練習頁面** (`practice.html`)
   - AI 生成練習題
   - 概念選擇
   - 題型選擇
   - 練習統計

3. **題庫頁面** (`question-bank.html`)
   - 主題選擇
   - 練習模式設定
   - 進度追蹤
   - 完成摘要

## 如何使用

### 切換語言

1. 在任何頁面的右上角找到語言切換按鈕 `🌐`
2. 點擊按鈕在中文（繁體）和英文之間切換
3. 頁面內容將立即更新為所選語言
4. 語言偏好會自動保存到瀏覽器，下次訪問時自動使用

### 語言按鈕顯示

- **中文模式**：顯示 `🌐 中文`
- **英文模式**：顯示 `🌐 English`

## 技術實現

### 核心文件

- **`public/i18n.js`**: 語言包和語言管理器
  - 包含所有中英文翻譯
  - 提供語言切換邏輯
  - 使用 localStorage 保存用戶偏好

### 翻譯覆蓋範圍

#### 主聊天頁面
- 標題和副標題
- 導航按鈕
- 登入/註冊界面
- 範例問題
- 輸入提示
- 狀態信息

#### 練習頁面
- 頁面標題
- 控制面板（概念、難度、題型選擇）
- 統計卡片
- 按鈕文本
- 提示信息

#### 題庫頁面
- 主題選擇界面
- 練習模式設定
- 進度統計
- 題目顯示
- 完成摘要

## 開發者說明

### 添加新翻譯

在 `public/i18n.js` 的語言包中添加新的鍵值對：

```javascript
i18n['zh-TW'].chat.newKey = '新文本';
i18n['en'].chat.newKey = 'New Text';
```

### 在 HTML 中使用

添加 `data-i18n` 屬性到元素：

```html
<button data-i18n="buttonText">按鈕文本</button>
```

對於 placeholder：

```html
<input placeholder="提示文本" data-i18n-placeholder="placeholderKey">
```

### 初始化語言管理器

每個頁面都需要初始化：

```javascript
function initLanguage() {
    const currentLang = langManager.getCurrentLanguage();
    updateLangButton(currentLang);
    langManager.translatePage('sectionName');
    // 添加切換事件
}
```

## 語言支持狀態

- ✅ 繁體中文 (zh-TW) - 完全支持
- ✅ 英文 (en) - 完全支持
- 🔮 未來可擴展其他語言

## 注意事項

1. **題目內容**: AI 生成的題目和解釋內容不會被翻譯，因為這些是動態內容
2. **用戶數據**: 用戶名、答題記錄等個人數據保持原樣
3. **數學公式**: MathJax 渲染的數學公式不受語言切換影響
4. **瀏覽器兼容**: 支持所有現代瀏覽器（Chrome、Firefox、Safari、Edge）

## 常見問題

**Q: 切換語言後，為什麼某些內容沒有改變？**
A: 動態生成的內容（如 AI 回應、題目內容）不會被翻譯。只有界面元素會切換。

**Q: 語言設置會保存嗎？**
A: 是的，語言偏好會保存在瀏覽器的 localStorage 中，下次訪問時自動應用。

**Q: 如何重置語言設置？**
A: 清除瀏覽器的 localStorage 或直接點擊語言切換按鈕即可。

---

**版本**: 1.0.0  
**最後更新**: 2025-11-11  
**維護者**: AI Teaching Assistant Development Team



