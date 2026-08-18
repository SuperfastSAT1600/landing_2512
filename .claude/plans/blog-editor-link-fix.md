# Blog Editor Link Fix

## Requirements

### REQ-001: Link extension registered
- `@tiptap/extension-link` added to editor extensions so `setLink` command works
- **Verification**: (MANUAL) Link button applies link to selected text

### REQ-002: Bubble menu link button
- TextBubbleMenu shows link button; active when cursor is in a link; click prompts URL or unsets
- **Verification**: (BROWSER)

### REQ-003: Toolbar link button active state
- Toolbar Link2 button shows active style when cursor is inside a link
- **Verification**: (BROWSER)
