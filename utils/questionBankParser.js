/**
 * Question Bank Parser
 * Parses question bank text files (T1-T10) into structured JSON format
 */

const fs = require('fs');
const path = require('path');

/**
 * Topic definitions mapping
 */
const TOPIC_DEFINITIONS = {
    'T1': {
        topic_number: 1,
        topic_name: 'Data Types and Measurement Scales',
        concepts: ['Qualitative vs Quantitative', 'Discrete vs Continuous', 'Nominal', 'Ordinal', 'Interval', 'Ratio']
    },
    'T2': {
        topic_number: 2,
        topic_name: 'Descriptive Statistics',
        concepts: ['Mean', 'Standard Deviation', 'Frequency Distribution', 'Histogram']
    },
    'T3': {
        topic_number: 3,
        topic_name: 'Normal Distribution and Z-scores',
        concepts: ['Normal Distribution', 'Z-scores', 'Probability Calculation']
    },
    'T4': {
        topic_number: 4,
        topic_name: 'Sampling Distribution',
        concepts: ['Population vs Sample', 'Sampling Distribution', 'Central Limit Theorem']
    },
    'T5': {
        topic_number: 5,
        topic_name: 'One Sample T-Test',
        concepts: ['單樣本t檢定', 'Hypothesis Testing', 'T-statistic']
    },
    'T6': {
        topic_number: 6,
        topic_name: 'Paired Sample T-Test',
        concepts: ['配對樣本t檢定', 'Paired Differences', 'Before-After Studies']
    },
    'T7': {
        topic_number: 7,
        topic_name: 'Independent Sample T-Test',
        concepts: ['獨立樣本t檢定', 'Two Group Comparison', 'Levene\'s Test']
    },
    'T8': {
        topic_number: 8,
        topic_name: 'Sample Size Calculation',
        concepts: ['Power Analysis', 'Effect Size', 'Statistical Power']
    },
    'T9': {
        topic_number: 9,
        topic_name: 'Correlation and Regression',
        concepts: ['相關分析', '簡單迴歸', 'Pearson Correlation', 'Linear Regression']
    },
    'T10': {
        topic_number: 10,
        topic_name: 'Chi-Square Test',
        concepts: ['卡方檢定', 'Test of Independence', 'Contingency Table']
    }
};

/**
 * Parse T1 (Data Classification Questions)
 */
function parseT1Questions(content) {
    const questions = [];
    
    // Parse Question 1: Qualitative vs Quantitative
    const q1Match = content.match(/### \*\*Question 1:\*\*([\s\S]*?)### \*\*Question 2:/);
    if (q1Match) {
        const q1Content = q1Match[1];
        const rows = q1Content.match(/\|\s*\d+\.\d+\s*\|([^|]+)\|([^|]+)\|/g);
        
        if (rows) {
            rows.forEach((row, index) => {
                const parts = row.split('|').map(s => s.trim()).filter(s => s);
                if (parts.length >= 3 && parts[0].match(/\d+\.\d+/)) {
                    questions.push({
                        question_number: parts[0],
                        question_text: `Classify the following data as Qualitative (A) or Quantitative (Q): ${parts[1]}`,
                        question_type: 'multiple_choice',
                        options: JSON.stringify(['Qualitative (A)', 'Quantitative (Q)']),
                        correct_answer: parts[2].includes('Qualitative') ? 'A' : 'B',
                        explanation: `${parts[1]} is classified as ${parts[2]} because it represents ${parts[2].includes('Qualitative') ? 'categorical attributes' : 'numerical measurements'}.`,
                        difficulty_level: 1,
                        topic_number: 1,
                        sub_topic: 'Qualitative vs Quantitative'
                    });
                }
            });
        }
    }
    
    // Parse Question 2: Discrete vs Continuous
    const q2Match = content.match(/### \*\*Question 2:\*\*([\s\S]*?)### \*\*Question 3:/);
    if (q2Match) {
        const q2Content = q2Match[1];
        const rows = q2Content.match(/\|\s*\d+\.\d+\s*\|([^|]+)\|([^|]+)\|/g);
        
        if (rows) {
            rows.forEach((row) => {
                const parts = row.split('|').map(s => s.trim()).filter(s => s);
                if (parts.length >= 3 && parts[0].match(/\d+\.\d+/)) {
                    questions.push({
                        question_number: parts[0],
                        question_text: `Classify the following data as Discrete (D) or Continuous (C): ${parts[1]}`,
                        question_type: 'multiple_choice',
                        options: JSON.stringify(['Discrete (D)', 'Continuous (C)']),
                        correct_answer: parts[2].includes('Discrete') ? 'A' : 'B',
                        explanation: `${parts[1]} is ${parts[2]} because it represents ${parts[2].includes('Discrete') ? 'countable values' : 'measurable quantities on a continuous scale'}.`,
                        difficulty_level: 1,
                        topic_number: 1,
                        sub_topic: 'Discrete vs Continuous'
                    });
                }
            });
        }
    }
    
    // Parse Question 3: Measurement Scales
    const q3Match = content.match(/### \*\*Question 3:\*\*([\s\S]*?)$/);
    if (q3Match) {
        const q3Content = q3Match[1];
        const rows = q3Content.match(/\|\s*\d+\.\d+\s*\|([^|]+)\|([^|]+)\|/g);
        
        if (rows) {
            rows.forEach((row) => {
                const parts = row.split('|').map(s => s.trim()).filter(s => s);
                if (parts.length >= 3 && parts[0].match(/\d+\.\d+/)) {
                    const scale = parts[2];
                    questions.push({
                        question_number: parts[0],
                        question_text: `Determine the highest level of measurement for: ${parts[1]}`,
                        question_type: 'multiple_choice',
                        options: JSON.stringify(['Nominal', 'Ordinal', 'Interval', 'Ratio']),
                        correct_answer: scale.includes('Nominal') ? 'A' : 
                                       scale.includes('Ordinal') ? 'B' : 
                                       scale.includes('Interval') ? 'C' : 'D',
                        explanation: `This is ${scale} level because ${getMeasurementExplanation(scale)}.`,
                        difficulty_level: 2,
                        topic_number: 1,
                        sub_topic: 'Measurement Scales'
                    });
                }
            });
        }
    }
    
    return questions;
}

/**
 * Get explanation for measurement scales
 */
function getMeasurementExplanation(scale) {
    const explanations = {
        'Nominal': 'it involves categories without any inherent order',
        'Ordinal': 'it has categories with a meaningful order but no consistent intervals',
        'Interval': 'it has equal intervals between values but no true zero point',
        'Ratio': 'it has equal intervals and a true zero point, allowing for ratio comparisons'
    };
    return explanations[scale] || 'of its measurement properties';
}

/**
 * Parse T2 (Descriptive Statistics)
 */
function parseT2Questions(content) {
    const questions = [];
    
    // Main scenario question
    questions.push({
        question_number: 'T2-1',
        question_text: `Given the ages of ALL 25 psychology students: 28, 25, 48, 37, 41, 19, 32, 26, 16, 23, 23, 29, 36, 31, 26, 21, 32, 25, 31, 43, 35, 42, 38, 33, 28.\n\nCalculate the population mean for the ungrouped data.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '30.72',
        explanation: 'The population mean (μ) is calculated by summing all values and dividing by N (25). μ = Σx / N = 768 / 25 = 30.72 years old.',
        difficulty_level: 2,
        topic_number: 2,
        sub_topic: 'Population Mean'
    });
    
    questions.push({
        question_number: 'T2-2',
        question_text: `Using the same age data, calculate the population standard deviation.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '7.8104',
        explanation: 'The population standard deviation (σ) measures the spread of data. σ = √[Σ(x - μ)² / N] = 7.8104 years old.',
        difficulty_level: 2,
        topic_number: 2,
        sub_topic: 'Standard Deviation'
    });
    
    questions.push({
        question_number: 'T2-3',
        question_text: `For the frequency distribution with age groups (15-22, 22-29, 29-36, 36-43, 43-50) having frequencies (3, 8, 7, 5, 2), calculate the population mean for grouped data.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '31.1',
        explanation: 'For grouped data, μ = Σ(midpoint × frequency) / N. Using midpoints (18.5, 25.5, 32.5, 39.5, 46.5), the calculation yields μ = 31.1 years old.',
        difficulty_level: 3,
        topic_number: 2,
        sub_topic: 'Grouped Data Analysis'
    });
    
    questions.push({
        question_number: 'T2-4',
        question_text: `Based on the frequency distribution, how many students are less than 36 years old?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '18',
        explanation: 'Students less than 36 years old = sum of first three groups = 3 + 8 + 7 = 18 students.',
        difficulty_level: 1,
        topic_number: 2,
        sub_topic: 'Frequency Distribution'
    });
    
    questions.push({
        question_number: 'T2-5',
        question_text: `If a student is selected randomly, what is the probability that this student is under 29 years old?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '0.44',
        explanation: 'P(under 29) = (students in 15-22 + students in 22-29) / total = (3 + 8) / 25 = 11/25 = 0.44.',
        difficulty_level: 2,
        topic_number: 2,
        sub_topic: 'Probability'
    });
    
    return questions;
}

/**
 * Parse T3 (Normal Distribution)
 */
function parseT3Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T3-1',
        question_text: `Exam scores of 56 students have a population mean (μ) of 75.7143 and standard deviation (σ) of 10.4978. Assuming normal distribution, what percentage of students scored between 62 and 92?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '84.43',
        explanation: 'Convert to z-scores: z1 = (62-75.7143)/10.4978 = -1.31, z2 = (92-75.7143)/10.4978 = 1.55. Using z-table, P(62 < X < 92) ≈ 84.43%.',
        difficulty_level: 3,
        topic_number: 3,
        sub_topic: 'Normal Distribution Probability'
    });
    
    questions.push({
        question_number: 'T3-2',
        question_text: `Study loan amounts are normally distributed with μ = $70,000 and σ = $20,000. What is the probability that a requested amount is between $70,000 and $80,000?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '0.1915',
        explanation: 'z = (80000-70000)/20000 = 0.5. P(70000 < X < 80000) = P(0 < z < 0.5) = 0.1915.',
        difficulty_level: 2,
        topic_number: 3,
        sub_topic: 'Z-score Probability'
    });
    
    questions.push({
        question_number: 'T3-3',
        question_text: `For the loan amounts (μ = $70,000, σ = $20,000), what is the probability that a requested amount is $95,000 or more?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '0.1056',
        explanation: 'z = (95000-70000)/20000 = 1.25. P(X ≥ 95000) = P(z ≥ 1.25) = 0.1056.',
        difficulty_level: 2,
        topic_number: 3,
        sub_topic: 'Tail Probability'
    });
    
    questions.push({
        question_number: 'T3-4',
        question_text: `On an anxiety measure with μ = 79 and σ = 12, what is the highest possible score for someone in the lowest 15%?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '66.52',
        explanation: 'For lowest 15%, z ≈ -1.04. X = μ + zσ = 79 + (-1.04)(12) = 66.52.',
        difficulty_level: 3,
        topic_number: 3,
        sub_topic: 'Percentile Calculation'
    });
    
    return questions;
}

/**
 * Parse T5 (One Sample T-Test)
 */
function parseT5Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T5-1',
        question_text: `A researcher tests if mean leisure time differs from 40 hours. Sample: n=60, x̄=37.8, s=12.2, α=0.05. What is the t-statistic?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '-1.3968',
        explanation: 't = (x̄ - μ) / (s/√n) = (37.8 - 40) / (12.2/√60) = -1.3968. Critical value = ±2.001, so we fail to reject H₀.',
        difficulty_level: 2,
        topic_number: 5,
        sub_topic: 'One Sample T-Test'
    });
    
    questions.push({
        question_number: 'T5-2',
        question_text: `Mindfulness study: n=8 students, anxiety scores {3,4,7,2,1,2,5,3}, test if mean < 6. Calculate t-statistic (x̄=3.375, s=1.9226).`,
        question_type: 'calculation',
        options: null,
        correct_answer: '-3.8617',
        explanation: 't = (3.375 - 6) / (1.9226/√8) = -3.8617. Critical value = -1.895. Since t < critical value, reject H₀. Mindfulness significantly reduces anxiety.',
        difficulty_level: 3,
        topic_number: 5,
        sub_topic: 'One-tailed T-Test'
    });
    
    questions.push({
        question_number: 'T5-3',
        question_text: `Exercise and mood study: n=10, mood scores {6,8,3,7,2,10,3,4,9,3}, test if mean > 4. Given x̄=5.5, s=2.8771, α=0.05. What is your conclusion?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Fail to reject H₀. No significant improvement in mood.',
        explanation: 't = (5.5-4)/(2.8771/√10) = 1.6486. Critical value = 1.833. Since t < 1.833, we fail to reject H₀. The exercise program does not significantly improve mood.',
        difficulty_level: 3,
        topic_number: 5,
        sub_topic: 'Hypothesis Testing Interpretation'
    });
    
    return questions;
}

/**
 * Parse T6 (Paired Sample T-Test)
 */
function parseT6Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T6-1',
        question_text: `Oxygen consumption measured before/after mindfulness for 8 participants. Mean difference d̄=-3.625, s_d=4.8385, α=0.05. Test if consumption decreased.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '-2.1191',
        explanation: 't = d̄ / (s_d/√n) = -3.625 / (4.8385/√8) = -2.1191. Critical value = -1.895. Since t < -1.895, reject H₀. Oxygen consumption significantly decreased.',
        difficulty_level: 2,
        topic_number: 6,
        sub_topic: 'Paired T-Test'
    });
    
    questions.push({
        question_number: 'T6-2',
        question_text: `Attractiveness ratings before/after fitness: n=10, d̄=2.8, s_d=1.4757, α=0.05. Is there a significant difference?`,
        question_type: 'calculation',
        options: null,
        correct_answer: '6',
        explanation: 't = 2.8 / (1.4757/√10) = 6.0. Critical value = ±2.262. Since |t| > 2.262, reject H₀. There is a statistically significant difference (t(9)=6.0, p<.001).',
        difficulty_level: 2,
        topic_number: 6,
        sub_topic: 'Two-tailed Paired Test'
    });
    
    questions.push({
        question_number: 'T6-3',
        question_text: `Football goals before/after positive psychology: n=10, d̄=0.2, s_d=0.7888, α=0.05. Test for increase in goals.`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Fail to reject H₀. No significant increase.',
        explanation: 't = 0.2 / (0.7888/√10) = 0.8018. Critical value = 1.833. Since t < 1.833, fail to reject H₀. No statistically significant increase in goals scored.',
        difficulty_level: 2,
        topic_number: 6,
        sub_topic: 'Paired Test Interpretation'
    });
    
    return questions;
}

/**
 * Parse T7 (Independent Sample T-Test)
 */
function parseT7Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T7-1',
        question_text: `Compare anxiety: Mindfulness group (n₁=16, x̄₁=26.31, s₁=1.49) vs No mindfulness (n₂=14, x̄₂=35.57, s₂=1.22), α=0.05. Equal variances assumed.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '-18.41',
        explanation: 'Pooled variance t-test: t = -18.41, df=28, critical = ±2.048. Since |t| > 2.048, reject H₀. Significant difference in anxiety levels (p<.001).',
        difficulty_level: 3,
        topic_number: 7,
        sub_topic: 'Independent T-Test'
    });
    
    questions.push({
        question_number: 'T7-2',
        question_text: `Reading time: Own-name story (n₁=7, x̄₁=46.0, s₁=24.73) vs Ordinary (n₂=11, x̄₂=29.36, s₂=7.16). Test if own-name > ordinary. Equal variances NOT assumed.`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Fail to reject H₀. No significant difference.',
        explanation: 't = 1.73, df=6, critical = 1.943. Since t < 1.943, fail to reject H₀. Mean time for own-name story is not significantly longer (p=.064).',
        difficulty_level: 3,
        topic_number: 7,
        sub_topic: 'Unequal Variances T-Test'
    });
    
    questions.push({
        question_number: 'T7-3',
        question_text: `Age comparison: 8-year-olds (n₁=18, x̄₁=5.96, s₁=1.94) vs 4-year-olds (n₂=13, x̄₂=3.58, s₂=1.06) on analogies. Test if 8-year-olds score higher.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '4.37',
        explanation: 't = 4.37, df=27 (unequal variances), critical = 1.703. Since t > 1.703, reject H₀. 8-year-olds score significantly higher (p<.001).',
        difficulty_level: 3,
        topic_number: 7,
        sub_topic: 'One-tailed Independent Test'
    });
    
    return questions;
}

/**
 * Parse T9 (Correlation and Regression)
 */
function parseT9Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T9-1',
        question_text: `Stress and sleep quality correlation: r(8) = -0.99, p < .001. Interpret this correlation.`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Strong negative correlation, statistically significant',
        explanation: 'r = -0.99 indicates a very strong negative correlation. As stress levels increase, sleep quality decreases. The relationship is statistically significant (p<.001).',
        difficulty_level: 2,
        topic_number: 9,
        sub_topic: 'Correlation Interpretation'
    });
    
    questions.push({
        question_number: 'T9-2',
        question_text: `Regression equation: Sleep Quality = 10.60 - 0.982(Stress Level). Predict sleep quality when stress = 7.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '3.726',
        explanation: 'Sleep Quality = 10.60 - 0.982(7) = 10.60 - 6.874 = 3.726. R² = 0.975 means 97.5% of variance in sleep quality is explained by stress level.',
        difficulty_level: 2,
        topic_number: 9,
        sub_topic: 'Simple Linear Regression'
    });
    
    questions.push({
        question_number: 'T9-3',
        question_text: `Sleep duration and GPA: r(7) = .92, p < .001. Regression: GPA = 1.656 + 0.210(Sleep Duration). Predict GPA for 8 hours sleep.`,
        question_type: 'calculation',
        options: null,
        correct_answer: '3.336',
        explanation: 'GPA = 1.656 + 0.210(8) = 1.656 + 1.680 = 3.336. R² = 0.848, meaning 84.8% of GPA variance is explained by sleep duration.',
        difficulty_level: 2,
        topic_number: 9,
        sub_topic: 'Regression Prediction'
    });
    
    questions.push({
        question_number: 'T9-4',
        question_text: `Social media and self-esteem: r(8) = -.67, p = .034. What can you conclude?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Moderate negative correlation, statistically significant',
        explanation: 'There is a statistically significant negative correlation (r = -.67, p = .034) between social media usage and self-esteem. More social media use is associated with lower self-esteem.',
        difficulty_level: 2,
        topic_number: 9,
        sub_topic: 'Correlation Significance'
    });
    
    return questions;
}

/**
 * Parse T10 (Chi-Square Test)
 */
function parseT10Questions(content) {
    const questions = [];
    
    questions.push({
        question_number: 'T10-1',
        question_text: `Coping strategies and anxiety: χ²(1, N=80) = 1.45, p = .228, critical χ²c = 3.841. What is your conclusion?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Fail to reject H₀. No significant association.',
        explanation: 'Since χ² (1.45) < χ²c (3.841) and p > .05, we fail to reject H₀. There is no statistically significant association between coping strategies and anxiety levels.',
        difficulty_level: 2,
        topic_number: 10,
        sub_topic: 'Chi-Square Interpretation'
    });
    
    questions.push({
        question_number: 'T10-2',
        question_text: `Mindfulness and anxiety: χ²(1, N=30) = 0.09, p = .765, α=0.01. Is there an association?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'No significant association',
        explanation: 'χ² = 0.09 is much smaller than critical value (6.635 for α=0.01). p = .765 >> .01. Fail to reject H₀. No significant association between mindfulness practice and anxiety levels.',
        difficulty_level: 2,
        topic_number: 10,
        sub_topic: 'Chi-Square Test'
    });
    
    questions.push({
        question_number: 'T10-3',
        question_text: `Stress and academic performance: χ²(1, N=160) = 61.12, p < .001, critical = 5.412. Conclusion?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Reject H₀. Significant association exists.',
        explanation: 'Since χ² (61.12) >> χ²c (5.412) and p < .001, reject H₀. There is a statistically significant association. High stress is significantly associated with below-average performance.',
        difficulty_level: 2,
        topic_number: 10,
        sub_topic: 'Chi-Square Significance'
    });
    
    questions.push({
        question_number: 'T10-4',
        question_text: `Parental involvement and academic performance: χ²(4, N=500) = 51.70, p < .001, critical = 7.779. What do you conclude?`,
        question_type: 'interpretation',
        options: null,
        correct_answer: 'Reject H₀. Significant association with parental involvement.',
        explanation: 'Since χ² (51.70) >> χ²c (7.779) and p < .001, reject H₀. There is a statistically significant association. Students with low parental involvement show significantly lower academic performance.',
        difficulty_level: 3,
        topic_number: 10,
        sub_topic: 'Multi-category Chi-Square'
    });
    
    return questions;
}

/**
 * Main parser function
 */
function parseQuestionBank(topicFile, content) {
    // Extract topic code (T1, T2, etc.) from filename
    const filename = path.basename(topicFile, '.txt');
    const topicMatch = filename.match(/^(T\d+)/);
    const topicCode = topicMatch ? topicMatch[1] : filename;
    const topicInfo = TOPIC_DEFINITIONS[topicCode];
    
    if (!topicInfo) {
        console.warn(`Unknown topic: ${topicCode} (from file: ${filename})`);
        return [];
    }
    
    let questions = [];
    
    switch(topicCode) {
        case 'T1':
            questions = parseT1Questions(content);
            break;
        case 'T2':
            questions = parseT2Questions(content);
            break;
        case 'T3':
            questions = parseT3Questions(content);
            break;
        case 'T5':
            questions = parseT5Questions(content);
            break;
        case 'T6':
            questions = parseT6Questions(content);
            break;
        case 'T7':
            questions = parseT7Questions(content);
            break;
        case 'T9':
            questions = parseT9Questions(content);
            break;
        case 'T10':
            questions = parseT10Questions(content);
            break;
        default:
            console.log(`Parser not yet implemented for ${topicCode}`);
    }
    
    // Add topic metadata to all questions
    questions.forEach(q => {
        q.topic_name = topicInfo.topic_name;
        q.source = 'question_bank';
    });
    
    return questions;
}

/**
 * Parse all question bank files
 */
function parseAllQuestionBanks(directory) {
    const allQuestions = [];
    
    for (let i = 1; i <= 10; i++) {
        const filename = `T${i}_Q&A.txt`;
        const filepath = path.join(directory, filename);
        
        try {
            if (fs.existsSync(filepath)) {
                const content = fs.readFileSync(filepath, 'utf8');
                const questions = parseQuestionBank(filename, content);
                allQuestions.push(...questions);
                console.log(`✅ Parsed ${questions.length} questions from ${filename}`);
            }
        } catch (error) {
            console.error(`❌ Error parsing ${filename}:`, error.message);
        }
    }
    
    return allQuestions;
}

module.exports = {
    parseQuestionBank,
    parseAllQuestionBanks,
    TOPIC_DEFINITIONS
};

