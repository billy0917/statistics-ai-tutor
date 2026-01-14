# AI Prompts Configuration

This folder contains the system prompts used for different AI interactions in the Statistics AI Tutor system.

## Files

### `chat-system-prompt.md`
The main system prompt for the AI teaching assistant in the chat interface.

**Where to use**: FastGPT Platform (https://maas.eduhk.hk)

**Key principles**:
- ✅ ONE Socratic question per response
- ✅ Never give direct answers
- ✅ Always start with encouragement
- ✅ Keep responses short (3-5 sentences + 1 question)

**How to update**:
1. Edit the prompt file in this folder
2. Copy the content to FastGPT platform's system prompt configuration
3. Test the changes with sample questions
4. Commit the updated file to version control

## Version History

- **2026-01-14**: Modified to enforce ONE question per response rule for better Socratic dialogue flow
- Previous: Multiple questions per response (could overwhelm students)

## Testing Checklist

When updating prompts, test with these scenarios:

- [ ] Student asks "What is a t-test?"
- [ ] Student gives a partially correct answer
- [ ] Student gives a wrong answer
- [ ] Student gives a completely correct answer
- [ ] Student asks a complex multi-part question

Ensure AI responds with:
- ✅ Only ONE Socratic question
- ✅ Encouraging tone
- ✅ Short response (3-5 sentences)
- ❌ No direct answers
- ❌ No multiple questions in one response

## Notes

- These prompts are **configured on FastGPT platform**, not in the application code
- This folder serves as **version control** and **documentation** for the prompts
- Always test prompt changes in a development environment before deploying to production
