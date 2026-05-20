# Accessibility Audit Checklist

WCAG 2.1 AA compliance checklist.

---

## Perceivable

### 1.1 Text Alternatives
- [ ] All images have alt text
- [ ] Decorative images have empty alt=""
- [ ] Complex images have long descriptions
- [ ] Icons have accessible names
- [ ] Charts/graphs have text alternatives

### 1.2 Time-based Media
- [ ] Videos have captions
- [ ] Audio has transcripts
- [ ] Auto-playing media can be paused
- [ ] No content seizure risks (flashing)

### 1.3 Adaptable
- [ ] Content structure conveyed semantically
- [ ] Reading order is logical
- [ ] Instructions don't rely on sensory characteristics
- [ ] Orientation not restricted
- [ ] Input purpose identifiable (autocomplete)

### 1.4 Distinguishable
- [ ] Color not sole means of conveying info
- [ ] Audio can be controlled
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Large text contrast ≥ 3:1
- [ ] Text resizable to 200% without loss
- [ ] No horizontal scrolling at 320px width
- [ ] UI component contrast ≥ 3:1
- [ ] Text spacing adjustable
- [ ] Hover/focus content dismissible

---

## Operable

### 2.1 Keyboard Accessible
- [ ] All functionality keyboard accessible
- [ ] No keyboard traps
- [ ] Keyboard shortcuts can be turned off
- [ ] Skip navigation link present
- [ ] Focus order logical

### 2.2 Enough Time
- [ ] Time limits adjustable
- [ ] Moving content can be paused
- [ ] No timeouts or warning provided
- [ ] Interruptions can be postponed

### 2.3 Seizures
- [ ] No content flashes > 3 times/second
- [ ] Warning for flashing content

### 2.4 Navigable
- [ ] Pages have descriptive titles
- [ ] Focus visible at all times
- [ ] Multiple ways to find pages
- [ ] Link purpose clear from text
- [ ] Headings and labels descriptive
- [ ] Focus indicator visible
- [ ] Section headings used

### 2.5 Input Modalities
- [ ] Pointer gestures have alternatives
- [ ] Pointer cancellation possible
- [ ] Label matches accessible name
- [ ] Motion actuation has alternatives

---

## Understandable

### 3.1 Readable
- [ ] Page language specified (html lang)
- [ ] Language changes marked
- [ ] Unusual words explained

### 3.2 Predictable
- [ ] Focus doesn't trigger unexpected changes
- [ ] Input doesn't trigger unexpected changes
- [ ] Navigation consistent across pages
- [ ] Components identified consistently

### 3.3 Input Assistance
- [ ] Error identified and described
- [ ] Labels/instructions provided
- [ ] Error suggestions offered
- [ ] Error prevention for important actions
- [ ] Review before submission available

---

## Robust

### 4.1 Compatible
- [ ] HTML validates
- [ ] Elements have complete markup
- [ ] IDs are unique
- [ ] Status messages announced to AT

---

## Component-Specific

### Forms
- [ ] All inputs have labels
- [ ] Labels visually associated
- [ ] Required fields marked
- [ ] Error messages linked to fields
- [ ] Fieldset/legend for groups
- [ ] Autocomplete attributes used

### Navigation
- [ ] Main navigation in landmark
- [ ] Current page indicated
- [ ] Breadcrumbs available
- [ ] Site search available
- [ ] Consistent across pages

### Modals/Dialogs
- [ ] Focus trapped in modal
- [ ] Focus returns on close
- [ ] Escape key closes modal
- [ ] Background content inert
- [ ] Proper ARIA roles

### Tables
- [ ] Headers properly marked (th)
- [ ] scope attribute used
- [ ] Caption provided
- [ ] No layout tables

### Custom Components
- [ ] ARIA roles appropriate
- [ ] ARIA states managed
- [ ] Keyboard interaction implemented
- [ ] Focus management correct

---

## Testing Tools

### Automated
- [ ] axe DevTools scan passed
- [ ] WAVE scan reviewed
- [ ] Lighthouse accessibility score > 90
- [ ] HTML validator passed

### Manual
- [ ] Keyboard-only navigation tested
- [ ] Screen reader tested (NVDA/VoiceOver)
- [ ] Zoom to 200% tested
- [ ] High contrast mode tested
- [ ] Reduced motion respected

---

## Screen Reader Testing

### NVDA (Windows)
- [ ] All content announced correctly
- [ ] Interactive elements announced with role
- [ ] Form errors announced
- [ ] Dynamic content announced

### VoiceOver (macOS/iOS)
- [ ] All content accessible
- [ ] Gestures work correctly
- [ ] Rotor navigation works

### TalkBack (Android)
- [ ] All content accessible
- [ ] Touch exploration works

---

## Common Issues Found

Document any issues found:

| Issue | WCAG | Severity | Location | Fix |
|-------|------|----------|----------|-----|
| | | | | |
| | | | | |
| | | | | |

---

## Sign-Off

**Auditor**: _______________
**Date**: _______________
**WCAG Level**: [ ] A [ ] AA [ ] AAA
**Lighthouse a11y Score**: _______________
**Next Audit**: _______________
