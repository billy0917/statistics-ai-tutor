/**
 * Test Question Bank System
 * This script tests the parser and validates the question format
 */

const { parseAllQuestionBanks, TOPIC_DEFINITIONS } = require('../utils/questionBankParser');
const path = require('path');
const fs = require('fs');

console.log('🧪 Question Bank System Test\n');
console.log('='.repeat(60));

// Test 1: Check if question bank files exist
console.log('\n📁 Test 1: Checking question bank files...');
const questionBankDir = path.join(__dirname, '..', '..');
let filesExist = 0;

for (let i = 1; i <= 10; i++) {
    const filename = `T${i}_Q&A.txt`;
    const filepath = path.join(questionBankDir, filename);
    
    if (fs.existsSync(filepath)) {
        console.log(`  ✅ ${filename} - Found`);
        filesExist++;
    } else {
        console.log(`  ❌ ${filename} - Missing`);
    }
}

console.log(`\nResult: ${filesExist}/10 files found`);

if (filesExist === 0) {
    console.log('\n⚠️ No question bank files found!');
    console.log('Expected location:', questionBankDir);
    console.log('\nPlease ensure T1_Q&A.txt through T10_Q&A.txt are in the correct directory.');
    process.exit(1);
}

// Test 2: Parse questions
console.log('\n📝 Test 2: Parsing questions...');
const questions = parseAllQuestionBanks(questionBankDir);

if (questions.length === 0) {
    console.log('  ❌ No questions parsed');
    process.exit(1);
}

console.log(`  ✅ Successfully parsed ${questions.length} questions`);

// Test 3: Validate question structure
console.log('\n🔍 Test 3: Validating question structure...');
let validCount = 0;
let invalidCount = 0;
const requiredFields = ['question_text', 'question_type', 'correct_answer', 'explanation', 'difficulty_level', 'topic_number'];

questions.forEach((q, index) => {
    const missingFields = requiredFields.filter(field => !q[field]);
    
    if (missingFields.length === 0) {
        validCount++;
    } else {
        invalidCount++;
        if (invalidCount <= 3) { // Show first 3 errors
            console.log(`  ⚠️ Question ${q.question_number || index}: Missing ${missingFields.join(', ')}`);
        }
    }
});

console.log(`  ✅ Valid questions: ${validCount}`);
if (invalidCount > 0) {
    console.log(`  ⚠️ Invalid questions: ${invalidCount}`);
}

// Test 4: Statistics by topic
console.log('\n📊 Test 4: Questions by topic...');
const byTopic = {};

questions.forEach(q => {
    const topic = q.topic_number;
    if (!byTopic[topic]) {
        byTopic[topic] = {
            count: 0,
            difficulties: { 1: 0, 2: 0, 3: 0 },
            types: {}
        };
    }
    
    byTopic[topic].count++;
    byTopic[topic].difficulties[q.difficulty_level] = (byTopic[topic].difficulties[q.difficulty_level] || 0) + 1;
    byTopic[topic].types[q.question_type] = (byTopic[topic].types[q.question_type] || 0) + 1;
});

Object.keys(byTopic).sort((a, b) => a - b).forEach(topic => {
    const topicDef = Object.values(TOPIC_DEFINITIONS).find(t => t.topic_number === parseInt(topic));
    const stats = byTopic[topic];
    
    console.log(`\n  Topic ${topic}: ${topicDef ? topicDef.topic_name : 'Unknown'}`);
    console.log(`    Total: ${stats.count} questions`);
    console.log(`    Difficulty: Basic=${stats.difficulties[1] || 0}, Medium=${stats.difficulties[2] || 0}, Advanced=${stats.difficulties[3] || 0}`);
    console.log(`    Types: ${Object.entries(stats.types).map(([k, v]) => `${k}=${v}`).join(', ')}`);
});

// Test 5: Sample questions
console.log('\n📋 Test 5: Sample questions...');
const sampleTopics = [1, 5, 9];

sampleTopics.forEach(topicNum => {
    const topicQuestions = questions.filter(q => q.topic_number === topicNum);
    if (topicQuestions.length > 0) {
        const sample = topicQuestions[0];
        console.log(`\n  Sample from Topic ${topicNum}:`);
        console.log(`    Question: ${sample.question_text.substring(0, 80)}...`);
        console.log(`    Type: ${sample.question_type}`);
        console.log(`    Difficulty: ${sample.difficulty_level}`);
        console.log(`    Answer: ${sample.correct_answer}`);
    }
});

// Test 6: Question types distribution
console.log('\n📈 Test 6: Question types distribution...');
const typeCount = {};
questions.forEach(q => {
    typeCount[q.question_type] = (typeCount[q.question_type] || 0) + 1;
});

Object.entries(typeCount).forEach(([type, count]) => {
    const percentage = ((count / questions.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percentage}%)`);
});

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`  Total Questions: ${questions.length}`);
console.log(`  Topics Covered: ${Object.keys(byTopic).length}/10`);
console.log(`  Valid Questions: ${validCount}/${questions.length}`);
console.log(`  Files Found: ${filesExist}/10`);

if (validCount === questions.length && filesExist === 10) {
    console.log('\n✅ All tests passed! Question bank is ready for import.');
    console.log('\nNext steps:');
    console.log('  1. Update database schema:');
    console.log('     - Run database/update-question-bank-schema.sql in Supabase');
    console.log('  2. Import questions:');
    console.log('     - npm run import-questions');
    console.log('  3. Test API:');
    console.log('     - npm start');
    console.log('     - Visit http://localhost:3000/api/question-bank/stats');
} else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
}

console.log('='.repeat(60) + '\n');




