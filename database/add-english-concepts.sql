-- 添加英文版本的統計概念
-- 在 Supabase SQL Editor 中執行此腳本

-- 插入英文版本的概念（如果不存在）
INSERT INTO statistical_concepts (concept_name, category, difficulty_level, description, prerequisites)
VALUES 
    ('Descriptive Statistics', 'basic_stats', 1, 'Descriptive statistics summarize and present data characteristics using numerical measures and graphs, including central tendency measures (mean, median, mode) and variability measures (standard deviation, variance, range).', '{}'),
    ('Standard Deviation', 'basic_stats', 1, 'Standard deviation measures the spread of data points around the mean. A larger standard deviation indicates more dispersed data; a smaller one indicates data clustered closer to the mean.', '{"Descriptive Statistics"}'),
    ('One-Sample t-Test', 'hypothesis_testing', 2, 'The one-sample t-test compares a sample mean to a known or hypothesized population mean to determine if there is a significant difference.', '{"Descriptive Statistics", "Standard Deviation"}'),
    ('Independent Samples t-Test', 'hypothesis_testing', 2, 'The independent samples t-test compares the means of two independent groups to determine if there is a significant difference between them.', '{"Descriptive Statistics", "Standard Deviation", "One-Sample t-Test"}'),
    ('Paired Samples t-Test', 'hypothesis_testing', 2, 'The paired samples t-test compares means from related or matched samples, such as pre-test and post-test scores, or the same subjects under different conditions.', '{"Descriptive Statistics", "Standard Deviation", "One-Sample t-Test"}'),
    ('Correlation Analysis', 'correlation', 2, 'Correlation analysis examines the strength and direction of the linear relationship between two continuous variables. The correlation coefficient r ranges from -1 to +1.', '{"Descriptive Statistics"}'),
    ('Simple Regression', 'regression', 3, 'Simple linear regression analyzes the linear relationship between one independent variable and one dependent variable, building a predictive model.', '{"Correlation Analysis"}'),
    ('Chi-Square Test', 'hypothesis_testing', 2, 'The chi-square test examines whether there is an association between categorical variables or whether observed frequencies match expected frequencies.', '{"Descriptive Statistics"}')
ON CONFLICT (concept_name) 
DO UPDATE SET
    category = EXCLUDED.category,
    difficulty_level = EXCLUDED.difficulty_level,
    description = EXCLUDED.description,
    prerequisites = EXCLUDED.prerequisites;

-- 檢查插入結果
SELECT concept_name, category, difficulty_level FROM statistical_concepts ORDER BY difficulty_level, concept_name;
