FROM node:20-slim

# ── System deps + tmux + zsh + Playwright browser deps ───
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    tmux \
    gosu \
    zsh \
    gnupg \
    wget \
    vim \
    ripgrep \
    sudo \
    # Native module compilation (node-gyp / @rollup/rollup-linux-x64-gnu)
    python3 \
    make \
    g++ \
    # Playwright Chromium dependencies
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# ── GitHub CLI ────────────────────────────────────────────
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# ── Supabase CLI ──────────────────────────────────────────
RUN curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash

# ── Claude Code + MCP servers (pre-cached for fast startup) ─
RUN npm install -g @anthropic-ai/claude-code \
    @modelcontextprotocol/server-filesystem \
    @modelcontextprotocol/server-github \
    @modelcontextprotocol/server-memory \
    @modelcontextprotocol/server-slack \
    @upstash/context7-mcp \
    @magicuidesign/mcp

# ── Non-root user (reuse node UID 1000) ──────────────────
RUN usermod -l claude -d /home/claude -m node && groupmod -n claude node \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/claude \
    && chmod 0440 /etc/sudoers.d/claude

# ── Shell config ──────────────────────────────────────────
# Simple alias — credential restoration is handled by entrypoint.sh
RUN echo 'alias claude="command claude --dangerously-skip-permissions"' >> /home/claude/.bashrc && \
    echo 'alias claude="command claude --dangerously-skip-permissions"' >> /home/claude/.zshrc

# ── Environment ───────────────────────────────────────────
ENV CLAUDE_CONFIG_DIR=/home/claude/.claude

# ── Tmux config ──────────────────────────────────────────
RUN echo 'set -g mouse on' > /home/claude/.tmux.conf && \
    echo 'set -g base-index 1' >> /home/claude/.tmux.conf && \
    chown claude:claude /home/claude/.tmux.conf

# ── Install Playwright browsers ──────────────────────────
RUN npx playwright install chromium

# ── Entrypoint ────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
