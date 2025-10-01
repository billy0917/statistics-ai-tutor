const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 導入路由
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中間件 - 放寬 CSP 限制以支援開發
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://polyfill.io"],
            scriptSrcAttr: ["'unsafe-inline'"], // 允許內聯事件處理器
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https://images.pexels.com"],
            connectSrc: ["'self'", process.env.FASTGPT_API_BASE_URL || "https://maas.eduhk.hk", process.env.SUPABASE_URL || "*"]
        }
    }
}));

// CORS 配置
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.vercel.app'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 100, // 每個 IP 最多 100 個請求
    message: {
        error: '請求過於頻繁，請稍後再試'
    }
});
app.use('/api/', limiter);

// 解析 JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務
app.use(express.static('public'));

// 會話 ID 中間件
app.use((req, res, next) => {
    if (!req.headers['x-session-id']) {
        req.sessionId = uuidv4();
        res.setHeader('X-Session-ID', req.sessionId);
    } else {
        req.sessionId = req.headers['x-session-id'];
    }
    next();
});

// API 路由
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 主頁路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/statistics-ai-tutor.html');
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ error: '找不到請求的資源' });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    
    // 不要在生產環境中洩露錯誤詳情
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : '服務器內部錯誤',
        ...(isDevelopment && { stack: err.stack })
    });
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 統計學 AI 教學助理服務器運行在 http://localhost:${PORT}`);
    console.log(`📊 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Supabase: ${process.env.SUPABASE_URL ? '已連接' : '未配置'}`);
});

module.exports = app;

