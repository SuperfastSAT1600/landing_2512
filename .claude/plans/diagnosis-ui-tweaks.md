# Diagnosis UI Tweaks

## Overview
Small UI text and layout fixes for the diagnostic test flow.

## Requirements

- REQ-001 (MANUAL): Remove "SAT Diagnostic Test" title from info-entry phase
- REQ-002 (MANUAL): Change Korean text to English on intro screen (30min, 25 questions, Start Test)
- REQ-003 (BROWSER): Fix "Question X of 25" footer to be centered and fixed at bottom
- REQ-004 (MANUAL): Change completion screen to English, remove CTA buttons

## Files
- `src/app/diagnosis/page.tsx` - REQ-001, REQ-002
- `src/app/diagnosis/components/DiagnosticTestView.tsx` - REQ-002, REQ-003
- `src/app/diagnosis/components/TestSubmittedScreen.tsx` - REQ-004
