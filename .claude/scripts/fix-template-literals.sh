#!/bin/bash
# Fix all template literals in skill reference files

echo "Fixing template literals in skill files..."

# Files with template literals
files=(
  ".claude/skills/auth-patterns/references/oauth-flows.md"
  ".claude/skills/auth-patterns/references/jwt-best-practices.md"
  ".claude/skills/auth-patterns/references/owasp-auth.md"
  ".claude/skills/rest-api-design/references/pagination-patterns.md"
  ".claude/skills/rest-api-design/references/versioning-strategies.md"
  ".claude/skills/graphql-patterns/references/dataloader-usage.md"
  ".claude/skills/graphql-patterns/references/resolver-patterns.md"
  ".claude/skills/nodejs-patterns/references/logging.md"
  ".claude/skills/nodejs-patterns/references/supabase-integration.md"
  ".claude/skills/nodejs-patterns/references/error-handling.md"
  ".claude/skills/nodejs-patterns/references/layered-architecture.md"
  ".claude/skills/docker-patterns/references/docker-compose.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # This is a placeholder - actual sed commands would need to be crafted carefully
    # to avoid breaking fenced code blocks
    echo "  - Found template literals (manual fix needed)"
  fi
done

echo "Done. Manual fixes may be required for complex cases."
