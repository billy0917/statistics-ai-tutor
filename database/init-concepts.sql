-- 初始化統計概念表
-- 在 Supabase SQL Editor 中執行此腳本

-- 插入 8 個核心統計概念
INSERT INTO statistical_concepts (concept_name, category, difficulty_level, description, prerequisites)
VALUES 
    ('描述統計', 'basic_stats', 1, '描述性統計是使用數值和圖表來總結和呈現資料特徵的方法，包括集中趨勢測量（平均數、中位數、眾數）和變異性測量（標準差、變異數、範圍）。', '{}'),
    ('標準差', 'basic_stats', 1, '標準差是測量資料變異程度的統計量，表示資料點與平均數的平均距離。標準差越大，資料分散程度越高；標準差越小，資料越集中。', '{"描述統計"}'),
    ('單樣本t檢定', 'hypothesis_testing', 2, '單樣本t檢定用於比較單一樣本的平均數與已知或假設的母體平均數是否有顯著差異。常用於檢驗樣本是否來自特定母體。', '{"描述統計", "標準差"}'),
    ('獨立樣本t檢定', 'hypothesis_testing', 2, '獨立樣本t檢定用於比較兩個獨立群體的平均數是否有顯著差異。兩組樣本之間沒有配對或相關關係，每個觀察值只屬於一個群體。', '{"描述統計", "標準差", "單樣本t檢定"}'),
    ('配對樣本t檢定', 'hypothesis_testing', 2, '配對樣本t檢定用於比較相關或配對樣本的平均數差異，例如前測與後測、或同一對象在不同條件下的表現。適用於重複測量設計。', '{"描述統計", "標準差", "單樣本t檢定"}'),
    ('相關分析', 'correlation', 2, '相關分析用於探討兩個連續變數之間的線性關係強度和方向。相關係數r的範圍從-1（完全負相關）到+1（完全正相關），0表示無線性相關。', '{"描述統計"}'),
    ('簡單迴歸', 'regression', 3, '簡單線性迴歸分析一個自變數（預測變數）與一個依變數（結果變數）之間的線性關係，建立預測模型。可用於預測和解釋變數間的因果關係。', '{"相關分析"}'),
    ('卡方檢定', 'hypothesis_testing', 2, '卡方檢定用於檢驗類別變數之間是否存在關聯性，或觀察到的頻率分布是否符合預期分布。常用於適合度檢定和獨立性檢定。', '{"描述統計"}')
ON CONFLICT (concept_name) 
DO UPDATE SET
    category = EXCLUDED.category,
    difficulty_level = EXCLUDED.difficulty_level,
    description = EXCLUDED.description,
    prerequisites = EXCLUDED.prerequisites;

-- 檢查插入結果
SELECT * FROM statistical_concepts ORDER BY difficulty_level, concept_name;

