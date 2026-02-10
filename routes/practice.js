const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/supabase');
const axios = require('axios');
const router = express.Router();

// FastGPT API 配置
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;
const FASTGPT_API_BASE_URL = process.env.FASTGPT_API_BASE_URL;

// 統計概念定義（英文版本）
const STATISTICAL_CONCEPTS = [
    'Descriptive Statistics',
    'Standard Deviation',
    'Sample Size',
    'One-Sample t-Test',
    'Independent Samples t-Test',
    'Paired Samples t-Test',
    'Correlation Analysis',
    'Simple Regression',
    'Chi-Square Test'
];

// 概念名稱映射（各種變體 -> 標準英文名稱）
const CONCEPT_NAME_MAP = {
    // 英文變體映射
    'descriptive statistics': 'Descriptive Statistics',
    'standard deviation': 'Standard Deviation',
    'sample size': 'Sample Size',
    'sample size determination': 'Sample Size',
    'sample size calculation': 'Sample Size',
    'one sample t test': 'One-Sample t-Test',
    'one-sample t test': 'One-Sample t-Test',
    'one-sample t-test': 'One-Sample t-Test',
    'independent t test': 'Independent Samples t-Test',
    'independent samples t test': 'Independent Samples t-Test',
    'independent samples t-test': 'Independent Samples t-Test',
    'paired t test': 'Paired Samples t-Test',
    'paired samples t test': 'Paired Samples t-Test',
    'paired samples t-test': 'Paired Samples t-Test',
    'correlation': 'Correlation Analysis',
    'correlation analysis': 'Correlation Analysis',
    'simple regression': 'Simple Regression',
    'regression': 'Simple Regression',
    'chi square': 'Chi-Square Test',
    'chi-square': 'Chi-Square Test',
    'chi square test': 'Chi-Square Test',
    'chi-square test': 'Chi-Square Test',
    // 中文映射到英文
    '描述統計': 'Descriptive Statistics',
    '描述统计': 'Descriptive Statistics',
    '標準差': 'Standard Deviation',
    '标准差': 'Standard Deviation',
    '樣本大小': 'Sample Size',
    '样本大小': 'Sample Size',
    '樣本數': 'Sample Size',
    '样本数': 'Sample Size',
    '樣本量': 'Sample Size',
    '样本量': 'Sample Size',
    '樣本大小估計': 'Sample Size',
    '样本大小估计': 'Sample Size',
    '單樣本t檢定': 'One-Sample t-Test',
    '单样本t检定': 'One-Sample t-Test',
    '獨立樣本t檢定': 'Independent Samples t-Test',
    '独立样本t检定': 'Independent Samples t-Test',
    '配對樣本t檢定': 'Paired Samples t-Test',
    '配对样本t检定': 'Paired Samples t-Test',
    '相關分析': 'Correlation Analysis',
    '相关分析': 'Correlation Analysis',
    '簡單迴歸': 'Simple Regression',
    '简单回归': 'Simple Regression',
    '卡方檢定': 'Chi-Square Test',
    '卡方检定': 'Chi-Square Test'
};

// 標準化概念名稱
function normalizeConceptName(conceptName) {
    if (!conceptName) return null;
    
    // 先嘗試直接匹配（區分大小寫）
    if (CONCEPT_NAME_MAP[conceptName]) {
        return CONCEPT_NAME_MAP[conceptName];
    }
    
    // 嘗試小寫匹配
    const normalized = conceptName.toLowerCase().trim();
    if (CONCEPT_NAME_MAP[normalized]) {
        return CONCEPT_NAME_MAP[normalized];
    }
    
    // 如果已經是標準英文名稱之一，直接返回
    if (STATISTICAL_CONCEPTS.includes(conceptName)) {
        return conceptName;
    }
    
    // 否則返回原始名稱
    console.warn('⚠️ Unknown concept name:', conceptName);
    return conceptName;
}

// 難度級別定義
const DIFFICULTY_LEVELS = {
    basic: 1,
    medium: 2,
    advanced: 3
};

// 題型定義
const QUESTION_TYPES = {
    multiple_choice: 'MC',
    case_study: 'Case Study',
    calculation: 'Calculation',
    interpretation: 'Interpretation'
};

function getConceptMetadata(conceptName) {
    switch (conceptName) {
        case 'Sample Size':
            return {
                category: 'study_design',
                difficulty_level: 2,
                description: 'Sample size determination based on significance level (alpha) and desired precision (margin of error).',
                prerequisites: []
            };
        default:
            return {
                category: 'general',
                difficulty_level: 1,
                description: null,
                prerequisites: []
            };
    }
}

async function ensureConceptExistsInSupabase(conceptName) {
    if (!conceptName) return;

    // If admin client is not configured, we cannot safely upsert concepts when RLS is enabled.
    if (!db.admin) {
        return;
    }

    try {
        const meta = getConceptMetadata(conceptName);
        const { error } = await db.admin
            .from('statistical_concepts')
            .upsert([
                {
                    concept_name: conceptName,
                    category: meta.category,
                    difficulty_level: meta.difficulty_level,
                    description: meta.description,
                    prerequisites: meta.prerequisites
                }
            ], { onConflict: 'concept_name' });

        if (error) {
            console.error('❌ Upsert concept failed:', {
                conceptName,
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        }
    } catch (e) {
        console.error('❌ Upsert concept threw:', e);
    }
}

// ============ 計算驗證工具函數 ============

/**
 * Compute basic descriptive statistics from an array of numbers.
 * Uses sample SD (N-1 denominator).
 */
function computeBasicStats(data) {
    if (!Array.isArray(data) || data.length === 0) return null;
    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const ss = data.reduce((acc, x) => acc + (x - mean) ** 2, 0);
    const variance = n > 1 ? ss / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);
    return { n, sum, mean, variance, sd, se };
}

function computeOneSampleTTest(data, populationMean) {
    const stats = computeBasicStats(data);
    if (!stats || stats.se === 0) return null;
    const t = (stats.mean - populationMean) / stats.se;
    return { ...stats, t, df: stats.n - 1, populationMean };
}

function computeIndependentTTest(data1, data2) {
    const s1 = computeBasicStats(data1);
    const s2 = computeBasicStats(data2);
    if (!s1 || !s2) return null;
    const pooledVar = ((s1.n - 1) * s1.variance + (s2.n - 1) * s2.variance) / (s1.n + s2.n - 2);
    const se = Math.sqrt(pooledVar * (1 / s1.n + 1 / s2.n));
    if (se === 0) return null;
    const t = (s1.mean - s2.mean) / se;
    return { group1: s1, group2: s2, pooledVar, se, t, df: s1.n + s2.n - 2 };
}

function computePairedTTest(dataPre, dataPost) {
    if (!Array.isArray(dataPre) || !Array.isArray(dataPost) || dataPre.length !== dataPost.length) return null;
    const diffs = dataPre.map((v, i) => v - dataPost[i]);
    const stats = computeBasicStats(diffs);
    if (!stats || stats.se === 0) return null;
    const t = stats.mean / stats.se;
    return { diffStats: stats, t, df: stats.n - 1, diffs };
}

function computePearsonR(x, y) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 3) return null;
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let ssX = 0, ssY = 0, ssXY = 0;
    for (let i = 0; i < n; i++) {
        ssX += (x[i] - mx) ** 2;
        ssY += (y[i] - my) ** 2;
        ssXY += (x[i] - mx) * (y[i] - my);
    }
    if (ssX === 0 || ssY === 0) return null;
    const r = ssXY / Math.sqrt(ssX * ssY);
    return { r, n, df: n - 2, meanX: mx, meanY: my };
}

// t-distribution critical values for α = 0.05, two-tailed
const T_CRITICAL_005 = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
    16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
    25: 2.060, 30: 2.042, 40: 2.021, 60: 2.000, 120: 1.980
};

function getTCritical(df) {
    if (T_CRITICAL_005[df]) return T_CRITICAL_005[df];
    const dfs = Object.keys(T_CRITICAL_005).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < dfs.length - 1; i++) {
        if (df > dfs[i] && df < dfs[i + 1]) {
            const ratio = (df - dfs[i]) / (dfs[i + 1] - dfs[i]);
            return T_CRITICAL_005[dfs[i]] + ratio * (T_CRITICAL_005[dfs[i + 1]] - T_CRITICAL_005[dfs[i]]);
        }
    }
    return 1.96; // large df approaches z
}

function r2(n) { return parseFloat(n.toFixed(2)); }
function r4(n) { return parseFloat(n.toFixed(4)); }

/**
 * Get computation_steps JSON schema for the prompt based on concept
 */
function getComputationStepsSchema(concept) {
    switch (concept) {
        case 'Descriptive Statistics':
        case 'Standard Deviation':
            return `,\n    "computation_steps": {\n        "raw_data": [/* all numbers from the question */],\n        "n": 0, "sum": 0, "mean": 0, "sd": 0\n    }`;
        case 'One-Sample t-Test':
            return `,\n    "computation_steps": {\n        "raw_data": [/* all participant scores */],\n        "n": 0, "mean": 0, "sd": 0, "se": 0,\n        "population_mean": 0,\n        "test_statistic": 0, "df": 0\n    }`;
        case 'Independent Samples t-Test':
            return `,\n    "computation_steps": {\n        "raw_data_group1": [], "raw_data_group2": [],\n        "n1": 0, "n2": 0, "mean1": 0, "mean2": 0, "sd1": 0, "sd2": 0,\n        "pooled_variance": 0, "se": 0,\n        "test_statistic": 0, "df": 0\n    }`;
        case 'Paired Samples t-Test':
            return `,\n    "computation_steps": {\n        "raw_data_pre": [], "raw_data_post": [],\n        "differences": [],\n        "n": 0, "mean_diff": 0, "sd_diff": 0, "se_diff": 0,\n        "test_statistic": 0, "df": 0\n    }`;
        case 'Correlation Analysis':
            return `,\n    "computation_steps": {\n        "raw_data_x": [], "raw_data_y": [],\n        "n": 0, "r": 0, "df": 0\n    }`;
        case 'Simple Regression':
            return `,\n    "computation_steps": {\n        "raw_data_x": [], "raw_data_y": [],\n        "n": 0, "slope": 0, "intercept": 0, "r_squared": 0\n    }`;
        case 'Chi-Square Test':
            return `,\n    "computation_steps": {\n        "observed": [[0,0],[0,0]], "expected": [[0,0],[0,0]],\n        "chi_square": 0, "df": 0, "n_total": 0\n    }`;
        default:
            return '';
    }
}

/**
 * Verify AI computation_steps against independent recalculation.
 * Returns correctedStats when discrepancies are found.
 */
function verifyAndCorrectComputations(questionData) {
    const steps = questionData.computation_steps;
    if (!steps) return { verified: false, noSteps: true };

    const corrections = {};
    let needsCorrection = false;
    let correctedStats = null;

    // Try to extract population_mean from question text if not in steps
    let populationMean = steps.population_mean;
    if (populationMean === undefined && questionData.question_text) {
        const qText = questionData.question_text;
        // Match patterns like "population mean of 16", "μ = 100", "population average of 30"
        const popMatch = qText.match(/population\s+(?:mean|average)\s+(?:of|is|=|equals?)\s*([\d.]+)/i)
            || qText.match(/[μµ]\s*=\s*([\d.]+)/)
            || qText.match(/(?:compare|test)\s+(?:against|to|with)\s+(?:a\s+)?(?:mean\s+(?:of\s+)?)?([\d.]+)/i);
        if (popMatch) {
            populationMean = parseFloat(popMatch[1]);
            console.log(`📌 Extracted population_mean=${populationMean} from question text`);
        }
    }

    // --- One-sample t-test or descriptive stats ---
    if (steps.raw_data && Array.isArray(steps.raw_data) && steps.raw_data.length >= 2) {
        const computed = computeBasicStats(steps.raw_data);
        if (computed) {
            if (steps.mean !== undefined && Math.abs(computed.mean - steps.mean) > 0.05) {
                corrections.mean = { ai: steps.mean, correct: r2(computed.mean) };
                needsCorrection = true;
            }
            if (steps.sd !== undefined && Math.abs(computed.sd - steps.sd) > 0.15) {
                corrections.sd = { ai: steps.sd, correct: r2(computed.sd) };
                needsCorrection = true;
            }
            if (populationMean !== undefined && !isNaN(populationMean)) {
                const tResult = computeOneSampleTTest(steps.raw_data, populationMean);
                if (tResult) {
                    correctedStats = tResult;
                    if (steps.test_statistic !== undefined && Math.abs(tResult.t - steps.test_statistic) > 0.15) {
                        corrections.t = { ai: steps.test_statistic, correct: r2(tResult.t) };
                        needsCorrection = true;
                    }
                    // Even if AI didn't report test_statistic, if there's a mean error the t will be wrong
                    if (corrections.mean || corrections.sd) {
                        needsCorrection = true;
                    }
                }
            } else {
                correctedStats = computed;
            }
        }
    }

    // --- Independent samples t-test ---
    if (steps.raw_data_group1 && steps.raw_data_group2 &&
        Array.isArray(steps.raw_data_group1) && Array.isArray(steps.raw_data_group2) &&
        steps.raw_data_group1.length >= 2 && steps.raw_data_group2.length >= 2) {
        const result = computeIndependentTTest(steps.raw_data_group1, steps.raw_data_group2);
        if (result) {
            correctedStats = result;
            if (steps.test_statistic !== undefined && Math.abs(result.t - steps.test_statistic) > 0.15) {
                corrections.t = { ai: steps.test_statistic, correct: r2(result.t) };
                needsCorrection = true;
            }
        }
    }

    // --- Paired samples t-test ---
    if (steps.raw_data_pre && steps.raw_data_post &&
        Array.isArray(steps.raw_data_pre) && Array.isArray(steps.raw_data_post)) {
        const result = computePairedTTest(steps.raw_data_pre, steps.raw_data_post);
        if (result) {
            correctedStats = result;
            if (steps.test_statistic !== undefined && Math.abs(result.t - steps.test_statistic) > 0.15) {
                corrections.t = { ai: steps.test_statistic, correct: r2(result.t) };
                needsCorrection = true;
            }
        }
    }

    // --- Correlation ---
    if (steps.raw_data_x && steps.raw_data_y &&
        Array.isArray(steps.raw_data_x) && Array.isArray(steps.raw_data_y)) {
        const result = computePearsonR(steps.raw_data_x, steps.raw_data_y);
        if (result) {
            correctedStats = result;
            if (steps.r !== undefined && Math.abs(result.r - steps.r) > 0.05) {
                corrections.r = { ai: steps.r, correct: r4(result.r) };
                needsCorrection = true;
            }
        }
    }

    return { verified: !needsCorrection, needsCorrection, corrections, correctedStats };
}

/**
 * Rebuild MC options for t-test questions using backend-verified stats
 */
function rebuildTTestMCOptions(correctedStats) {
    const { t, df } = correctedStats;
    if (t === undefined || df === undefined) return null;

    const tRounded = r2(t);
    const tCritical = getTCritical(df);
    const isSignificant = Math.abs(t) > tCritical;
    const pStr = isSignificant ? 'p < .05' : 'p > .05';
    const pStrWrong = isSignificant ? 'p > .05' : 'p < .05';

    const correctOpt = `t(${df}) = ${tRounded}, ${pStr}`;

    // Generate diverse distractors: vary t-value, df, and significance
    // Distractor 1: wrong df, close t-value, same significance
    const wrongDf = df + (Math.random() > 0.5 ? 2 : -2);
    // Distractor 2: noticeably different t-value, wrong significance
    const tShifted = t > 0 ? r2(Math.max(0.3, t - 1.6)) : r2(Math.min(-0.3, t + 1.6));
    // Distractor 3: further t-value in opposite significance zone
    const tFarther = t > 0 ? r2(t + 1.5) : r2(t - 1.5);

    const distractors = [
        `t(${Math.max(1, wrongDf)}) = ${tRounded}, ${pStr}`,
        `t(${df}) = ${tShifted}, ${pStrWrong}`,
        `t(${df}) = ${tFarther}, ${pStrWrong}`
    ];

    // Shuffle correct answer position
    const correctIdx = Math.floor(Math.random() * 4);
    const options = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
        options.push(i === correctIdx ? correctOpt : distractors[dIdx++]);
    }
    const correctLetter = String.fromCharCode(65 + correctIdx);

    // Build explanation
    let explanation = '';
    if (correctedStats.populationMean !== undefined) {
        explanation = `First, calculate the sample mean: *M* = ${r2(correctedStats.mean)}. The sample standard deviation: *SD* = ${r2(correctedStats.sd)}. Standard error: SE = ${r2(correctedStats.sd)} / \u221a${correctedStats.n} = ${r2(correctedStats.se)}. The t-statistic: *t* = (${r2(correctedStats.mean)} \u2212 ${correctedStats.populationMean}) / ${r2(correctedStats.se)} = ${tRounded}. With df = ${df}, the critical value at \u03b1 = .05 (two-tailed) is ${r2(tCritical)}. Since |${tRounded}| ${isSignificant ? '>' : '<'} ${r2(tCritical)}, the result is ${isSignificant ? 'statistically significant' : 'not statistically significant'}: *t*(${df}) = ${tRounded}, ${pStr}. The correct answer is ${correctLetter}.`;
    } else if (correctedStats.group1 && correctedStats.group2) {
        const g1 = correctedStats.group1, g2 = correctedStats.group2;
        explanation = `Group 1: *M* = ${r2(g1.mean)}, *SD* = ${r2(g1.sd)}, *n* = ${g1.n}. Group 2: *M* = ${r2(g2.mean)}, *SD* = ${r2(g2.sd)}, *n* = ${g2.n}. Pooled variance = ${r2(correctedStats.pooledVar)}, SE = ${r2(correctedStats.se)}. *t* = (${r2(g1.mean)} \u2212 ${r2(g2.mean)}) / ${r2(correctedStats.se)} = ${tRounded}. With df = ${df}: *t*(${df}) = ${tRounded}, ${pStr}. The correct answer is ${correctLetter}.`;
    } else if (correctedStats.diffStats) {
        const ds = correctedStats.diffStats;
        explanation = `Difference scores: mean = ${r2(ds.mean)}, *SD* = ${r2(ds.sd)}, SE = ${r2(ds.se)}. *t* = ${r2(ds.mean)} / ${r2(ds.se)} = ${tRounded}. With df = ${df}: *t*(${df}) = ${tRounded}, ${pStr}. The correct answer is ${correctLetter}.`;
    }

    return { options, correct_answer: correctLetter, explanation, rebuilt: true };
}

/**
 * Rebuild MC options for correlation questions using backend-verified stats
 */
function rebuildCorrelationMCOptions(correctedStats) {
    const { r, df, n } = correctedStats;
    if (r === undefined || df === undefined) return null;

    const rRounded = r2(r);
    const tForR = Math.abs(r) * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
    const tCritical = getTCritical(df);
    const isSignificant = tForR > tCritical;
    const pStr = isSignificant ? 'p < .05' : 'p > .05';
    const pStrWrong = isSignificant ? 'p > .05' : 'p < .05';

    const correctOpt = `r(${df}) = ${rRounded}, ${pStr}`;
    const distractors = [
        `r(${df}) = ${r2(-r)}, ${pStr}`,
        `r(${df}) = ${r2(r * 0.5)}, ${pStrWrong}`,
        `r(${df}) = ${r2(Math.min(0.99, Math.abs(r) + 0.25) * (r > 0 ? 1 : -1))}, ${pStrWrong}`
    ];

    const correctIdx = Math.floor(Math.random() * 4);
    const options = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
        options.push(i === correctIdx ? correctOpt : distractors[dIdx++]);
    }
    const correctLetter = String.fromCharCode(65 + correctIdx);
    const explanation = `The Pearson correlation: *r*(${df}) = ${rRounded}. Testing significance with *t* = ${r2(tForR)}, df = ${df}, critical value = ${r2(tCritical)}. The result is ${isSignificant ? 'significant' : 'not significant'}: ${pStr}. The correct answer is ${correctLetter}.`;

    return { options, correct_answer: correctLetter, explanation, rebuilt: true };
}

/**
 * 使用 FastGPT 生成練習題
 * @param {string} concept - 統計概念
 * @param {string} difficulty - 難度等級 (basic/medium/advanced)
 * @param {string} questionType - 題型
 * @returns {Object} 生成的題目
 */
async function generateQuestionWithFastGPT(concept, difficulty, questionType) {
    try {
        // 根據題型構建不同的範例
        let correctAnswerExample;
        let additionalInstructions = '';
        let conceptSpecificInstructions = '';
        let sampleSizeJsonSchema = '';
        let computationStepsSchema = '';
        const apaFormattingGuidelines = `
**APA Statistical Reporting Requirements (when reporting results):**
- Use italic formatting for statistical symbols: *M*, *SD*, *t*, *p*, *r*, *F*, *N* (use markdown italics).
- Report test statistics with df in parentheses, e.g., *t*(7) = -3.86, *p* = .003; *r*(8) = -.99, *p* < .001; *F*(1, 8) = 306.95, *p* < .001; χ²(1, *N* = 80) = 1.45, *p* = .228.
- Use a leading zero ONLY for values that can exceed 1 (e.g., 0.50), and omit leading zero for *p* values (e.g., *p* = .003).
- Include spaces around =, <, >.
- If question_type is multiple_choice, put APA-formatted results in the explanation.
`;
        
        if (questionType === 'multiple_choice') {
            correctAnswerExample = 'A';
            additionalInstructions = `**CRITICAL for Multiple Choice:
- "correct_answer" must be ONLY a single letter (A, B, C, or D), NOT the full option text.
- "options" array must contain 4 items, each is the option TEXT ONLY without letter prefix.
- DO NOT include "A.", "B.", "C.", "D." at the beginning of each option.
- Example of correct options format: ["The mean is 50", "The mean is 60", "The mean is 70", "The mean is 80"]
- Example of WRONG options format: ["A. The mean is 50", "B. The mean is 60", ...] - DO NOT DO THIS**`;
        } else if (questionType === 'calculation') {
            correctAnswerExample = 'The answer is 2.45. Step 1: Calculate the mean... Step 2: Apply the formula...';
            additionalInstructions = '**For calculation questions, provide the numerical answer AND the step-by-step solution process.**';
        } else if (questionType === 'case_study') {
            correctAnswerExample = 'The standard deviation indicates... This suggests that the intervention... Key points include: 1) ... 2) ... 3) ...';
            additionalInstructions = '**For case study questions, provide a comprehensive model answer that addresses all aspects of the question.**';
        } else {
            correctAnswerExample = 'A complete interpretation should include: 1) The statistical meaning... 2) The practical implications... 3) Limitations...';
            additionalInstructions = '**For interpretation questions, provide a detailed model answer covering all key points.**';
        }

        // 概念特定要求：樣本大小 (Sample Size)
                if (concept === 'Sample Size') {
                        conceptSpecificInstructions = `
**SAMPLE SIZE QUESTION REQUIREMENTS (Concept: "Sample Size")**
- The logic MUST be based on **statistical power** for comparing two groups or testing an intervention effect (e.g., a fitness program reduces weight).
- The question MUST ask the student to compute the MINIMUM required sample size per group (assume equal group sizes).
- The question MUST provide:
    - Effect size (Cohen's d): small 0.2, medium 0.5, large 0.8
    - Type I error (\u03b1), typically 0.05 (two-sided)
    - Power (1-\u03b2), typically 0.80 or 0.90
- The final answer MUST be an integer and MUST round up using the ceiling rule.
- Keep the context in psychology research (e.g., intervention vs control, pre-post with two groups).
- Use the power-based Z formula for two independent groups (equal n):
    $n = 2\,\left(\frac{Z_{1-\u03b1/2} + Z_{1-\u03b2}}{d}\right)^2$
    (If you choose a one-tailed test, state it explicitly and use the correct Z values.)
`;

                                                sampleSizeJsonSchema = `,
                "sample_size_parameters": {
                                "design": "two_group_independent", // power-based two-group comparison
                                "effect_size_d": 0.5,               // Cohen's d
                                "alpha": 0.05,                      // Type I error (two-sided unless stated)
                                "power": 0.80,                      // 1 - beta
                                "beta": 0.20,                       // optional if power provided
                                "z_alpha": 1.96,                    // Z_{1-\u03b1/2} for two-sided alpha
                                "z_beta": 0.84                      // Z_{1-\u03b2}
                }`;

            if (questionType === 'multiple_choice') {
                conceptSpecificInstructions += `
**For Multiple Choice (Sample Size):**
- Provide 4 plausible integer sample sizes (per group) as options.
- The correct option MUST correspond to the CEILING of the computed n.
- The exact computed ceiling value MUST appear in the options (no "closest" answers).
- Do NOT say "none of the options" or "closest" in the explanation.
- The explanation MUST explicitly state the computed n (per group) and which option matches it.
`;
            }

            if (questionType === 'calculation') {
                conceptSpecificInstructions += `
**For Calculation (Sample Size):**
- Show the Z values used (e.g., 1.96 for \u03b1=0.05 two-sided; 0.84 for power=0.80) and show the rounding-up step.
`;
            }
        }

        // Concept-specific instructions for t-test, correlation, and descriptive stats
        if (concept === 'One-Sample t-Test') {
            conceptSpecificInstructions += `
**ONE-SAMPLE t-TEST REQUIREMENTS:**
- Provide raw data (10-20 values) and a population mean (\u03bc).
- Fill computation_steps.raw_data with the EXACT numbers from your question.
- Fill computation_steps.population_mean with the \u03bc value.
- Compute: mean = sum/N, SD = \u221a[\u03a3(X-M)\u00b2/(N-1)], SE = SD/\u221aN, t = (M-\u03bc)/SE, df = N-1.
- For MC: options in APA format e.g. "t(14) = 2.63, p < .05". One option must EXACTLY match.
`;
        }
        if (concept === 'Independent Samples t-Test') {
            conceptSpecificInstructions += `
**INDEPENDENT SAMPLES t-TEST REQUIREMENTS:**
- Provide raw data for TWO groups (8-15 values each).
- Fill computation_steps.raw_data_group1 and raw_data_group2 with EXACT numbers.
- Compute each group's M and SD, then pooled variance, SE, t, df = n1+n2-2.
- For MC: options in APA format. One option must EXACTLY match your computed result.
`;
        }
        if (concept === 'Paired Samples t-Test') {
            conceptSpecificInstructions += `
**PAIRED SAMPLES t-TEST REQUIREMENTS:**
- Provide raw pre-test and post-test data (8-15 pairs).
- Fill computation_steps.raw_data_pre and raw_data_post with EXACT numbers.
- Compute difference scores, then mean_diff, SD_diff, SE, t = mean_diff/SE, df = N-1.
- For MC: options in APA format. One option must EXACTLY match your computed result.
`;
        }
        if (concept === 'Correlation Analysis') {
            conceptSpecificInstructions += `
**CORRELATION ANALYSIS REQUIREMENTS:**
- Provide paired X,Y data (8-15 pairs).
- Fill computation_steps.raw_data_x and raw_data_y with EXACT numbers.
- Compute Pearson r.
- For MC: options in APA format e.g. "r(13) = -.85, p < .05". One option must EXACTLY match.
`;
        }
        if (concept === 'Descriptive Statistics' || concept === 'Standard Deviation') {
            conceptSpecificInstructions += `
**DESCRIPTIVE STATISTICS REQUIREMENTS:**
- Fill computation_steps.raw_data with the EXACT numbers from your question.
- Compute: sum, mean (sum/N), sample SD (using N-1 denominator).
- For MC: one option must EXACTLY match your computed values.
`;
        }

        // Set computation_steps schema for non-Sample-Size concepts
        if (concept !== 'Sample Size') {
            computationStepsSchema = getComputationStepsSchema(concept);
        }

        // 構建生成題目的提示詞 (English version for English-speaking users)
        const prompt = `You are a statistics question generator for psychology students. Generate a ${getDifficultyName(difficulty)} difficulty ${getQuestionTypeName(questionType)} question for the concept "${concept}".

**CRITICAL - DIFFICULTY LEVEL REQUIREMENTS:**
${getDifficultyDescription(difficulty)}

**IMPORTANT REQUIREMENTS:**
1. Return ONLY JSON format, no other text or explanation.
2. The "correct_answer" field is REQUIRED for ALL question types.
3. The "explanation" field is REQUIRED for ALL question types.
4. **STRICTLY FOLLOW the difficulty level requirements above.**

**COMPUTATION ACCURACY (CRITICAL):**
- When your question includes raw data, COMPUTE step-by-step BEFORE writing options.
- Fill "computation_steps" with actual raw data arrays and ALL intermediate values.
- Double-check arithmetic: count data points carefully, add numbers one-by-one.
- Use SAMPLE SD formula: SD = \u221a[\u03a3(X\u2212M)\u00b2/(N\u22121)], NOT population SD (do NOT divide by N).
- For MULTIPLE CHOICE: one option must EXACTLY match your computed result. NEVER say "closest" or "approximately".
- Do NOT round intermediate steps; only round FINAL answer to 2 decimal places.

${apaFormattingGuidelines}

JSON format:
\`\`\`json
{
    "question_text": "Question content (must include psychology research context and follow difficulty requirements)",
    "question_type": "${questionType}",
    "options": ${questionType === 'multiple_choice' ? '["Option A text without letter prefix", "Option B text without letter prefix", "Option C text without letter prefix", "Option D text without letter prefix"]' : 'null'},
    "correct_answer": "${correctAnswerExample}",
    "explanation": "Detailed explanation of why this is the correct answer and the key concepts involved",
    "difficulty_level": ${DIFFICULTY_LEVELS[difficulty]},
    "concept_name": "${concept}"${sampleSizeJsonSchema}${computationStepsSchema}
}
\`\`\`

${additionalInstructions}

${conceptSpecificInstructions}

**REMEMBER: 
- "correct_answer" and "explanation" are MANDATORY fields.
- Follow the DIFFICULTY LEVEL requirements strictly.
- Generate the question now, return ONLY JSON.**`;


        const response = await axios.post(`${FASTGPT_API_BASE_URL}/v1/chat/completions`, {
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FASTGPT_API_KEY}`
            }
        });

        const data = response.data;

        // 檢查回應結構
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('FastGPT 回應格式錯誤:', JSON.stringify(data, null, 2));
            throw new Error('FastGPT 回應格式錯誤');
        }
        
        const aiResponse = data.choices[0].message.content;
        console.log('🤖 AI 回應內容:', aiResponse);
        
        // 確保 aiResponse 是字符串
        if (typeof aiResponse !== 'string') {
            console.error('AI 回應不是字符串:', typeof aiResponse, aiResponse);
            throw new Error('AI 回應格式錯誤：不是字符串');
        }
        
        // 解析 JSON 回應
        let questionData;
        try {
            // 先嘗試直接解析
            try {
                questionData = JSON.parse(aiResponse);
                console.log('✅ 直接解析成功');
            } catch (directParseError) {
                // 嘗試提取 JSON（可能包含在 markdown 代碼塊中）
                console.log('⚠️ 直接解析失敗，嘗試提取 JSON...');
                
                // 方法1: 提取 ```json ... ``` 代碼塊
                let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
                
                // 方法2: 提取 ``` ... ``` 代碼塊（無 json 標記）
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
                }
                
                // 方法3: 提取第一個完整的 JSON 對象
                if (!jsonMatch) {
                    jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                }
                
                if (jsonMatch) {
                    const jsonStr = jsonMatch[1] || jsonMatch[0];
                    console.log('📝 提取的 JSON 字符串:', jsonStr);
                    questionData = JSON.parse(jsonStr);
                    console.log('✅ 提取解析成功');
                } else {
                    throw new Error('無法找到 JSON 格式的內容');
                }
            }
            
            // 驗證必要欄位 - question_text 是必須的
            if (!questionData.question_text) {
                console.error('❌ JSON 缺少 question_text:', questionData);
                throw new Error('題目缺少問題內容');
            }

            // ===== FORCE-OVERRIDE question_type & difficulty_level =====
            // AI may ignore our instruction and return a different type/difficulty.
            // Always use the values the user actually selected.
            if (questionData.question_type !== questionType) {
                console.warn(`⚠️ AI returned question_type="${questionData.question_type}" but user selected "${questionType}". Overriding.`);
                questionData.question_type = questionType;
            }
            const expectedDiffLevel = DIFFICULTY_LEVELS[difficulty];
            if (questionData.difficulty_level !== expectedDiffLevel) {
                console.warn(`⚠️ AI returned difficulty_level=${questionData.difficulty_level} but expected ${expectedDiffLevel}. Overriding.`);
                questionData.difficulty_level = expectedDiffLevel;
            }

            // For MC: if AI forgot options, generate a retry or throw
            if (questionType === 'multiple_choice') {
                if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
                    console.error('❌ MC question missing valid options array:', questionData.options);
                    throw new Error('AI generated a multiple-choice question without valid options. Please retry.');
                }
                if (!questionData.correct_answer) {
                    console.error('❌ MC question missing correct_answer');
                    throw new Error('選擇題缺少正確答案');
                }
            }
            
            // 對於開放式題目，如果缺少 correct_answer 或 explanation，提供預設值
            const openEndedTypes = ['case_study', 'calculation', 'interpretation', 'short_answer'];
            if (openEndedTypes.includes(questionData.question_type)) {
                if (!questionData.correct_answer) {
                    questionData.correct_answer = 'This is an open-ended question. Your answer will be evaluated by AI based on key concepts and reasoning.';
                    console.log('⚠️ 開放式題目缺少參考答案，已添加預設值');
                }
                if (!questionData.explanation) {
                    questionData.explanation = 'Your answer should demonstrate understanding of the key statistical concepts and their application to the given scenario.';
                    console.log('⚠️ 開放式題目缺少解釋，已添加預設值');
                }
            } else {
                // 選擇題必須有 correct_answer
                if (!questionData.correct_answer) {
                    console.error('❌ 選擇題缺少 correct_answer:', questionData);
                    throw new Error('選擇題缺少正確答案');
                }
            }
            
            // 清理 correct_answer：提取選項字母（處理 AI 可能返回 "D) Standard Deviation" 的情況）
            if (questionData.question_type === 'multiple_choice') {
                const originalAnswer = questionData.correct_answer;
                const answerMatch = questionData.correct_answer.toString().trim().match(/^([A-D])/i);
                if (answerMatch) {
                    questionData.correct_answer = answerMatch[1].toUpperCase();
                    console.log(`📌 清理答案格式: "${originalAnswer}" → "${questionData.correct_answer}"`);
                }
            }

            // Sample Size MC: enforce correct option by computing from power-based parameters
            if (questionData.concept_name === 'Sample Size' && questionData.question_type === 'multiple_choice') {
                const params = questionData.sample_size_parameters || {};
                const d = typeof params.effect_size_d === 'number' ? params.effect_size_d : null;
                const alpha = typeof params.alpha === 'number' ? params.alpha : null;
                const power = typeof params.power === 'number' ? params.power : null;
                const beta = typeof params.beta === 'number' ? params.beta : null;
                const zAlpha = typeof params.z_alpha === 'number' ? params.z_alpha : null;
                const zBeta = typeof params.z_beta === 'number' ? params.z_beta : null;

                const zAlphaLookup = (a) => {
                    if (a === 0.10) return 1.645;
                    if (a === 0.05) return 1.96;
                    if (a === 0.01) return 2.576;
                    return null;
                };

                const zBetaLookup = (pwr) => {
                    if (pwr === 0.80) return 0.84;
                    if (pwr === 0.90) return 1.28;
                    if (pwr === 0.95) return 1.645;
                    return null;
                };

                const resolvedPower = power ?? (typeof beta === 'number' ? 1 - beta : null);
                const resolvedZAlpha = zAlpha ?? (typeof alpha === 'number' ? zAlphaLookup(alpha) : null);
                const resolvedZBeta = zBeta ?? (typeof resolvedPower === 'number' ? zBetaLookup(resolvedPower) : null);

                const hasNeeded = d && resolvedZAlpha && resolvedZBeta;

                if (hasNeeded) {
                    const nRaw = 2 * Math.pow((resolvedZAlpha + resolvedZBeta) / d, 2);
                    const nCeil = Math.ceil(nRaw);
                    const nFloor = Math.floor(nRaw);
                    const nRound = Math.round(nRaw);
                    const nAlt = Math.max(1, nCeil + 2);

                    const pool = [nCeil, nFloor, nRound, nAlt, Math.max(1, nCeil - 1), nCeil + 1, nCeil + 3]
                        .filter(n => Number.isFinite(n) && n > 0)
                        .map(n => Math.round(n));

                    const unique = [...new Set(pool)];
                    if (!unique.includes(nCeil)) {
                        unique.unshift(nCeil);
                    }

                    const options = unique.slice(0, 4);
                    while (options.length < 4) {
                        options.push(options[options.length - 1] + 1);
                    }

                    questionData.options = options.map(n => n.toString());
                    const correctIndex = options.indexOf(nCeil);
                    questionData.correct_answer = String.fromCharCode(65 + correctIndex);

                    questionData.explanation = `The minimum sample size per group is computed by n = 2[(Z_{1-\u03b1/2} + Z_{1-\u03b2})/d]^2. With \u03b1 = ${alpha ?? '0.05'} (two-sided), Z_{1-\u03b1/2} = ${resolvedZAlpha.toFixed(2)}, power = ${(resolvedPower ?? 0.8).toFixed(2)}, Z_{1-\u03b2} = ${resolvedZBeta.toFixed(2)}, and d = ${d}. n = 2[( ${resolvedZAlpha.toFixed(2)} + ${resolvedZBeta.toFixed(2)} )/${d}]^2 = ${nRaw.toFixed(2)}. Using the ceiling rule, n = ${nCeil} per group (total = ${nCeil * 2}). Option ${String.fromCharCode(65 + correctIndex)} is correct.`;

                    console.log('✅ Sample Size MC options rebuilt with correct ceiling n (power-based):', {
                        nRaw,
                        nCeil,
                        options: questionData.options,
                        correct_answer: questionData.correct_answer,
                        d,
                        alpha,
                        power: resolvedPower,
                        zAlpha: resolvedZAlpha,
                        zBeta: resolvedZBeta
                    });
                } else {
                    console.warn('⚠️ Sample Size parameters missing; cannot enforce MC options.', {
                        d, alpha, power: resolvedPower, beta, zAlpha, zBeta
                    });
                }
            }

            // ===== GENERAL COMPUTATION VERIFICATION =====
            // For all concepts except Sample Size (already handled above),
            // verify computation_steps and rebuild MC options if errors are detected.
            if (questionData.concept_name !== 'Sample Size' && questionData.computation_steps) {
                const verification = verifyAndCorrectComputations(questionData);

                if (verification.needsCorrection && verification.correctedStats) {
                    console.log('🔧 Computation errors detected, applying corrections:', verification.corrections);

                    if (questionData.question_type === 'multiple_choice') {
                        let rebuildResult = null;
                        const cs = verification.correctedStats;

                        // Decide rebuild strategy by what correctedStats contains, NOT concept name
                        if (cs.t !== undefined && cs.df !== undefined) {
                            // t-test result (one-sample, independent, or paired)
                            rebuildResult = rebuildTTestMCOptions(cs);
                        } else if (cs.r !== undefined && cs.df !== undefined) {
                            rebuildResult = rebuildCorrelationMCOptions(cs);
                        }

                        if (rebuildResult && rebuildResult.rebuilt) {
                            questionData.options = rebuildResult.options;
                            questionData.correct_answer = rebuildResult.correct_answer;
                            questionData.explanation = rebuildResult.explanation;
                            console.log('✅ MC options rebuilt with corrected computations:', {
                                concept: questionData.concept_name,
                                corrections: verification.corrections,
                                newAnswer: questionData.correct_answer
                            });
                        }
                    } else {
                        // For non-MC questions, prepend verified computation to explanation
                        const stats = verification.correctedStats;
                        let verifiedNote = '\n**Verified Computation:**\n';
                        if (stats.mean !== undefined) verifiedNote += `- *M* = ${r2(stats.mean)}\n`;
                        if (stats.sd !== undefined) verifiedNote += `- *SD* = ${r2(stats.sd)}\n`;
                        if (stats.se !== undefined) verifiedNote += `- SE = ${r2(stats.se)}\n`;
                        if (stats.t !== undefined) verifiedNote += `- *t*(${stats.df}) = ${r2(stats.t)}\n`;
                        if (stats.r !== undefined) verifiedNote += `- *r*(${stats.df}) = ${r4(stats.r)}\n`;
                        if (stats.group1) verifiedNote += `- Group 1: *M* = ${r2(stats.group1.mean)}, *SD* = ${r2(stats.group1.sd)}\n- Group 2: *M* = ${r2(stats.group2.mean)}, *SD* = ${r2(stats.group2.sd)}\n`;
                        if (stats.diffStats) verifiedNote += `- Mean difference = ${r2(stats.diffStats.mean)}, *SD* = ${r2(stats.diffStats.sd)}\n`;
                        questionData.explanation = verifiedNote + '\n' + (questionData.explanation || '');
                        console.log('✅ Non-MC explanation updated with verified computations');
                    }
                } else if (verification.verified) {
                    console.log('✅ Computation verification passed - all values correct');
                } else if (verification.noSteps) {
                    console.log('⚠️ No computation_steps found - cannot verify');
                }

                // --- DUPLICATE OPTION SAFETY NET ---
                // Even when verification passed or no correction was made,
                // detect MC options that are near-duplicates (differ only by sign or minor p-value).
                if (questionData.question_type === 'multiple_choice' && Array.isArray(questionData.options) && questionData.options.length === 4) {
                    const opts = questionData.options.map(o => o.toString().replace(/[-−]/g, '').replace(/\s/g, '').toLowerCase());
                    const uniqueOpts = new Set(opts);
                    if (uniqueOpts.size < 3) {
                        console.warn('⚠️ Duplicate/near-duplicate MC options detected. Forcing rebuild.');
                        const cs = verification.correctedStats;
                        let rebuildResult = null;
                        if (cs && cs.t !== undefined && cs.df !== undefined) {
                            rebuildResult = rebuildTTestMCOptions(cs);
                        } else if (cs && cs.r !== undefined && cs.df !== undefined) {
                            rebuildResult = rebuildCorrelationMCOptions(cs);
                        }
                        if (rebuildResult && rebuildResult.rebuilt) {
                            questionData.options = rebuildResult.options;
                            questionData.correct_answer = rebuildResult.correct_answer;
                            questionData.explanation = rebuildResult.explanation;
                            console.log('✅ Duplicate options replaced with rebuilt set');
                        }
                    }
                }
            }
            
            console.log('✅ 題目解析成功:', questionData);
            
        } catch (parseError) {
            console.error('❌ 解析錯誤:', parseError.message);
            console.error('📄 AI 原始回應:', aiResponse);
            throw new Error(`AI 回應格式不正確: ${parseError.message}`);
        }

        return questionData;

    } catch (error) {
        console.error('生成題目失敗:', error);
        throw error;
    }
}

/**
 * 獲取難度名稱
 */
function getDifficultyName(difficulty) {
    const names = {
        basic: 'Basic',
        medium: 'Intermediate',
        advanced: 'Advanced'
    };
    return names[difficulty] || 'Basic';
}

/**
 * 獲取題型名稱
 */
function getQuestionTypeName(questionType) {
    const names = {
        multiple_choice: 'Multiple Choice',
        case_study: 'Case Study',
        calculation: 'Calculation',
        interpretation: 'Interpretation'
    };
    return names[questionType] || 'Multiple Choice';
}

/**
 * 獲取難度描述
 */
function getDifficultyDescription(difficulty) {
    const descriptions = {
        basic: `BASIC Level Requirements:
- All necessary numbers and statistics are ALREADY PROVIDED in the question
- Student only needs to identify, interpret, or apply given values
- No calculations from raw data required
- Example: Given mean=50, SD=10, what is the z-score for X=60?`,
        
        medium: `INTERMEDIATE Level Requirements:
- Provide RAW DATA that students must use to calculate statistics
- Students need to compute mean, SD, t-value, correlation, etc. from the data
- Require answers to be reported in APA format, for example: t(29) = 2.45, p < .05
- Include realistic dataset sizes, around 10-30 data points
- Example: Given these scores: 12, 15, 18, 14, 16, 20, 13, 17, 19, 15, calculate the mean and standard deviation, then perform a one-sample t-test against population mean of 15. Report in APA format.`,
        
        advanced: `ADVANCED Level Requirements:
- Include all requirements from intermediate level
- MUST require critical discussion, evaluation, or ethical considerations
- Ask students to discuss limitations, assumptions, real-world implications
- Include questions about Type I or Type II errors, effect size interpretation, or study design critique
- May involve ethical issues in data collection or interpretation
- Example: Analyze this dataset, report results in APA format, AND discuss the ethical implications of using this statistical test with this sample. What are the limitations?`
    };
    return descriptions[difficulty] || descriptions.basic;
}

// ============ API 路由 ============

/**
 * POST /api/practice/generate
 * 生成新的練習題
 */
router.post('/generate', async (req, res) => {
    try {
        const { 
            concept, 
            difficulty = 'basic', 
            questionType = 'multiple_choice',
            userId = null,
            saveToDatabase = true
        } = req.body;

        // 驗證輸入
        if (!concept || !STATISTICAL_CONCEPTS.includes(concept)) {
            return res.status(400).json({
                success: false,
                error: '請提供有效的統計概念',
                availableConcepts: STATISTICAL_CONCEPTS
            });
        }

        if (!['basic', 'medium', 'advanced'].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                error: '難度級別必須是 basic, medium 或 advanced'
            });
        }

        // 使用 FastGPT 生成題目
        const questionData = await generateQuestionWithFastGPT(concept, difficulty, questionType);

        // 標準化概念名稱（處理 AI 可能返回英文的情況）
        const normalizedConceptName = normalizeConceptName(questionData.concept_name) || concept;
        console.log(`📌 概念名稱標準化: "${questionData.concept_name}" -> "${normalizedConceptName}"`);
        
        // 保存到資料庫
        let savedQuestion = null;
        if (saveToDatabase) {
            // Ensure FK target exists (practice_questions.concept_name may reference statistical_concepts.concept_name)
            await ensureConceptExistsInSupabase(normalizedConceptName);

            const dbData = {
                concept_name: normalizedConceptName,  // 使用標準化的中文名稱
                question_text: questionData.question_text,
                question_type: questionData.question_type,
                options: questionData.options ? JSON.stringify(questionData.options) : null,
                correct_answer: questionData.correct_answer,
                explanation: questionData.explanation,
                difficulty_level: questionData.difficulty_level
            };

            // Use admin client when available (bypass RLS / permission issues)
            const writeClient = db.admin || db.client;
            if (!db.admin) {
                console.warn('⚠️ SUPABASE_SERVICE_KEY not configured; saving questions may fail if RLS is enabled.');
            }

            const result = await writeClient
                .from('practice_questions')
                .insert([dbData])
                .select()
                .single();

            if (result.error) {
                console.error('❌ 保存題目失敗:', {
                    message: result.error.message,
                    details: result.error.details,
                    hint: result.error.hint,
                    code: result.error.code
                });
            } else {
                console.log('✅ 題目已保存到資料庫');
                savedQuestion = result.data;
            }
        }

        res.json({
            success: true,
            question: savedQuestion || questionData,
            generated: true,
            message: '題目生成成功',
            savedToDatabase: Boolean(savedQuestion)
        });

    } catch (error) {
        console.error('生成練習題失敗:', error);
        res.status(500).json({
            success: false,
            error: '生成練習題失敗',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/practice/questions
 * 獲取練習題列表（從資料庫）
 */
router.get('/questions', async (req, res) => {
    try {
        const { 
            concept, 
            difficulty, 
            questionType,
            limit = 10 
        } = req.query;

        let query = db.client
            .from('practice_questions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (concept) {
            query = query.eq('concept_name', concept);
        }
        if (difficulty) {
            query = query.eq('difficulty_level', DIFFICULTY_LEVELS[difficulty]);
        }
        if (questionType) {
            query = query.eq('question_type', questionType);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            questions: data,
            count: data.length
        });

    } catch (error) {
        console.error('獲取練習題失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取練習題失敗'
        });
    }
});

/**
 * GET /api/practice/question/:questionId
 * 獲取單個題目詳情
 */
router.get('/question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;

        const { data, error } = await db.client
            .from('practice_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }

        res.json({
            success: true,
            question: data
        });

    } catch (error) {
        console.error('獲取題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目失敗'
        });
    }
});

/**
 * POST /api/practice/submit
 * 提交答案並批改
 */
router.post('/submit', async (req, res) => {
    try {
        const {
            questionId,
            question,
            userId,
            sessionId,
            userAnswer,
            timeTaken = 0
        } = req.body;

        if (!userAnswer || (!questionId && !question)) {
            return res.status(400).json({
                success: false,
                error: '缺少必要參數'
            });
        }

        // 獲取題目：優先使用 questionId 從資料庫抓取；否則使用前端提供的題目物件
        let resolvedQuestion = null;
        if (questionId) {
            const { data: dbQuestion, error: questionError } = await db.client
                .from('practice_questions')
                .select('*')
                .eq('question_id', questionId)
                .single();

            if (questionError || !dbQuestion) {
                return res.status(404).json({
                    success: false,
                    error: '題目不存在'
                });
            }
            resolvedQuestion = dbQuestion;
        } else {
            resolvedQuestion = question;
        }

        // 基本欄位檢查（當使用前端題目物件時）
        if (!resolvedQuestion || !resolvedQuestion.question_text || !resolvedQuestion.question_type) {
            return res.status(400).json({
                success: false,
                error: '題目資料不完整'
            });
        }

        let isCorrect;
        let aiEvaluation = null;
        let score = null;

        // 根據題型選擇評分方式
        const openEndedTypes = ['case_study', 'calculation', 'interpretation', 'short_answer'];
        
        if (openEndedTypes.includes(resolvedQuestion.question_type)) {
            // 開放式題型：使用 AI 評分
            console.log('📝 使用 AI 評分，題型:', resolvedQuestion.question_type);
            aiEvaluation = await evaluateAnswerWithAI(resolvedQuestion, userAnswer);
            isCorrect = aiEvaluation.isCorrect;
            score = aiEvaluation.score;
        } else {
            // 選擇題：使用固定答案比對
            isCorrect = checkAnswer(userAnswer, resolvedQuestion.correct_answer, resolvedQuestion.question_type);
            score = isCorrect ? 100 : 0;
        }

        // 保存答題記錄：只有在有 questionId 時才能建立 FK 關聯
        let answerRecord = null;
        if (questionId) {
            const answerData = {
                user_id: userId || null,
                question_id: questionId,
                session_id: sessionId || null,
                user_answer: userAnswer,
                is_correct: isCorrect,
                time_taken: timeTaken
            };

            const { data: savedAnswer, error: saveError } = await db.client
                .from('user_answers')
                .insert([answerData])
                .select()
                .single();

            if (saveError) {
                console.error('保存答題記錄失敗:', saveError);
            } else {
                answerRecord = savedAnswer;
            }
        }

        // 更新學習進度
        if (userId && resolvedQuestion.concept_name) {
            await updateLearningProgress(userId, resolvedQuestion.concept_name, isCorrect);
        }

        // 構建回應
        const response = {
            success: true,
            isCorrect,
            score,
            correctAnswer: resolvedQuestion.correct_answer,
            explanation: resolvedQuestion.explanation,
            answerRecord: answerRecord,
            feedback: aiEvaluation?.feedback || generateFeedback(isCorrect, resolvedQuestion.difficulty_level),
            questionType: resolvedQuestion.question_type
        };

        // 如果是 AI 評分，添加額外資訊
        if (aiEvaluation) {
            response.aiEvaluation = {
                score: aiEvaluation.score,
                keyPointsMatched: aiEvaluation.keyPointsMatched,
                missingPoints: aiEvaluation.missingPoints,
                aiEvaluated: aiEvaluation.aiEvaluated
            };
        }

        res.json(response);

    } catch (error) {
        console.error('提交答案失敗:', error);
        res.status(500).json({
            success: false,
            error: '提交答案失敗'
        });
    }
});

/**
 * GET /api/practice/concepts
 * 獲取所有可用的統計概念
 */
router.get('/concepts', (req, res) => {
    res.json({
        success: true,
        concepts: STATISTICAL_CONCEPTS
    });
});

/**
 * GET /api/practice/user-progress/:userId
 * 獲取用戶練習進度
 */
router.get('/user-progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 獲取答題統計
        const { data: answers, error } = await db.client
            .from('user_answers')
            .select('*, practice_questions(concept_name, difficulty_level)')
            .eq('user_id', userId)
            .order('answered_at', { ascending: false });

        if (error) throw error;

        // 統計分析
        const stats = calculateUserStats(answers);

        res.json({
            success: true,
            stats,
            recentAnswers: answers.slice(0, 20)
        });

    } catch (error) {
        console.error('獲取用戶進度失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取用戶進度失敗'
        });
    }
});

// ============ 輔助函數 ============

/**
 * 使用 AI 評分開放式答案
 */
async function evaluateAnswerWithAI(question, userAnswer) {
    try {
        const prompt = `You are an expert statistics instructor evaluating a student's answer.

**Question Type:** ${question.question_type}
**Concept:** ${question.concept_name}
**Difficulty Level:** ${question.difficulty_level}/3

**Question:**
${question.question_text}

**Reference Answer (Standard Answer):**
${question.correct_answer}

**Explanation:**
${question.explanation || 'N/A'}

**Student's Answer:**
${userAnswer}

---

If the question expects APA-style statistical reporting, evaluate whether the student used correct APA format (italicized symbols like *M*, *SD*, *t*, *p*, *r*, *F*, *N*; correct df formatting; spacing around operators; and *p* values without leading zeros).

Please evaluate the student's answer and provide:
1. **Score (0-100):** How correct is the answer? 
   - 90-100: Excellent, fully correct with good understanding
   - 70-89: Good, mostly correct with minor issues
   - 50-69: Partial understanding, some key points missing
   - 30-49: Limited understanding, significant errors
   - 0-29: Incorrect or irrelevant

2. **Is Correct:** true if score >= 70, false otherwise

3. **Feedback:** Specific feedback on what the student did well and what needs improvement. Be encouraging but constructive.

4. **Key Points Matched:** List which key concepts the student correctly addressed

5. **Missing Points:** List what important points the student missed

**IMPORTANT: Return ONLY JSON format:**
\`\`\`json
{
    "score": 85,
    "isCorrect": true,
    "feedback": "Your explanation is mostly correct. You correctly identified...",
    "keyPointsMatched": ["concept 1", "concept 2"],
    "missingPoints": ["concept 3"]
}
\`\`\``;

        const response = await axios.post(`${FASTGPT_API_BASE_URL}/v1/chat/completions`, {
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FASTGPT_API_KEY}`
            }
        });

        const data = response.data;
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('AI 評分回應格式錯誤');
        }

        const aiResponse = data.choices[0].message.content;
        console.log('🤖 AI 評分回應:', aiResponse);

        // 解析 JSON 回應
        let evaluationResult;
        try {
            // 嘗試直接解析
            evaluationResult = JSON.parse(aiResponse);
        } catch (parseError) {
            // 嘗試提取 JSON
            let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
            }
            if (!jsonMatch) {
                jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            }
            
            if (jsonMatch) {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                evaluationResult = JSON.parse(jsonStr);
            } else {
                throw new Error('無法解析 AI 評分結果');
            }
        }

        // 確保必要欄位存在
        return {
            score: evaluationResult.score || 0,
            isCorrect: evaluationResult.isCorrect || evaluationResult.score >= 70,
            feedback: evaluationResult.feedback || 'Unable to evaluate the answer.',
            keyPointsMatched: evaluationResult.keyPointsMatched || [],
            missingPoints: evaluationResult.missingPoints || [],
            aiEvaluated: true
        };

    } catch (error) {
        console.error('AI 評分失敗:', error);
        // 返回備用評分結果
        return {
            score: 0,
            isCorrect: false,
            feedback: 'Unable to evaluate your answer automatically. Please review the correct answer below.',
            keyPointsMatched: [],
            missingPoints: [],
            aiEvaluated: false,
            error: error.message
        };
    }
}

/**
 * 檢查答案是否正確
 */
function checkAnswer(userAnswer, correctAnswer, questionType) {
    const normalizedUser = userAnswer.toString().trim().toLowerCase();
    const normalizedCorrect = correctAnswer.toString().trim().toLowerCase();
    
    if (questionType === 'multiple_choice') {
        return normalizedUser === normalizedCorrect;
    } else if (questionType === 'calculation') {
        // 數值計算題，允許小誤差
        const userNum = parseFloat(normalizedUser);
        const correctNum = parseFloat(normalizedCorrect);
        if (!isNaN(userNum) && !isNaN(correctNum)) {
            return Math.abs(userNum - correctNum) < 0.01;
        }
        return normalizedUser === normalizedCorrect;
    } else {
        // 其他題型，檢查關鍵字包含
        return normalizedUser.includes(normalizedCorrect) || 
               normalizedCorrect.includes(normalizedUser);
    }
}

/**
 * 生成反饋訊息 (English version)
 */
function generateFeedback(isCorrect, difficultyLevel) {
    if (isCorrect) {
        const positiveFeedback = [
            'Excellent! Your answer is completely correct!',
            'Very good! You have a great understanding!',
            'Correct! Keep it up!',
            'Outstanding! You understand this very well!'
        ];
        return positiveFeedback[Math.floor(Math.random() * positiveFeedback.length)];
    } else {
        const encouragingFeedback = {
            1: 'That\'s okay, this is part of learning. Review the explanation and try again!',
            2: 'Keep practicing. After understanding the explanation, you\'ll master it better!',
            3: 'This question is indeed challenging. Think it through a few more times, and you\'ll get it!'
        };
        return encouragingFeedback[difficultyLevel] || encouragingFeedback[1];
    }
}

/**
 * 更新學習進度
 */
async function updateLearningProgress(userId, conceptName, isCorrect) {
    try {
        // 標準化概念名稱
        const normalizedConceptName = normalizeConceptName(conceptName) || conceptName;
        
        // 獲取當前進度
        const { data: current } = await db.client
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('concept_name', normalizedConceptName)
            .single();

        let newMasteryLevel;
        let newPracticeCount;
        let newCorrectAnswers;

        if (current) {
            newPracticeCount = current.practice_count + 1;
            newCorrectAnswers = current.correct_answers + (isCorrect ? 1 : 0);
            
            // 計算新的掌握度（0.0 - 1.0）
            const correctRate = newCorrectAnswers / newPracticeCount;
            newMasteryLevel = Math.min(0.95, correctRate * 1.1); // 最高 0.95
        } else {
            newPracticeCount = 1;
            newCorrectAnswers = isCorrect ? 1 : 0;
            newMasteryLevel = isCorrect ? 0.2 : 0.05;
        }

        // 更新或插入
        await db.client
            .from('learning_progress')
            .upsert({
                user_id: userId,
                concept_name: normalizedConceptName,  // 使用標準化的名稱
                mastery_level: newMasteryLevel,
                practice_count: newPracticeCount,
                correct_answers: newCorrectAnswers,
                last_practiced: new Date().toISOString()
            });

    } catch (error) {
        console.error('更新學習進度失敗:', error);
    }
}

/**
 * 計算用戶統計數據
 */
function calculateUserStats(answers) {
    if (!answers || answers.length === 0) {
        return {
            totalQuestions: 0,
            correctCount: 0,
            accuracy: 0,
            averageTime: 0,
            conceptStats: {}
        };
    }

    const totalQuestions = answers.length;
    const correctCount = answers.filter(a => a.is_correct).length;
    const accuracy = (correctCount / totalQuestions * 100).toFixed(1);
    const averageTime = answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / totalQuestions;

    // 按概念統計
    const conceptStats = {};
    answers.forEach(answer => {
        const concept = answer.practice_questions?.concept_name;
        if (concept) {
            if (!conceptStats[concept]) {
                conceptStats[concept] = {
                    total: 0,
                    correct: 0,
                    accuracy: 0
                };
            }
            conceptStats[concept].total++;
            if (answer.is_correct) {
                conceptStats[concept].correct++;
            }
        }
    });

    // 計算每個概念的正確率
    Object.keys(conceptStats).forEach(concept => {
        const stats = conceptStats[concept];
        stats.accuracy = (stats.correct / stats.total * 100).toFixed(1);
    });

    return {
        totalQuestions,
        correctCount,
        accuracy: parseFloat(accuracy),
        averageTime: Math.round(averageTime),
        conceptStats
    };
}

// ============================================
// 老師題目 API
// ============================================

/**
 * 獲取老師題目數量
 * GET /api/practice/teacher-questions/count
 */
/**
 * 獲取老師題目列表
 * GET /api/practice/teacher-questions/list
 */
router.get('/teacher-questions/list', async (req, res) => {
    try {
        const { concept, difficulty, active } = req.query;
        
        let query = db.client
            .from('teacher_questions')
            .select('question_id, concept_name, difficulty_level, question_type, question_text, created_at')
            .order('created_at', { ascending: false });
        
        if (active === 'true') {
            query = query.eq('is_active', true);
        }
        
        if (concept) {
            query = query.eq('concept_name', concept);
        }
        
        if (difficulty) {
            query = query.eq('difficulty_level', parseInt(difficulty));
        }
        
        const { data: questions, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            questions: questions || [],
            count: questions?.length || 0
        });
    } catch (error) {
        console.error('獲取老師題目列表失敗:', error);
        res.json({
            success: true,
            questions: [],
            count: 0
        });
    }
});

/**
 * 獲取老師題目數量
 * GET /api/practice/teacher-questions/count
 */
router.get('/teacher-questions/count', async (req, res) => {
    try {
        const { concept, difficulty, active } = req.query;
        
        let query = db.client
            .from('teacher_questions')
            .select('*', { count: 'exact', head: true });
        
        if (active === 'true') {
            query = query.eq('is_active', true);
        }
        
        if (concept) {
            query = query.eq('concept_name', concept);
        }
        
        if (difficulty) {
            query = query.eq('difficulty_level', parseInt(difficulty));
        }
        
        const { count, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            count: count || 0
        });
    } catch (error) {
        console.error('獲取老師題目數量失敗:', error);
        res.json({
            success: true,
            count: 0
        });
    }
});

/**
 * 獲取單個老師題目詳情
 * GET /api/practice/teacher-questions/:questionId
 */
router.get('/teacher-questions/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        console.log('獲取題目 ID:', questionId);
        
        const { data: question, error } = await db.client
            .from('teacher_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();
        
        console.log('查詢結果:', { question: !!question, error: error?.message });
        
        if (error || !question) {
            console.error('題目未找到:', error);
            return res.status(404).json({
                success: false,
                error: 'Question not found',
                details: error?.message
            });
        }
        
        res.json({
            success: true,
            question: {
                question_id: question.question_id,
                question_text: question.question_text,
                question_type: question.question_type,
                concept_name: question.concept_name,
                difficulty_level: question.difficulty_level,
                options: question.options,
                correct_answer: question.correct_answer,
                explanation: question.explanation,
                source: 'teacher'
            }
        });
    } catch (error) {
        console.error('獲取題目詳情失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目失敗'
        });
    }
});

/**
 * 隨機獲取一道老師題目
 * GET /api/practice/teacher-questions/random
 */
router.get('/teacher-questions/random', async (req, res) => {
    try {
        const { concept, difficulty, questionType } = req.query;
        
        let query = db.client
            .from('teacher_questions')
            .select('*')
            .eq('is_active', true);
        
        if (concept) {
            query = query.eq('concept_name', concept);
        }
        
        if (difficulty) {
            query = query.eq('difficulty_level', parseInt(difficulty));
        }
        
        if (questionType) {
            query = query.eq('question_type', questionType);
        }
        
        const { data: questions, error } = await query;
        
        if (error) throw error;
        
        if (!questions || questions.length === 0) {
            return res.json({
                success: false,
                error: 'No teacher questions available for the selected criteria'
            });
        }
        
        // 隨機選擇一個題目
        const randomIndex = Math.floor(Math.random() * questions.length);
        const question = questions[randomIndex];
        
        res.json({
            success: true,
            question: {
                question_id: question.question_id,
                question_text: question.question_text,
                question_type: question.question_type,
                concept_name: question.concept_name,
                difficulty_level: question.difficulty_level,
                options: question.options,
                correct_answer: question.correct_answer,
                explanation: question.explanation,
                source: 'teacher'
            }
        });
    } catch (error) {
        console.error('獲取老師題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取題目失敗'
        });
    }
});

/**
 * 提交老師題目答案（使用 AI 評分）
 * POST /api/practice/teacher-questions/submit
 */
router.post('/teacher-questions/submit', async (req, res) => {
    try {
        const { userId, questionId, userAnswer, timeTaken } = req.body;
        
        if (!userId || !questionId || userAnswer === undefined) {
            return res.status(400).json({
                success: false,
                error: '缺少必要參數'
            });
        }
        
        // 獲取題目詳情
        const { data: question, error: questionError } = await db.client
            .from('teacher_questions')
            .select('*')
            .eq('question_id', questionId)
            .single();
        
        if (questionError || !question) {
            return res.status(404).json({
                success: false,
                error: '題目不存在'
            });
        }
        
        let isCorrect = false;
        let score = 0;
        let aiFeedback = null;
        let aiEvaluation = null;
        
        // 根據題型判斷答案
        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
            // 選擇題和是非題：直接比較
            const correctAnswer = question.correct_answer.toString().toLowerCase().trim();
            const userAns = userAnswer.toString().toLowerCase().trim();
            isCorrect = correctAnswer === userAns;
            score = isCorrect ? 100 : 0;
        } else {
            // 開放題型：使用 AI 評分
            try {
                const aiResult = await evaluateTeacherQuestionWithAI(
                    question.question_text,
                    question.correct_answer,
                    userAnswer,
                    question.concept_name
                );
                
                isCorrect = aiResult.score >= 60;
                score = aiResult.score;
                aiFeedback = aiResult.feedback;
                aiEvaluation = {
                    score: aiResult.score,
                    feedback: aiResult.feedback,
                    keyPointsMatched: aiResult.keyPointsHit || [],
                    missingPoints: aiResult.missingPoints || []
                };
            } catch (aiError) {
                console.error('AI 評分失敗:', aiError);
                // 如果 AI 評分失敗，使用簡單的比較
                isCorrect = userAnswer.toLowerCase().includes(question.correct_answer.toLowerCase().substring(0, 20));
                score = isCorrect ? 70 : 30;
                aiFeedback = 'AI scoring temporarily unavailable';
            }
        }
        
        // 記錄答案
        const { data: answer, error: insertError } = await db.client
            .from('teacher_question_answers')
            .insert({
                question_id: questionId,
                user_id: userId,
                user_answer: userAnswer,
                is_correct: isCorrect,
                score: score,
                ai_feedback: aiFeedback,
                time_taken: timeTaken || null
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('記錄答案失敗:', insertError);
        }
        
        res.json({
            success: true,
            isCorrect,
            score,
            correctAnswer: question.correct_answer,
            explanation: question.explanation,
            feedback: aiFeedback || (isCorrect ? 'Correct!' : 'Incorrect.'),
            aiEvaluation,
            answerId: answer?.answer_id
        });
    } catch (error) {
        console.error('提交答案失敗:', error);
        res.status(500).json({
            success: false,
            error: '提交答案失敗'
        });
    }
});

/**
 * 使用 AI 評估老師題目的開放式答案
 */
async function evaluateTeacherQuestionWithAI(questionText, correctAnswer, userAnswer, conceptName) {
    const evaluationPrompt = `You are a statistics teaching assistant evaluating a student's answer.

Question: ${questionText}

Model Answer: ${correctAnswer}

Student's Answer: ${userAnswer}

Concept: ${conceptName}

Please evaluate the student's answer and provide:
1. A score from 0-100 based on accuracy and completeness
2. Brief, constructive feedback (2-3 sentences)

Respond in this exact JSON format:
{
    "score": <number 0-100>,
    "feedback": "<brief feedback>",
    "keyPointsHit": ["<point1>", "<point2>"],
    "missingPoints": ["<point1>", "<point2>"]
}`;

    try {
        const response = await axios({
            method: 'POST',
            url: `${FASTGPT_API_BASE_URL}/v1/chat/completions`,
            headers: {
                'Authorization': `Bearer ${FASTGPT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a statistics teaching assistant. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: evaluationPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            },
            timeout: 30000
        });

        const content = response.data.choices[0].message.content;
        
        // 解析 AI 回應
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                score: Math.max(0, Math.min(100, parseInt(parsed.score) || 0)),
                feedback: parsed.feedback || 'Evaluation completed.',
                keyPointsHit: parsed.keyPointsHit || [],
                missingPoints: parsed.missingPoints || []
            };
        }
        
        // 如果解析失敗，返回默認值
        return {
            score: 50,
            feedback: 'Unable to fully evaluate. Please check with your instructor.',
            keyPointsHit: [],
            missingPoints: []
        };
    } catch (error) {
        console.error('AI 評估失敗:', error.message);
        throw error;
    }
}

// =============================================
// 自適應練習系統 (Adaptive Practice System)
// =============================================

/**
 * 獲取用戶的練習統計數據
 * @param {string} userId 
 * @returns {Object} 用戶練習統計
 */
async function getUserPracticeStats(userId) {
    try {
        // 獲取用戶所有答題記錄
        const { data: answers, error } = await db.client
            .from('user_answers')
            .select('question_id, is_correct, time_taken, answered_at')
            .eq('user_id', userId)
            .order('answered_at', { ascending: false })
            .limit(200);

        if (error) {
            console.error('獲取用戶答題記錄失敗:', error);
            return null;
        }

        if (!answers || answers.length === 0) {
            return {
                totalAnswers: 0,
                conceptStats: {},
                weakConcepts: [],
                strongConcepts: [],
                recommendedDifficulty: 1,
                recentPerformance: 0
            };
        }

        // 獲取這些題目的詳細信息
        const questionIds = [...new Set(answers.map(a => a.question_id).filter(Boolean))];
        
        let questionDetails = {};
        if (questionIds.length > 0) {
            // 從 practice_questions 表獲取
            const { data: practiceQuestions } = await db.client
                .from('practice_questions')
                .select('question_id, concept_name, difficulty_level')
                .in('question_id', questionIds);
            
            if (practiceQuestions) {
                practiceQuestions.forEach(q => {
                    questionDetails[q.question_id] = q;
                });
            }

            // 也從 teacher_questions 表獲取
            const { data: teacherQuestions } = await db.client
                .from('teacher_questions')
                .select('question_id, concept_name, difficulty_level')
                .in('question_id', questionIds);
            
            if (teacherQuestions) {
                teacherQuestions.forEach(q => {
                    questionDetails[q.question_id] = q;
                });
            }
        }

        // 按概念統計
        const conceptStats = {};
        
        // 中文到英文的反向映射
        const chineseToEnglish = {
            '描述統計': 'Descriptive Statistics',
            '描述统计': 'Descriptive Statistics',
            '標準差': 'Standard Deviation',
            '标准差': 'Standard Deviation',
            '單樣本t檢定': 'One-Sample t-Test',
            '单样本t检定': 'One-Sample t-Test',
            '獨立樣本t檢定': 'Independent Samples t-Test',
            '独立样本t检定': 'Independent Samples t-Test',
            '配對樣本t檢定': 'Paired Samples t-Test',
            '配对样本t检定': 'Paired Samples t-Test',
            '相關分析': 'Correlation Analysis',
            '相关分析': 'Correlation Analysis',
            '簡單迴歸': 'Simple Regression',
            '简单回归': 'Simple Regression',
            '卡方檢定': 'Chi-Square Test',
            '卡方检定': 'Chi-Square Test'
        };
        
        for (const answer of answers) {
            const qDetail = questionDetails[answer.question_id];
            let concept = qDetail?.concept_name || 'Unknown';
            const difficulty = qDetail?.difficulty_level || 1;
            
            if (concept === 'Unknown') continue;
            
            // 將中文概念名稱轉換為英文
            concept = chineseToEnglish[concept] || concept;
            
            if (!conceptStats[concept]) {
                conceptStats[concept] = {
                    total: 0,
                    correct: 0,
                    incorrect: 0,
                    recentAnswers: [],
                    avgDifficulty: 0,
                    difficultySum: 0
                };
            }
            
            conceptStats[concept].total++;
            conceptStats[concept].difficultySum += difficulty;
            
            if (answer.is_correct) {
                conceptStats[concept].correct++;
            } else {
                conceptStats[concept].incorrect++;
            }
            
            // 記錄最近 10 次答題
            if (conceptStats[concept].recentAnswers.length < 10) {
                conceptStats[concept].recentAnswers.push({
                    isCorrect: answer.is_correct,
                    difficulty: difficulty
                });
            }
        }

        // 計算每個概念的正確率和平均難度
        const weakConcepts = [];
        const strongConcepts = [];
        
        for (const [concept, stats] of Object.entries(conceptStats)) {
            stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
            stats.avgDifficulty = stats.total > 0 ? stats.difficultySum / stats.total : 1;
            
            // 計算最近表現（最近 5 次）
            const recent = stats.recentAnswers.slice(0, 5);
            stats.recentAccuracy = recent.length > 0 
                ? recent.filter(a => a.isCorrect).length / recent.length 
                : 0;

            // 分類弱項和強項（至少要有 3 次答題記錄）
            if (stats.total >= 3 && stats.accuracy < 0.5) {
                weakConcepts.push({
                    concept,
                    accuracy: stats.accuracy,
                    total: stats.total,
                    priority: (1 - stats.accuracy) * Math.log(stats.total + 1)
                });
            } else if (stats.total >= 3 && stats.accuracy >= 0.7) {
                strongConcepts.push({
                    concept,
                    accuracy: stats.accuracy,
                    total: stats.total
                });
            }
        }

        // 按優先級排序弱項概念
        weakConcepts.sort((a, b) => b.priority - a.priority);
        strongConcepts.sort((a, b) => b.accuracy - a.accuracy);

        // 計算整體推薦難度
        const recentAnswers = answers.slice(0, 10);
        const recentCorrect = recentAnswers.filter(a => a.is_correct).length;
        const recentPerformance = recentAnswers.length > 0 ? recentCorrect / recentAnswers.length : 0;

        let recommendedDifficulty;
        if (recentPerformance >= 0.8) {
            recommendedDifficulty = 3; // 高正確率，增加難度
        } else if (recentPerformance >= 0.5) {
            recommendedDifficulty = 2; // 中等正確率，維持難度
        } else {
            recommendedDifficulty = 1; // 低正確率，降低難度
        }

        return {
            totalAnswers: answers.length,
            conceptStats,
            weakConcepts,
            strongConcepts,
            recommendedDifficulty,
            recentPerformance
        };

    } catch (error) {
        console.error('獲取用戶練習統計失敗:', error);
        return null;
    }
}

/**
 * 根據用戶表現計算特定概念的推薦難度
 * @param {Object} conceptStats 概念統計數據
 * @param {string} concept 概念名稱
 * @returns {number} 推薦難度 (1-3)
 */
function getRecommendedDifficultyForConcept(conceptStats, concept) {
    const stats = conceptStats[concept];
    
    if (!stats || stats.total < 3) {
        return 1; // 新概念從簡單開始
    }

    // 使用最近表現來決定難度
    const recentAccuracy = stats.recentAccuracy;
    const currentAvgDifficulty = stats.avgDifficulty;

    if (recentAccuracy >= 0.8) {
        // 表現優秀，提高難度（但不超過3）
        return Math.min(3, Math.ceil(currentAvgDifficulty) + 1);
    } else if (recentAccuracy >= 0.5) {
        // 表現中等，維持難度
        return Math.round(currentAvgDifficulty);
    } else {
        // 表現較差，降低難度（但不低於1）
        return Math.max(1, Math.floor(currentAvgDifficulty) - 1);
    }
}

/**
 * 獲取自適應練習推薦
 * GET /api/practice/adaptive-recommendation
 */
router.get('/adaptive-recommendation', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少 userId'
            });
        }

        const stats = await getUserPracticeStats(userId);
        
        if (!stats) {
            return res.json({
                success: true,
                recommendation: {
                    type: 'new_user',
                    message: 'Welcome! Start with basic concepts to build your foundation.',
                    suggestedConcept: 'Descriptive Statistics',
                    suggestedDifficulty: 1,
                    weakConcepts: [],
                    strongConcepts: []
                }
            });
        }

        let recommendation;

        if (stats.weakConcepts.length > 0) {
            // 有弱項概念，優先推薦練習
            const topWeak = stats.weakConcepts[0];
            const recDifficulty = getRecommendedDifficultyForConcept(
                stats.conceptStats, 
                topWeak.concept
            );

            recommendation = {
                type: 'weak_concept_focus',
                message: `Focus on "${topWeak.concept}" - your accuracy is ${(topWeak.accuracy * 100).toFixed(0)}%. Let's improve!`,
                suggestedConcept: topWeak.concept,
                suggestedDifficulty: recDifficulty,
                weakConcepts: stats.weakConcepts.slice(0, 3),
                strongConcepts: stats.strongConcepts.slice(0, 3),
                stats: {
                    totalAnswers: stats.totalAnswers,
                    recentPerformance: stats.recentPerformance
                }
            };
        } else if (stats.totalAnswers < 10) {
            // 練習次數少，鼓勵多練習
            recommendation = {
                type: 'need_more_practice',
                message: 'Keep practicing! Try different concepts to build your foundation.',
                suggestedConcept: null,
                suggestedDifficulty: stats.recommendedDifficulty,
                weakConcepts: [],
                strongConcepts: stats.strongConcepts,
                stats: {
                    totalAnswers: stats.totalAnswers,
                    recentPerformance: stats.recentPerformance
                }
            };
        } else {
            // 表現良好，建議挑戰更難的題目
            recommendation = {
                type: 'doing_well',
                message: `Great progress! Your recent accuracy is ${(stats.recentPerformance * 100).toFixed(0)}%. Ready for a challenge?`,
                suggestedConcept: null,
                suggestedDifficulty: stats.recommendedDifficulty,
                weakConcepts: [],
                strongConcepts: stats.strongConcepts,
                stats: {
                    totalAnswers: stats.totalAnswers,
                    recentPerformance: stats.recentPerformance
                }
            };
        }

        res.json({
            success: true,
            recommendation
        });

    } catch (error) {
        console.error('獲取自適應推薦失敗:', error);
        res.status(500).json({
            success: false,
            error: '獲取推薦失敗'
        });
    }
});

/**
 * 自適應生成題目
 * POST /api/practice/generate-adaptive
 */
router.post('/generate-adaptive', async (req, res) => {
    try {
        const { userId, concept, questionType } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: '缺少 userId'
            });
        }

        // 獲取用戶統計
        const stats = await getUserPracticeStats(userId);
        
        let selectedConcept = concept;
        let selectedDifficulty = 1;
        let selectionReason = 'Default selection';

        if (stats) {
            // 如果沒有指定概念，自動選擇（優先弱項）
            if (!selectedConcept && stats.weakConcepts.length > 0) {
                // 80% 機率選擇弱項概念，20% 機率隨機
                if (Math.random() < 0.8) {
                    selectedConcept = stats.weakConcepts[0].concept;
                    selectionReason = 'Focusing on weak concept';
                } else {
                    selectedConcept = STATISTICAL_CONCEPTS[Math.floor(Math.random() * STATISTICAL_CONCEPTS.length)];
                    selectionReason = 'Random concept for variety';
                }
            }
            
            // 計算推薦難度
            if (selectedConcept && stats.conceptStats[selectedConcept]) {
                selectedDifficulty = getRecommendedDifficultyForConcept(
                    stats.conceptStats, 
                    selectedConcept
                );
                selectionReason += ` (difficulty adjusted based on performance)`;
            } else {
                selectedDifficulty = stats.recommendedDifficulty;
            }
        }

        // 如果還是沒有概念，隨機選一個
        if (!selectedConcept) {
            selectedConcept = STATISTICAL_CONCEPTS[Math.floor(Math.random() * STATISTICAL_CONCEPTS.length)];
            selectionReason = 'Random selection for new user';
        }

        // 將難度數字轉換為字符串
        const difficultyMap = { 1: 'basic', 2: 'medium', 3: 'advanced' };
        const difficultyStr = difficultyMap[selectedDifficulty] || 'basic';

        console.log(`🎯 自適應生成: 概念=${selectedConcept}, 難度=${selectedDifficulty}(${difficultyStr}), 用戶=${userId}`);

        // 使用現有的生成邏輯
        const questionData = await generateQuestionWithFastGPT(
            selectedConcept,
            difficultyStr,
            questionType || 'multiple_choice'
        );

        // 標準化概念名稱
        const normalizedConceptName = normalizeConceptName(questionData.concept_name) || selectedConcept;

        // 嘗試保存到資料庫
        let savedQuestion = null;
        const dbData = {
            concept_name: normalizedConceptName,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            options: questionData.options ? JSON.stringify(questionData.options) : null,
            correct_answer: questionData.correct_answer,
            explanation: questionData.explanation,
            difficulty_level: selectedDifficulty
        };

        const result = await db.client
            .from('practice_questions')
            .insert([dbData])
            .select()
            .single();

        if (result.error) {
            console.error('❌ 保存題目失敗:', result.error);
        } else {
            savedQuestion = result.data;
        }

        res.json({
            success: true,
            question: savedQuestion || { ...questionData, difficulty_level: selectedDifficulty },
            adaptive: {
                selectedConcept,
                selectedDifficulty,
                reason: selectionReason
            }
        });

    } catch (error) {
        console.error('自適應生成題目失敗:', error);
        res.status(500).json({
            success: false,
            error: '生成題目失敗',
            details: error.message
        });
    }
});

module.exports = router;


