---
name: blog-content-creator
description: Specialized agent for creating SAT preparation blog content using AI
version: 1.0.0
author: Blog Agent System
tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
model: sonnet
skills:
  - ../skills/blog-writing-patterns.md
---

# Blog Content Creator Agent

Specialized agent for creating high-quality SAT preparation blog content.

## Capabilities

1. **Content Generation**
   - Generate blog posts on SAT preparation topics
   - Match user's writing style from previous posts
   - Incorporate SAT official materials for accuracy
   - Create engaging, educational content

2. **Style Analysis**
   - Analyze user's existing blog posts
   - Extract tone, voice, and writing patterns
   - Apply consistent style to new content

3. **Research Integration**
   - Search and reference SAT official materials
   - Incorporate web research (future feature)
   - Cite sources properly

4. **Content Management**
   - Save drafts and published posts
   - Organize content by category and tags
   - Generate metadata and frontmatter

## Usage

### Generate a Blog Post

```bash
# Interactive mode
npm run blog:generate

# Or call directly
tsx blog-agent/src/index.ts
```

### Analyze Writing Style

```typescript
import { MyPostsLoader } from './sources/my-posts-loader.js';

const posts = await MyPostsLoader.getSamples(5);
console.log(posts[0].style);
```

### Search SAT Materials

```typescript
import { SATMaterialsLoader } from './sources/sat-materials-loader.js';

const materials = await SATMaterialsLoader.search('reading comprehension');
```

## Workflow

1. **Load Context**
   - Read user's previous posts from `data/my-posts/`
   - Load relevant SAT materials from `data/sat-materials/`
   - Gather web research if enabled

2. **Analyze Style**
   - Extract writing patterns from user's posts
   - Identify tone, complexity, perspective
   - Build style profile

3. **Generate Content**
   - Use Claude API to generate blog post
   - Apply user's writing style
   - Reference SAT materials for accuracy
   - Include proper citations

4. **Save Output**
   - Format as markdown with frontmatter
   - Save to `data/outputs/drafts/`
   - Include metadata and references

## Configuration

Edit `blog-agent/src/config/agent-config.ts`:

```typescript
export const defaultBlogWriterConfig = {
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxTokens: 4000,
  stylePreferences: {
    tone: 'conversational',
    complexity: 'medium',
    perspective: 'second-person'
  }
};
```

## Prompts

Customize prompts in `blog-agent/src/config/prompts.ts`:

- `STYLE_ANALYSIS_PROMPT`: Analyze writing style
- `CONTENT_GENERATION_PROMPT`: Generate blog content
- `SAT_MATERIAL_SEARCH_PROMPT`: Search SAT materials
- `WEB_SEARCH_SYNTHESIS_PROMPT`: Synthesize web research

## Best Practices

1. **Add Reference Posts**: Include 3-5 of your best blog posts in `data/my-posts/`
2. **Organize SAT Materials**: Categorize by type (official-guides, practice-tests, study-tips)
3. **Review Drafts**: Always review and edit generated content before publishing
4. **Provide Context**: Give detailed topics and target audience in requests
5. **Iterate**: Generate multiple versions and pick the best

## Examples

### Generate Post on Reading Comprehension

```typescript
const content = await agent.generatePost({
  topic: 'SAT Reading: Evidence-Based Questions Explained',
  targetAudience: 'High school juniors preparing for SAT',
  desiredLength: 1500,
  includeReferences: true,
  satMaterialsQuery: 'evidence-based reading'
});
```

### Generate Post on Math

```typescript
const content = await agent.generatePost({
  topic: 'SAT Math: Algebra Word Problems Made Easy',
  targetAudience: 'Students struggling with SAT math',
  desiredLength: 1200,
  includeReferences: true,
  satMaterialsQuery: 'algebra word problems'
});
```

## Troubleshooting

### No API Key Error

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_key_here
# Or add to blog-agent/.env
```

### No Posts Found

Add markdown files to `blog-agent/data/my-posts/`:
```markdown
---
title: "Your Post Title"
category: SAT Prep
tags: [tag1, tag2]
---

Your content...
```

### Style Not Matching

- Add more reference posts (3-5 minimum)
- Ensure posts have consistent style
- Review and adjust style preferences in config

## Integration with Main System

This agent integrates with the main Claude Code system:

- Uses shared utilities (file management, logging)
- Follows coding standards from `.claude/rules/`
- Can be invoked via custom commands
- Leverages MCP servers for enhanced capabilities

## Future Enhancements

- [ ] Web search integration
- [ ] Interactive CLI with prompts
- [ ] Batch generation
- [ ] Content templates
- [ ] SEO optimization
- [ ] Social media post generation
- [ ] Content calendar integration
