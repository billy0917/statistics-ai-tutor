/**
 * Import Question Bank to Database
 * This script reads question bank files and imports them into Supabase
 */

require('dotenv').config();
const { db } = require('../config/supabase');
const { parseAllQuestionBanks, TOPIC_DEFINITIONS } = require('../utils/questionBankParser');
const path = require('path');

/**
 * Map concept name to Chinese equivalent for consistency
 */
function mapConceptName(topicNumber, subTopic) {
    const conceptMap = {
        1: '描述統計', // Data types
        2: '描述統計', // Descriptive statistics
        3: '描述統計', // Normal distribution (part of descriptive stats)
        4: '描述統計', // Sampling distribution
        5: '單樣本t檢定',
        6: '配對樣本t檢定',
        7: '獨立樣本t檢定',
        8: '描述統計', // Sample size
        9: '相關分析', // Correlation and regression
        10: '卡方檢定'
    };
    
    return conceptMap[topicNumber] || '描述統計';
}

/**
 * Import questions to database
 */
async function importQuestionBank() {
    try {
        console.log('🚀 Starting Question Bank Import...\n');
        
        // Parse question bank files from parent directory
        const questionBankDir = path.join(__dirname, '..', '..');
        const questions = parseAllQuestionBanks(questionBankDir);
        
        console.log(`\n📊 Total questions parsed: ${questions.length}\n`);
        
        if (questions.length === 0) {
            console.log('⚠️ No questions to import. Check if question bank files exist.');
            return;
        }
        
        // First, ensure topic metadata exists in statistical_concepts table
        console.log('📝 Ensuring topic definitions exist in database...');
        for (const [topicCode, topicInfo] of Object.entries(TOPIC_DEFINITIONS)) {
            const conceptName = mapConceptName(topicInfo.topic_number, '');
            
            // Check if concept exists
            const { data: existing } = await db.client
                .from('statistical_concepts')
                .select('concept_id')
                .eq('concept_name', conceptName)
                .single();
            
            if (!existing) {
                // Insert concept
                const { error } = await db.client
                    .from('statistical_concepts')
                    .insert({
                        concept_name: conceptName,
                        description: topicInfo.topic_name,
                        related_keywords: topicInfo.concepts
                    });
                
                if (error) {
                    console.log(`⚠️ Could not insert concept ${conceptName}: ${error.message}`);
                } else {
                    console.log(`✅ Added concept: ${conceptName}`);
                }
            }
        }
        
        console.log('\n💾 Importing questions to database...\n');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Import questions in batches
        const batchSize = 10;
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            
            for (const question of batch) {
                try {
                    // Map to database schema
                    const dbQuestion = {
                        concept_name: mapConceptName(question.topic_number, question.sub_topic),
                        question_text: question.question_text,
                        question_type: question.question_type,
                        options: question.options,
                        correct_answer: question.correct_answer,
                        explanation: question.explanation,
                        difficulty_level: question.difficulty_level,
                        // Additional metadata stored in a JSON field or separate columns
                        topic_number: question.topic_number,
                        topic_name: question.topic_name,
                        sub_topic: question.sub_topic,
                        question_number: question.question_number,
                        source: 'question_bank'
                    };
                    
                    const { data, error } = await db.client
                        .from('practice_questions')
                        .insert([dbQuestion])
                        .select();
                    
                    if (error) {
                        console.error(`❌ Error importing ${question.question_number}: ${error.message}`);
                        errorCount++;
                    } else {
                        console.log(`✅ Imported ${question.question_number}: ${question.topic_name} - ${question.sub_topic}`);
                        successCount++;
                    }
                    
                } catch (err) {
                    console.error(`❌ Exception importing ${question.question_number}:`, err.message);
                    errorCount++;
                }
            }
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Import Summary:');
        console.log(`   ✅ Successfully imported: ${successCount} questions`);
        console.log(`   ❌ Failed: ${errorCount} questions`);
        console.log(`   📝 Total processed: ${questions.length} questions`);
        console.log('='.repeat(60) + '\n');
        
        if (successCount > 0) {
            console.log('🎉 Question bank import completed successfully!');
        } else {
            console.log('⚠️ No questions were imported. Please check database connection and schema.');
        }
        
    } catch (error) {
        console.error('❌ Fatal error during import:', error);
        process.exit(1);
    }
}

// Run the import
if (require.main === module) {
    importQuestionBank()
        .then(() => {
            console.log('\n✨ Import script finished.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importQuestionBank };




