# Brand Mention Scanner Skill

## Core Concept

The geo-brand-mentions skill analyzes how often and where brands are discussed across platforms that AI systems rely on for training data and entity recognition. According to research cited in this framework, "unlinked brand mentions" correlate approximately 3x more strongly with AI visibility than traditional backlinks.

## Key Finding

The platform matters enormously. A Reddit mention or YouTube video description mentioning a brand may carry more weight for AI citation than a high-authority backlink, because AI training datasets disproportionately index high-engagement platforms.

## Platform Priority Ranking

**YouTube (Strongest Signal - 0.737 correlation)**: AI systems index YouTube transcripts, descriptions, and metadata heavily. The framework emphasizes checking for active channels, third-party mentions, and YouTube search presence.

**Reddit (Second Strongest)**: Reddit is heavily indexed due to Google's $60M/year licensing deal (2024). The skill assesses subreddit discussions, sentiment, official presence, and community recommendations.

**Wikipedia (High Correlation)**: Critical for entity recognition. The framework stresses using the Python API method first rather than relying on search results alone, plus checking Wikidata entries.

**LinkedIn (Moderate Correlation)**: Professional authority signals matter, particularly company page activity and thought leadership posts from employees.

**Other Platforms**: Quora, Stack Overflow, GitHub, news outlets, and podcasts provide supplementary signals.

## Scoring Methodology

The composite score uses weighted percentages: YouTube (25%), Reddit (25%), Wikipedia (20%), LinkedIn (15%), Other Platforms (15%). Scores range from 0-100, with 85+ indicating dominant brand recognition across AI platforms.

The analysis procedure involves systematic platform scanning, sentiment assessment from discussion threads, and competitive benchmarking to contextualize results.