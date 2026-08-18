---
name: react-patterns
description: Comprehensive guide to React best practices including component patterns, custom hooks, state management, performance optimization, and testing strategies.
---

# React Patterns

Quick reference guide to React best practices, hooks, and component patterns. For detailed implementations, see the `references/` directory.

---

## When to Use Each Pattern

| Pattern | Use When | Reference |
|---------|----------|-----------|
| **Functional Components** | All new components (default choice) | [component-patterns.md](references/component-patterns.md) |
| **Compound Components** | Building reusable UI kits (Tabs, Accordion, Select) | [component-patterns.md](references/component-patterns.md) |
| **Render Props** | Sharing stateful logic across components (rare, prefer hooks) | [component-patterns.md](references/component-patterns.md) |
| **Custom Hooks** | Extracting reusable logic, side effects, or state | [custom-hooks.md](references/custom-hooks.md) |
| **useState** | Simple, independent state values | [state-management.md](references/state-management.md) |
| **useReducer** | Complex state with multiple related actions | [state-management.md](references/state-management.md) |
| **Context** | Global state (auth, theme, language) | [state-management.md](references/state-management.md) |
| **React.memo** | Prevent re-renders of expensive components | [performance.md](references/performance.md) |
| **useMemo** | Cache expensive calculations | [performance.md](references/performance.md) |
| **useCallback** | Stabilize callback references for memoized children | [performance.md](references/performance.md) |
| **Lazy/Suspense** | Code splitting heavy components or routes | [performance.md](references/performance.md) |
| **Virtual Lists** | Rendering 1000+ list items | [performance.md](references/performance.md) |
| **Error Boundaries** | Catching rendering errors in component trees | [error-handling.md](references/error-handling.md) |
| **React Hook Form** | Complex forms with validation | [form-handling.md](references/form-handling.md) |

---

## Component Patterns Overview

### Functional Components (Default)
- Modern React standard
- Use TypeScript interfaces for props
- Return JSX directly
- See: [component-patterns.md](references/component-patterns.md)

### Compound Components
- For reusable UI component libraries (Tabs, Accordion, Menu)
- Parent manages shared state via Context
- Children access context via custom hook
- Attach children to parent: `Parent.Child = Child`
- See: [component-patterns.md](references/component-patterns.md)

### Render Props (Legacy)
- Sharing stateful logic by passing function as child
- Mostly replaced by custom hooks
- Use hooks instead unless integrating with class components
- See: [component-patterns.md](references/component-patterns.md)

---

## Custom Hooks Quick Reference

| Hook | Purpose | Reference |
|------|---------|-----------|
| `useLocalStorage` | Persist state to localStorage | [custom-hooks.md](references/custom-hooks.md) |
| `useDebounce` | Debounce rapidly changing values (search input) | [custom-hooks.md](references/custom-hooks.md) |
| `useFetch` | Data fetching with loading/error states | [custom-hooks.md](references/custom-hooks.md) |
| `useOnClickOutside` | Detect clicks outside element (dropdowns, modals) | [custom-hooks.md](references/custom-hooks.md) |

**When to create a custom hook:**
- Logic used in 2+ components
- Complex useEffect with cleanup
- Combining multiple built-in hooks
- Abstracting third-party library integration

See: [custom-hooks.md](references/custom-hooks.md)

---

## State Management Decision Tree

```
Is state local to one component?
  YES → useState

Is state complex with multiple related actions?
  YES → useReducer

Is state needed across many components?
  YES → Context + useContext
  (Consider React Query for server state)
```

See: [state-management.md](references/state-management.md)

---

## Performance Optimization Decision Tree

```
Component re-renders unnecessarily?
  → Wrap with React.memo

Expensive calculation on every render?
  → useMemo

Callback causing child re-renders?
  → useCallback

Large component bundle?
  → lazy + Suspense

Long list (100+ items)?
  → Virtual list (react-window)
```

See: [performance.md](references/performance.md)

---

## Error Handling

- **Error Boundaries**: Catch rendering errors in component trees
- Must be class components (no hook equivalent yet)
- Place at strategic points: page level, feature boundaries
- Provide fallback UI
- See: [error-handling.md](references/error-handling.md)

---

## Form Handling

- **Simple forms**: Controlled components with useState
- **Complex forms**: React Hook Form + Zod validation
- **Validation**: Schema-first with Zod (type-safe)
- **Submission**: Handle loading/error states
- See: [form-handling.md](references/form-handling.md)

---

## Testing Patterns

- **Testing Library**: Test behavior, not implementation
- **User interactions**: Use `userEvent` over `fireEvent`
- **Async**: Use `waitFor`, `findBy*` queries
- **AAA pattern**: Arrange, Act, Assert
- See: [testing.md](references/testing.md)

---

## Best Practices Summary

1. **Prefer functional components** with hooks
2. **Extract custom hooks** for reusable logic (2+ uses)
3. **Use TypeScript** for all props interfaces
4. **Memoize selectively** - only when profiling shows benefit
5. **Lazy load** route-level components
6. **Wrap risky components** in Error Boundaries
7. **Use form libraries** for complex forms (React Hook Form + Zod)
8. **Test user behavior**, not implementation details
9. **Clean up effects** - cancel requests, remove listeners
10. **Use Context sparingly** - prefer composition or React Query for server state

---

## Quick Decision Guide

| I need to... | Use... |
|--------------|--------|
| Build a component | Functional component + TypeScript |
| Share logic between components | Custom hook |
| Build a reusable UI kit | Compound components |
| Manage form state | React Hook Form + Zod |
| Handle global state | Context (or React Query for server state) |
| Optimize performance | Profile first, then memo/useMemo/useCallback |
| Split code | lazy() + Suspense |
| Render long lists | react-window |
| Handle errors | Error Boundary |
| Test components | Testing Library + userEvent |

---

## Templates

Code templates for this domain (in `templates/`):
- `component.tsx.template` — React component with TypeScript and variants
- `form.tsx.template` — Form component with React Hook Form + Zod
- `hook.ts.template` — Custom React hook with cleanup and error handling
- `react-hook.ts.template` — React-specific hook (useDebounce, useLocalStorage, etc.)
- `context.tsx.template` — React Context provider with type-safe state
- `hoc.tsx.template` — Higher-Order Component with ref forwarding

---

For detailed implementations and code examples, see the `references/` directory.
