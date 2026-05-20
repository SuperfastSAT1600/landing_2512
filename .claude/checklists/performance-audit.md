# Performance Audit Checklist

Comprehensive performance review checklist.

---

## Frontend Performance

### Bundle Size
- [ ] JavaScript bundle < 200KB gzipped
- [ ] CSS bundle < 50KB gzipped
- [ ] No unused code in bundle
- [ ] Tree shaking working
- [ ] Dynamic imports for large components

### Loading Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

### Images
- [ ] Images properly sized
- [ ] Modern formats used (WebP, AVIF)
- [ ] Lazy loading implemented
- [ ] Responsive images (srcset)
- [ ] Image CDN used

### Caching
- [ ] Static assets have cache headers
- [ ] Service worker for offline (if PWA)
- [ ] API responses cached appropriately
- [ ] Cache invalidation working

### Fonts
- [ ] Font files optimized (subset)
- [ ] Preloaded critical fonts
- [ ] Font-display: swap used
- [ ] Limited font variations

---

## React/Next.js Specific

### Rendering
- [ ] No unnecessary re-renders
- [ ] useMemo for expensive calculations
- [ ] useCallback for callback props
- [ ] React.memo for expensive components
- [ ] Virtual scrolling for long lists

### Data Fetching
- [ ] Server components used where possible
- [ ] Data fetching at appropriate level
- [ ] Suspense boundaries defined
- [ ] Loading states implemented
- [ ] Error boundaries in place

### State Management
- [ ] No prop drilling
- [ ] Context not overused
- [ ] State colocated appropriately
- [ ] No unnecessary global state

---

## Backend Performance

### Database Queries
- [ ] No N+1 queries
- [ ] Indexes on frequently queried columns
- [ ] EXPLAIN ANALYZE run on slow queries
- [ ] Query results paginated
- [ ] Connection pooling configured

### API Response Time
- [ ] Average response < 200ms
- [ ] P95 response < 500ms
- [ ] P99 response < 1000ms
- [ ] Slow endpoints identified
- [ ] Rate limiting doesn't impact normal use

### Caching
- [ ] Redis/cache layer in place
- [ ] Cache hit rates monitored
- [ ] Cache invalidation correct
- [ ] TTLs appropriate
- [ ] No cache stampede risk

### Background Jobs
- [ ] Long operations are async
- [ ] Job queues for heavy processing
- [ ] Retry logic implemented
- [ ] Dead letter queue configured
- [ ] Job monitoring in place

---

## Database Performance

### Schema
- [ ] Appropriate data types used
- [ ] Indexes on foreign keys
- [ ] Indexes on WHERE clause columns
- [ ] No unused indexes
- [ ] Composite indexes for common queries

### Queries
- [ ] No SELECT *
- [ ] Proper JOINs (no cartesian products)
- [ ] LIMIT on all lists
- [ ] Batch operations where possible
- [ ] Transactions used correctly

### Maintenance
- [ ] VACUUM/ANALYZE scheduled
- [ ] Table bloat monitored
- [ ] Slow query log enabled
- [ ] Query plans reviewed regularly

---

## Network

### Compression
- [ ] Gzip/Brotli enabled
- [ ] Images compressed
- [ ] API responses compressed

### CDN
- [ ] Static assets on CDN
- [ ] CDN cache hit rate good
- [ ] Geographic distribution appropriate

### HTTP/2+
- [ ] HTTP/2 enabled
- [ ] Multiplexing working
- [ ] Server push (if beneficial)

---

## Monitoring

### Metrics
- [ ] Response time monitored
- [ ] Error rate monitored
- [ ] CPU/memory usage tracked
- [ ] Database connections tracked
- [ ] Queue depth monitored

### Alerting
- [ ] Alerts for response time spikes
- [ ] Alerts for error rate increases
- [ ] Alerts for resource exhaustion
- [ ] On-call rotation defined

### Profiling
- [ ] APM tool in place
- [ ] Frontend profiling available
- [ ] Database query profiling enabled
- [ ] Memory profiling done periodically

---

## Load Testing

- [ ] Expected load defined
- [ ] Load tests automated
- [ ] Peak load tested
- [ ] Spike load tested
- [ ] Breaking point identified
- [ ] Scaling plan in place

---

## Optimization Opportunities

Document any identified optimization opportunities:

| Area | Issue | Impact | Effort | Priority |
|------|-------|--------|--------|----------|
| | | | | |
| | | | | |
| | | | | |

---

## Sign-Off

**Auditor**: _______________
**Date**: _______________
**Lighthouse Score**: _______________
**Next Audit**: _______________
