# GEO Audit Orchestration Skill

This document outlines a comprehensive **Generative Engine Optimization (GEO) audit framework** designed to measure how well websites perform across AI discovery, citation, and recommendation dimensions.

## Core Purpose

GEO differs from traditional SEO by focusing on optimization for AI systems (ChatGPT, Claude, Perplexity, Gemini) rather than search engine rankings. Research indicates sites with strong GEO metrics experience "30-115% more visibility in AI-generated responses."

## Audit Structure

The framework operates through three phases:

**Phase 1: Discovery** — Fetches the homepage, classifies business type (SaaS, Local, E-commerce, Publisher, Agency), crawls up to 50 pages via sitemap or internal links, and collects standardized page-level metadata.

**Phase 2: Parallel Analysis** — Delegates specialized evaluation across five dimensions:
- AI Citability (content quotability)
- Brand Authority (third-party mentions)
- Technical Infrastructure (crawler access, llms.txt)
- Content E-E-A-T (expertise and trustworthiness)
- Schema & Structured Data (markup validation)

**Phase 3: Scoring** — Produces a composite GEO Score (0-100) using weighted category scores, severity-classified issues, and a prioritized 30-day action plan.

## Key Constraints

- Maximum 50 pages analyzed per audit
- 30-second timeout per page fetch
- Robots.txt compliance required
- 1-second minimum delay between requests
- Critical, High, Medium, and Low severity classifications for all issues

The audit generates a markdown report with executive summary, issue triage, category deep-dives, quick wins, and an appendix of analyzed pages.