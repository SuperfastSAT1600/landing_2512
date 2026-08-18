# AI Crawler Access Analysis Skill

This document provides comprehensive guidance for analyzing website accessibility to AI crawlers—the automated systems that power AI search products and training pipelines.

## Core Purpose

The skill evaluates whether a website allows access to AI crawlers from major operators like OpenAI, Anthropic, Google, and others. Since AI crawlers determine content visibility in AI-generated responses, blocking them effectively makes content invisible to these emerging search surfaces.

## Key Finding

A 2025 study noted that "over 35% of the top 1,000 websites block at least one major AI crawler." This oversight directly impacts AI search visibility, making crawler configuration a foundational SEO concern.

## Crawler Tiers

**Tier 1 (Critical for AI Search):** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, and PerplexityBot—all power active user-facing search features where allowing access maximizes discoverability.

**Tier 2 (Broader Ecosystem):** Google-Extended, Applebot-Extended, Amazonbot, and FacebookBot serve large platforms with billions of users and should generally be allowed.

**Tier 3 (Training-Only):** CCBot, anthropic-ai, and cohere-ai primarily support model training rather than live search—blocking them doesn't affect search visibility but does restrict training presence.

## Analysis Workflow

The procedure involves checking robots.txt files, examining meta robots tags and HTTP headers across sample pages, verifying AI-specific files (llms.txt, ai-plugin.json), and assessing JavaScript rendering requirements that might prevent crawler access.

## Scoring Methodology

The AI Crawler Access Score weights Tier 1 allowance (50%), Tier 2 allowance (25%), absence of blanket blocks (15%), and presence of AI-specific guidance files (10%), producing a final score from 0–100.