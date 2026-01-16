// 國際化語言包
const i18n = {
    'zh-TW': {
        // 通用
        common: {
            loading: '載入中...',
            submit: '提交',
            cancel: '取消',
            confirm: '確認',
            back: '返回',
            next: '下一步',
            previous: '上一步',
            save: '保存',
            delete: '刪除',
            edit: '編輯',
            close: '關閉',
            yes: '是',
            no: '否',
            ok: '確定',
            error: '錯誤',
            success: '成功',
            warning: '警告',
            info: '提示',
            disclaimer: '⚠️ 免責聲明：本系統使用 AI 技術生成內容，答案未必完全正確，請謹慎判斷並以教材及老師教學內容為準。',
            newChatTip: '若 AI 出現問題，請按 New Chat 重新開始對話。',
            setBackground: '🖼️ 更換背景',
            feedback: '📝 問題反饋'
        },

        // 主聊天頁面
        chat: {
            title: 'AI 教學助理',
            subtitle: '您的專業統計學習夥伴，隨時為您解答統計學相關問題',
            navAiChat: '💬 AI 對話',
            navQuestionBank: '📖 題庫練習',
            navAiPractice: '🎯 AI 生成練習',
            navAdmin: '🔐 管理員控制台',
            newBadge: 'New',
            welcomeTitle: '歡迎使用統計學 AI 教學助理！',
            welcomeMessage: '我可以幫助您解答統計學相關的問題，包括描述統計、推論統計、假設檢定等主題。',
            loginTitle: '🔐 登入以追蹤學習進度',
            usernamePlaceholder: '輸入用戶名',
            passwordPlaceholder: '輸入密碼',
            loginBtn: '登入',
            registerBtn: '註冊',
            guestBtn: '以訪客身份繼續',
            exampleTitle: '點擊下方範例開始對話',
            example1: '什麼是標準差？如何計算？',
            example2: '請解釋中央極限定理',
            example3: '如何進行t檢定？',
            example4: '什麼時候使用卡方檢定？',
            inputPlaceholder: '請輸入您的統計學問題...',
            sendBtn: '發送',
            thinkingMsg: 'AI 正在思考中',
            userStatus: '已登入',
            logoutBtn: '登出',
            newChatBtn: '🔄 新對話',
            loggedInStatus: '已登入 • 學習進度已追蹤',
            footer: '由 AI 技術驅動 • 專業統計學教學助理'
        },

        // 練習頁面
        practice: {
            title: '統計學練習系統',
            subtitle: '選擇概念和難度，使用 AI 生成個性化練習題！',
            newFeature: '新功能：',
            newFeatureText: '想要系統化練習？試試',
            questionBankLink: '題庫練習系統',
            questionBankDesc: '包含 Topic 1-10 的 60+ 道題目！',
            backToChat: '返回聊天',
            userTracked: '學習進度已追蹤',
            loggedIn: '✓ 已登入',
            needLogin: '需要登入才能使用練習系統',
            needLoginDesc: '請先在主頁面登入，以便追蹤您的學習進度',
            goLogin: '前往登入 →',
            conceptLabel: '統計概念',
            conceptPlaceholder: '選擇概念...',
            conceptDescriptive: '描述統計',
            conceptStdDev: '標準差',
            conceptOneSampleT: '單樣本t檢定',
            conceptIndependentT: '獨立樣本t檢定',
            conceptPairedT: '配對樣本t檢定',
            conceptCorrelation: '相關分析',
            conceptRegression: '簡單迴歸',
            conceptChiSquare: '卡方檢定',
            difficultyLabel: '難度級別',
            difficultyBasic: '基礎 (Basic)',
            difficultyMedium: '中級 (Medium)',
            difficultyAdvanced: '進階 (Advanced)',
            typeLabel: '題型',
            typeMultipleChoice: '選擇題 (MC)',
            typeCaseStudy: '案例分析',
            typeCalculation: '計算題',
            typeInterpretation: '解釋題',
            generateBtn: '🎯 生成新題目',
            loadBtn: '📖 從題庫載入',
            statsTitle: '練習統計',
            totalCount: '總題數',
            correctCount: '答對',
            incorrectCount: '答錯',
            accuracy: '正確率',
            questionTypeLabel: '選擇題 (MC)',
            skipBtn: '跳過 →',
            answerPlaceholder: '請輸入你的答案...',
            submitBtn: '提交答案',
            hintBtn: '💡 提示',
            explanationTitle: '📖 詳細解釋',
            nextBtn: '下一題 →',
            tryAgainBtn: '🔄 再試一次',
            loadingMsg: '正在生成題目...',
            correctFeedback: '回答正確！',
            incorrectFeedback: '回答錯誤',
            correctAnswerLabel: '正確答案：'
        },

        // 題庫頁面
        questionBank: {
            title: '題庫練習系統',
            subtitle: '從 Topic 1-10 選擇主題，開始你的系統化練習！',
            aiPractice: 'AI 生成練習',
            backToChat: '返回聊天',
            userTracked: '學習進度已追蹤',
            loggedIn: '✓ 已登入',
            selectTopicTitle: '選擇主題',
            loadingTopics: '載入主題中...',
            practiceMode: '練習模式',
            difficultyLabel: '難度級別',
            allDifficulty: '全部難度',
            difficultyBasic: '基礎 (Basic)',
            difficultyMedium: '中級 (Medium)',
            difficultyAdvanced: '進階 (Advanced)',
            typeLabel: '題型',
            allTypes: '全部題型',
            typeMultipleChoice: '選擇題 (MC)',
            typeCalculation: '計算題',
            typeInterpretation: '解釋題',
            typeCaseStudy: '案例分析',
            countLabel: '練習題數',
            count5: '5 題',
            count10: '10 題',
            count15: '15 題',
            count20: '20 題',
            countAll: '全部題目',
            startPractice: '🚀 開始練習',
            randomPractice: '🎲 隨機練習',
            changeTopic: '← 更換主題',
            progressTitle: '練習進度',
            completed: '已完成',
            correct: '答對',
            incorrect: '答錯',
            accuracy: '正確率',
            remaining: '剩餘',
            skipBtn: '跳過 →',
            answerPlaceholder: '請輸入你的答案...',
            submitBtn: '提交答案',
            explanationTitle: '📖 詳細解釋',
            nextBtn: '下一題 →',
            tryAgainBtn: '🔄 再試一次',
            summaryTitle: '練習完成！',
            summarySubtitle: '恭喜你完成了這次練習',
            totalQuestions: '總題數',
            correctAnswers: '答對題數',
            reviewBtn: '📝 複習錯題',
            continueBtn: '🔄 繼續練習',
            changeTopicBtn: '📚 更換主題',
            topicQuestions: '題',
            topicConcepts: '概念',
            basicLabel: '基礎',
            mediumLabel: '中級',
            advancedLabel: '進階',
            correctFeedback: '回答正確！',
            incorrectFeedback: '回答錯誤',
            correctAnswerLabel: '正確答案：'
        },

        // 管理員頁面
        admin: {
            adminTitle: '管理員控制台',
            adminSubtitle: '管理所有用戶的學習進度和系統統計',
            logoutBtn: '登出',
            backToHome: '返回首頁',
            systemOverview: '📊 系統總覽',
            totalUsersLabel: '總用戶數',
            totalQuestionsLabel: '總題目數',
            totalAnswersLabel: '總答題數',
            activeTodayLabel: '今日活躍',
            userListTitle: '👥 用戶列表',
            refreshBtn: '🔄 刷新',
            searchPlaceholder: '搜索用戶名...',
            loadingUsers: '載入用戶中...',
            noUsers: '暫無用戶數據',
            viewDetails: '查看詳情 →',
            practiceCountLabel: '練習題數',
            accuracyLabel: '正確率',
            lastLogin: '最後登入',
            userDetailsTitle: '用戶詳情',
            usernameLabel: '用戶名',
            userIdLabel: '用戶ID',
            createdAtLabel: '註冊時間',
            lastLoginLabel: '最後登入',
            learningProgressTitle: '📚 學習進度',
            conceptNameLabel: '概念',
            masteryLevelLabel: '掌握度',
            practiceCountLabel2: '練習次數',
            correctAnswersLabel: '正確答題數',
            lastPracticedLabel: '最後練習',
            noProgressData: '暫無學習進度數據',
            chatSessionsTitle: '💬 聊天記錄',
            sessionIdLabel: '會話ID',
            startTimeLabel: '開始時間',
            messageCountLabel: '消息數',
            sessionSummaryLabel: '會話摘要',
            noChatSessions: '暫無聊天記錄',
            practiceSessionsTitle: '🎯 練習記錄',
            totalQuestionsLabel2: '總題數',
            correctAnswersLabel2: '正確數',
            timeSpentLabel: '用時',
            seconds: '秒',
            noPracticeSessions: '暫無練習記錄',
            totalConceptsTracked: '追蹤概念數',
            learningConcepts: '學習概念',
            masteryLabel: '掌握度',
            // AI Practice 統計和記錄
            practiceStatsTitle: '📈 AI Practice 統計',
            conceptStatsTitle: '按概念統計',
            difficultyStatsTitle: '按難度統計',
            typeStatsTitle: '按題型統計',
            practiceRecordsTitle: '✍️ AI Practice 答題記錄',
            allConcepts: '所有概念',
            allDifficulties: '所有難度',
            basicLevel: '基礎',
            mediumLevel: '中級',
            advancedLevel: '進階',
            allResults: '所有結果',
            correctOnly: '僅正確',
            incorrectOnly: '僅錯誤',
            searchUserPlaceholder: '搜索用戶...',
            loadingRecords: '載入記錄中...',
            noRecords: '暫無答題記錄',
            prevPage: '上一頁',
            nextPage: '下一頁'
        }
    },

    'en': {
        // Common
        common: {
            loading: 'Loading...',
            submit: 'Submit',
            cancel: 'Cancel',
            confirm: 'Confirm',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            close: 'Close',
            yes: 'Yes',
            no: 'No',
            ok: 'OK',
            error: 'Error',
            success: 'Success',
            warning: 'Warning',
            info: 'Info',
            disclaimer: '⚠️ Disclaimer: This system uses AI technology to generate content. Answers may not be entirely accurate. Please use your judgment and refer to your course materials and instructor\'s guidance.',
            newChatTip: 'If the AI encounters issues, please click New Chat to restart the conversation.',
            setBackground: '🖼️ Change Background',
            feedback: '📝 Feedback'
        },

        // Main Chat Page
        chat: {
            title: 'AI Teaching Assistant',
            subtitle: 'Your Professional Statistics Learning Partner, Ready to Answer Your Questions',
            navAiChat: '💬 AI Chat',
            navQuestionBank: '📖 Question Bank',
            navAiPractice: '🎯 AI Practice',
            navAdmin: '🔐 Admin Dashboard',
            newBadge: 'New',
            welcomeTitle: 'Welcome to Statistics AI Teaching Assistant!',
            welcomeMessage: 'I can help you with statistics questions, including descriptive statistics, inferential statistics, hypothesis testing, and more.',
            loginTitle: '🔐 Login to Track Your Progress',
            usernamePlaceholder: 'Enter username',
            passwordPlaceholder: 'Enter password',
            loginBtn: 'Login',
            registerBtn: 'Register',
            guestBtn: 'Continue as Guest',
            exampleTitle: 'Click examples below to start',
            example1: 'What is standard deviation? How to calculate it?',
            example2: 'Explain the Central Limit Theorem',
            example3: 'How to perform a t-test?',
            example4: 'When to use Chi-square test?',
            inputPlaceholder: 'Enter your statistics question...',
            sendBtn: 'Send',
            thinkingMsg: 'AI is thinking',
            userStatus: 'Logged in',
            logoutBtn: 'Logout',
            newChatBtn: '🔄 New Chat',
            loggedInStatus: 'Logged in • Progress tracked',
            footer: 'Powered by AI • Professional Statistics Teaching Assistant'
        },

        // Practice Page
        practice: {
            title: 'Statistics Practice System',
            subtitle: 'Select concept and difficulty to generate personalized practice questions!',
            newFeature: 'New Feature:',
            newFeatureText: 'Want systematic practice? Try',
            questionBankLink: 'Question Bank System',
            questionBankDesc: 'with 60+ questions from Topic 1-10!',
            backToChat: 'Back to Chat',
            userTracked: 'Progress tracked',
            loggedIn: '✓ Logged in',
            needLogin: 'Login Required to Use Practice System',
            needLoginDesc: 'Please login on the main page to track your learning progress',
            goLogin: 'Go to Login →',
            conceptLabel: 'Statistical Concept',
            conceptPlaceholder: 'Select concept...',
            conceptDescriptive: 'Descriptive Statistics',
            conceptStdDev: 'Standard Deviation',
            conceptSampleSize: 'Sample Size',
            conceptOneSampleT: 'One-Sample t-Test',
            conceptIndependentT: 'Independent t-Test',
            conceptPairedT: 'Paired t-Test',
            conceptCorrelation: 'Correlation Analysis',
            conceptRegression: 'Simple Regression',
            conceptChiSquare: 'Chi-Square Test',
            difficultyLabel: 'Difficulty Level',
            difficultyBasic: 'Basic',
            difficultyMedium: 'Medium',
            difficultyAdvanced: 'Advanced',
            typeLabel: 'Question Type',
            typeMultipleChoice: 'Multiple Choice (MC)',
            typeCaseStudy: 'Case Study',
            typeCalculation: 'Calculation',
            typeInterpretation: 'Interpretation',
            generateBtn: '🎯 Generate Question',
            loadBtn: '📖 Load from Bank',
            statsTitle: 'Practice Statistics',
            totalCount: 'Total',
            correctCount: 'Correct',
            incorrectCount: 'Incorrect',
            accuracy: 'Accuracy',
            questionTypeLabel: 'Multiple Choice',
            skipBtn: 'Skip →',
            answerPlaceholder: 'Enter your answer...',
            submitBtn: 'Submit Answer',
            hintBtn: '💡 Hint',
            explanationTitle: '📖 Detailed Explanation',
            nextBtn: 'Next Question →',
            tryAgainBtn: '🔄 Try Again',
            loadingMsg: 'Generating question...',
            correctFeedback: 'Correct!',
            incorrectFeedback: 'Incorrect',
            correctAnswerLabel: 'Correct answer: '
        },

        // Question Bank Page
        questionBank: {
            title: 'Question Bank Practice',
            subtitle: 'Choose from Topic 1-10 to start systematic practice!',
            aiPractice: 'AI Practice',
            backToChat: 'Back to Chat',
            userTracked: 'Progress tracked',
            loggedIn: '✓ Logged in',
            selectTopicTitle: 'Select Topic',
            loadingTopics: 'Loading topics...',
            practiceMode: 'Practice Mode',
            difficultyLabel: 'Difficulty Level',
            allDifficulty: 'All Levels',
            difficultyBasic: 'Basic',
            difficultyMedium: 'Medium',
            difficultyAdvanced: 'Advanced',
            typeLabel: 'Question Type',
            allTypes: 'All Types',
            typeMultipleChoice: 'Multiple Choice (MC)',
            typeCalculation: 'Calculation',
            typeInterpretation: 'Interpretation',
            typeCaseStudy: 'Case Study',
            countLabel: 'Number of Questions',
            count5: '5 questions',
            count10: '10 questions',
            count15: '15 questions',
            count20: '20 questions',
            countAll: 'All questions',
            startPractice: '🚀 Start Practice',
            randomPractice: '🎲 Random Practice',
            changeTopic: '← Change Topic',
            progressTitle: 'Practice Progress',
            completed: 'Completed',
            correct: 'Correct',
            incorrect: 'Incorrect',
            accuracy: 'Accuracy',
            remaining: 'Remaining',
            skipBtn: 'Skip →',
            answerPlaceholder: 'Enter your answer...',
            submitBtn: 'Submit Answer',
            explanationTitle: '📖 Detailed Explanation',
            nextBtn: 'Next Question →',
            tryAgainBtn: '🔄 Try Again',
            summaryTitle: 'Practice Complete!',
            summarySubtitle: 'Congratulations on completing this practice session',
            totalQuestions: 'Total Questions',
            correctAnswers: 'Correct Answers',
            reviewBtn: '📝 Review Mistakes',
            continueBtn: '🔄 Continue Practice',
            changeTopicBtn: '📚 Change Topic',
            topicQuestions: 'Q',
            topicConcepts: 'Concepts',
            basicLabel: 'Basic',
            mediumLabel: 'Medium',
            advancedLabel: 'Advanced',
            correctFeedback: 'Correct!',
            incorrectFeedback: 'Incorrect',
            correctAnswerLabel: 'Correct answer: '
        },

        // Admin Page
        admin: {
            adminTitle: 'Admin Dashboard',
            adminSubtitle: 'Manage all users and system statistics',
            logoutBtn: 'Logout',
            backToHome: 'Back to Home',
            systemOverview: '📊 System Overview',
            totalUsersLabel: 'Total Users',
            totalQuestionsLabel: 'Total Questions',
            totalAnswersLabel: 'Total Answers',
            activeTodayLabel: 'Active Today',
            userListTitle: '👥 User List',
            refreshBtn: '🔄 Refresh',
            searchPlaceholder: 'Search username...',
            loadingUsers: 'Loading users...',
            noUsers: 'No user data',
            viewDetails: 'View Details →',
            practiceCountLabel: 'Practice Count',
            accuracyLabel: 'Accuracy',
            lastLogin: 'Last Login',
            userDetailsTitle: 'User Details',
            usernameLabel: 'Username',
            userIdLabel: 'User ID',
            createdAtLabel: 'Created At',
            lastLoginLabel: 'Last Login',
            learningProgressTitle: '📚 Learning Progress',
            conceptNameLabel: 'Concept',
            masteryLevelLabel: 'Mastery Level',
            practiceCountLabel2: 'Practice Count',
            correctAnswersLabel: 'Correct Answers',
            lastPracticedLabel: 'Last Practiced',
            noProgressData: 'No learning progress data',
            chatSessionsTitle: '💬 Chat Sessions',
            sessionIdLabel: 'Session ID',
            startTimeLabel: 'Start Time',
            messageCountLabel: 'Messages',
            sessionSummaryLabel: 'Summary',
            noChatSessions: 'No chat sessions',
            practiceSessionsTitle: '🎯 Practice Sessions',
            totalQuestionsLabel2: 'Total Questions',
            correctAnswersLabel2: 'Correct',
            timeSpentLabel: 'Time Spent',
            seconds: 'seconds',
            noPracticeSessions: 'No practice sessions',
            totalConceptsTracked: 'Concepts Tracked',
            learningConcepts: 'Learning Concepts',
            masteryLabel: 'Mastery',
            // AI Practice Stats and Records
            practiceStatsTitle: '📈 AI Practice Statistics',
            conceptStatsTitle: 'By Concept',
            difficultyStatsTitle: 'By Difficulty',
            typeStatsTitle: 'By Question Type',
            practiceRecordsTitle: '✍️ AI Practice Records',
            allConcepts: 'All Concepts',
            allDifficulties: 'All Difficulties',
            basicLevel: 'Basic',
            mediumLevel: 'Medium',
            advancedLevel: 'Advanced',
            allResults: 'All Results',
            correctOnly: 'Correct Only',
            incorrectOnly: 'Incorrect Only',
            searchUserPlaceholder: 'Search user...',
            loadingRecords: 'Loading records...',
            noRecords: 'No practice records',
            prevPage: 'Previous',
            nextPage: 'Next'
        }
    }
};

// 語言管理器
class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
    }

    // 獲取當前語言
    getCurrentLanguage() {
        return this.currentLang;
    }

    // 設置語言
    setLanguage(lang) {
        if (i18n[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            return true;
        }
        return false;
    }

    // 翻譯文本
    t(key, section = 'common') {
        const keys = key.split('.');
        let value = i18n[this.currentLang][section];
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`Translation missing: ${section}.${key} in ${this.currentLang}`);
                return key;
            }
        }
        
        return value;
    }

    // 翻譯元素
    translateElement(element, key, section) {
        const translation = this.t(key, section);
        if (element.placeholder !== undefined && element.tagName === 'INPUT') {
            element.placeholder = translation;
        } else if (element.tagName === 'OPTION') {
            element.textContent = translation;
        } else {
            element.textContent = translation;
        }
    }

    // 翻譯頁面
    translatePage(section) {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            // 處理包含點號的 key（如 common.disclaimer）
            if (key.includes('.')) {
                const parts = key.split('.');
                const targetSection = parts[0];
                const targetKey = parts.slice(1).join('.');
                this.translateElement(element, targetKey, targetSection);
            } else {
                this.translateElement(element, key, section);
            }
        });
    }
}

// 創建全局語言管理器實例
const langManager = new LanguageManager();


