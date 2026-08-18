---
name: nextjs-patterns
description: Provides comprehensive Next.js App Router patterns including server/client components, data fetching, routing, layouts, metadata, and performance optimization.
---

# Next.js Patterns

Comprehensive guide to Next.js App Router patterns and best practices.

## App Router Structure

### Directory Organization
- Route groups: `(name)/` - organize without affecting URL
- Dynamic routes: `[id]/` - URL parameters
- Catch-all: `[...slug]/` - match multiple segments
- Optional catch-all: `[[...slug]]/`
- Parallel routes: `@modal/` - render multiple pages
- Intercepting routes: `(.)modal/` - intercept navigation

### Special Files
- `layout.tsx` - Shared UI for route segment
- `page.tsx` - Unique UI for route
- `loading.tsx` - Loading UI (Suspense boundary)
- `error.tsx` - Error UI (Error boundary)
- `not-found.tsx` - 404 UI
- `route.ts` - API endpoint
- `template.tsx` - Re-rendered on navigation
- `default.tsx` - Fallback for parallel routes

## Server vs Client Components

### Server Components (Default)
- Default for all components
- Can fetch data directly
- Access backend resources
- Reduce client bundle
- Cannot use hooks or browser APIs

### Client Components
- Opt-in with `'use client'`
- Can use hooks (useState, useEffect)
- Access browser APIs
- Handle user interactions
- Subscribe to events

### When to Use
- Server: Data fetching, backend resources, SEO
- Client: Interactivity, hooks, browser APIs, event listeners

## Data Fetching Patterns

### Server Component Fetching
- Async components
- Direct database access
- No API route needed
- Automatic request deduplication
- Parallel and sequential patterns

### Caching Strategies
- `force-cache` - Cache permanently (default)
- `no-store` - Fetch every request
- `revalidate: seconds` - ISR pattern
- Tag-based revalidation with `revalidateTag()`

### Client Fetching
- Use React Query or SWR
- For dynamic data that changes frequently
- User-specific data
- Real-time updates

## Routing Patterns

### Navigation
- `Link` component for client-side navigation
- `useRouter` hook for programmatic navigation
- `redirect()` for server-side redirects
- `usePathname()` for current path

### Route Groups
Group routes without affecting URL structure
- `(marketing)/` - Marketing pages
- `(dashboard)/` - Dashboard pages
- Share layouts within groups

### Dynamic Routes
- Single: `[id]/page.tsx` - `/posts/123`
- Catch-all: `[...slug]/page.tsx` - `/docs/a/b/c`
- Optional: `[[...slug]]/page.tsx` - `/shop` or `/shop/a/b`

## Layout Patterns

### Nested Layouts
- Root layout required (html, body)
- Nested layouts inherit from parent
- Layouts don't remount on navigation
- Share state between route segments

### Template vs Layout
- Layout: Persists across navigation
- Template: Remounts on navigation
- Use template for: animations, user-specific data

## Metadata & SEO

### Static Metadata
Export metadata object from page/layout

### Dynamic Metadata
Export generateMetadata function with params

### Sitemap & Robots
- `app/sitemap.ts` - Generate sitemap
- `app/robots.ts` - Generate robots.txt

## API Routes

### Route Handlers
- `route.ts` in app directory
- Export HTTP method handlers: GET, POST, PUT, PATCH, DELETE
- Receive Request, return Response
- Server-only code

### Request/Response
- Access request: headers, body, params
- Return JSON: `NextResponse.json()`
- Set status: `NextResponse.json(data, { status })`
- Set headers: `NextResponse.next()` with headers

## Server Actions

### Form Actions
- Server functions called from client
- Use `'use server'` directive
- Progressive enhancement
- Handle form submissions
- Revalidate data after mutations

### Usage
- Inline in Server Components
- Separate file with `'use server'`
- Call from Client Components
- Return serializable data

## Streaming & Suspense

### Streaming Benefits
- Progressive rendering
- Faster time to first byte
- Better perceived performance

### Implementation
- `loading.tsx` - Route-level suspense
- `<Suspense>` - Component-level
- Stream data with async components

## Middleware

### Use Cases
- Authentication checks
- Redirects based on conditions
- Rewrite URLs
- Add headers
- A/B testing

### Configuration
- Create `middleware.ts` in root
- Export default function
- Export config with matcher
- Runs before route handlers

## Image Optimization

### Next Image Component
- Automatic optimization
- Lazy loading by default
- Prevents layout shift
- Responsive images

### Configuration
- Remote patterns for external images
- Loader for custom CDN
- Device sizes and breakpoints

## Environment Variables

### Types
- Public: `NEXT_PUBLIC_*` - Available in browser
- Private: No prefix - Server-only

### Access
- Server: `process.env.VAR_NAME`
- Client: Only `NEXT_PUBLIC_*` vars

## Performance Optimization

### Code Splitting
- Automatic route-based splitting
- Dynamic imports for components
- `next/dynamic` with loading state

### Bundle Analysis
- Use `@next/bundle-analyzer`
- Check page weights
- Identify large dependencies

### Font Optimization
- Use `next/font` for local fonts
- Automatic font subsetting
- Zero layout shift

## Authentication Patterns

### Session Management
- Use middleware to check auth
- Protect routes based on session
- Redirect unauthenticated users

### Protected Routes
- Check auth in middleware
- Server Component guards
- API route protection

## Error Handling

### Error Boundaries
- `error.tsx` - Catches errors in segment
- `global-error.tsx` - Catches root errors
- Access error and reset function

### Not Found
- `not-found.tsx` - Custom 404 page
- `notFound()` - Programmatically trigger

## Testing

### Unit Tests
- Test Server Components as async functions
- Test Client Components with React Testing Library
- Mock API routes and server actions

### E2E Tests
- Use Playwright
- Test full user flows
- Test with production build

## Deployment

### Vercel (Recommended)
- Automatic deployments
- Preview deployments for PRs
- Edge functions
- Analytics

### Self-Hosted
- Build with `next build`
- Start with `next start`
- Use Node.js server
- Configure environment variables

### Docker
- Multi-stage build
- Production dependencies only
- Optimize layer caching

## Best Practices

### DO
- Use Server Components by default
- Minimize client bundle
- Leverage automatic code splitting
- Use Image component for images
- Implement proper error boundaries
- Use metadata for SEO
- Stream when possible
- Cache appropriately

### DON'T
- Make everything a Client Component
- Fetch data in Client Components when Server works
- Use old Pages Router patterns
- Ignore metadata for SEO
- Skip error handling
- Forget loading states
- Over-use client-side state

## Migration from Pages Router

### Key Differences
- App Router uses Server Components
- File-based routing in `app/` directory
- Different data fetching patterns
- Layouts replace _app and _document
- New metadata API

### Migration Strategy
- Incremental migration supported
- Move routes one at a time
- Update data fetching patterns
- Migrate layouts and error handling

## Templates

Code templates for this domain (in `templates/`):
- `api-route.ts.template` — Next.js App Router API route handler
