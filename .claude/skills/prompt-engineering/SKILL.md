---
name: prompt-engineering
description: Evidence-based techniques for designing effective LLM prompts including few-shot learning, chain-of-thought reasoning, and prompt injection prevention.
---

# Prompt Engineering

Evidence-based techniques for designing effective LLM prompts from leading AI research and documentation.

**Sources:** Anthropic Claude 4 docs, OpenAI Platform docs, Chain-of-Thought Prompting (Wei et al., arXiv:2201.11903)

---

## Prompt Structure

### Message Roles
- **System**: Role definition, constraints, behavior guidelines
- **User**: Task instructions, input data, questions
- **Assistant**: Previous responses for multi-turn context

### Template Pattern
```
[Role/Context] You are a [role] with [expertise].
[Task] Your task is to [specific action].
[Input] <input>{{DATA}}</input>
[Format] Respond with: [specification]
[Constraints] - Specific requirement 1
```

---

## Core Techniques

### 1. Few-Shot Prompting
Provide 2-5 examples showing desired input-output patterns. Label space and distribution matter more than correctness of individual examples.

```
Examples:
Input: "Show active users"
Output: SELECT * FROM users WHERE status = 'active';

Input: "{{USER_QUERY}}"
Output:
```

### 2. Chain-of-Thought (CoT)
Enable step-by-step reasoning for complex tasks. Use "Let's think step by step" (zero-shot) or provide reasoning demonstrations (few-shot).

```
Analyze for vulnerabilities:
1. Identify all user inputs
2. Trace data flow through code
3. Check validation/sanitization
4. Flag dangerous operations
```

### 3. XML Tags for Structure
Use tags to separate instructions from data (reduces prompt injection risk).

```
<code>{{USER_CODE}}</code>
Review the code above for security issues.
```

---

## Model Parameters

**Temperature** (0-2)
- 0: Deterministic, factual tasks (data extraction, Q&A)
- 0.7: Balanced creativity
- 1.5+: High creativity, brainstorming

**Top-p** (0-1): Alternative to temperature. 0.1 = conservative, 0.9 = diverse

---

## Best Practices

### Be Explicit (Claude 4.x)
- State desired behavior clearly: "Include error handling" not "make it better"
- Add context for why: "No ellipses - used with text-to-speech"
- Request specific features: "Add animations" vs hoping for them

### Output Formatting
- Tell what TO do, not what NOT to do
- Match prompt style to desired output style
- Use XML tags: `<prose>response here</prose>`

### Context Management
- Summarize long documents before processing
- Provide only relevant code snippets
- Track conversation state explicitly

---

## Prompt Injection Prevention

**Input Isolation**: Use delimiters/tags to separate instructions from user data

**Validation**: Filter suspicious patterns ("ignore previous", "new instructions")

**Least Privilege**: Limit model tool access and API permissions

**Output Validation**: Verify model outputs before execution

---

## Anti-Patterns

**Vague**: "Make it better" → "Reduce cyclomatic complexity below 10"

**Missing Context**: "Fix bug" → "Fix null pointer on line 45 when users.find() returns undefined"

**Ambiguous Format**: "Write tests" → "Write Jest tests with AAA pattern, mocking external deps"

---

## Resources

- [Anthropic Claude 4 Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Chain-of-Thought Paper (Wei et al.)](https://arxiv.org/abs/2201.11903)
- [Few-Shot Prompting Guide](https://www.promptingguide.ai/techniques/fewshot)
- [Prompt Injection Prevention (OpenAI)](https://openai.com/index/prompt-injections/)
