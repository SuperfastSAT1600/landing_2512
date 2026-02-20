---
name: project-guidelines
description: Template for creating project-specific development guidelines including architecture decisions, domain patterns, team conventions, and technology-specific rules.
---

# Project Guidelines Template

Template for creating project-specific development guidelines. Copy and customize for each project.

## Purpose

Capture project-specific patterns, conventions, and guidelines that complement general rules:
- Architectural decisions
- Domain-specific patterns
- Team agreements
- Technology-specific conventions
- Common pitfalls in THIS project

## Project Information

### Tech Stack Template
- **Frontend**: Framework, UI library, styling
- **Backend**: Runtime, framework, database
- **Infrastructure**: Cloud provider, containers, orchestration
- **Testing**: Unit, integration, E2E frameworks
- **Build Tools**: Bundler, transpiler, monorepo tools

### Key Dependencies
List critical packages with versions and purposes

## Architecture Overview

### System Design
- Architecture pattern (monolith, microservices, monorepo)
- Frontend/backend separation strategy
- Database architecture
- Caching strategy
- Authentication approach

### Directory Structure Template
```
src/
├── components/       # Reusable UI components
├── pages/           # Route components
├── services/        # Business logic
├── api/            # API routes
├── db/             # Database queries
├── utils/          # Helper functions
└── types/          # TypeScript types
```

## Project-Specific Patterns

### API Response Format
Define standard structure:
- Success format: `{ data, meta }`
- Error format: `{ error: { code, message } }`
- Status codes mapping

### Error Handling
- Try-catch patterns
- Error logging strategy
- User-facing error messages
- Error boundary setup

### State Management
- Global state solution (Redux, Zustand, Context)
- Server state solution (React Query, SWR)
- Form state solution (React Hook Form, Formik)
- When to use each type

## Domain-Specific Rules

### Business Logic
Document key business rules:
- User roles and permissions
- Pricing calculations
- Workflow states
- Validation rules
- Domain constraints

### Data Models
Key domain objects and relationships:
- Core entities
- Relationship types
- Required fields
- Validation rules

## Common Patterns

### Authentication Pattern
How auth is handled:
- Authentication provider
- Token storage location
- Session management
- Protected route pattern
- Auth hook usage

### Database Queries Pattern
Query conventions:
- Repository pattern or direct access
- Transaction handling
- Pagination approach
- Eager vs lazy loading
- Query optimization rules

### File Uploads Pattern
File handling approach:
- Storage service (S3, Cloudinary, local)
- File size limits
- Allowed file types
- Upload progress tracking
- Security validations

### Background Jobs Pattern
Async work processing:
- Queue service (BullMQ, SQS, Cloud Tasks)
- Job retry strategy
- Dead letter queue handling
- Monitoring approach

## Technology-Specific Guidelines

### React Patterns (if applicable)
- Component organization (atomic, feature-based)
- Props naming conventions
- Hook usage rules
- Context usage guidelines
- Re-render optimization

### Database Patterns
- Migration strategy
- Indexing guidelines
- Query optimization rules
- Connection pooling
- Transaction patterns

### API Patterns
- Endpoint naming conventions
- Versioning strategy (URL, header)
- Rate limiting rules
- Pagination format
- Filtering and sorting

## Common Mistakes to Avoid

### Mistake Template
**Problem**: What people keep doing wrong
**Why it's wrong**: Technical or architectural issue
**Correct approach**: Recommended pattern

Document 3-5 most common mistakes specific to this project

## Testing Strategy

### Test Coverage Requirements
- Business logic: Target percentage
- API endpoints: Target percentage
- UI components: Target percentage

### Test Organization
- Test file locations
- Naming conventions
- Test data management

### Mocking Strategy
- What to mock (external APIs, DB)
- What not to mock (internal utils)
- Mock service locations

## Security Considerations

### Project-Specific Security Rules
- Payment processing requirements
- Data encryption requirements
- API key storage approach
- Authentication requirements
- Authorization patterns

### Sensitive Data Handling
- PII handling guidelines
- Secret management approach
- Data retention policies

## Performance Requirements

### Targets
- Page load time target
- API response time target
- Database query time target
- Bundle size limit

### Optimization Strategies
- Code splitting approach
- Image optimization
- Caching strategy
- CDN usage

## Deployment

### Environments
- **Development**: URL, purpose, data source
- **Staging**: URL, purpose, data source
- **Production**: URL, purpose, data source

### Deployment Process
1. Create PR
2. Pass CI/CD checks
3. Get approval
4. Merge to main
5. Auto-deploy or manual trigger
6. Verify deployment

### Rollback Procedure
Steps to rollback failed deployment

## Monitoring & Logging

### Key Metrics
- Application metrics to track
- Business metrics to track
- Infrastructure metrics to track

### Logging Standards
- What to log (events, errors, user actions)
- How to log (structured, levels)
- What NOT to log (secrets, PII)

### Alerting Rules
- When to alert (error rates, latency)
- Who gets alerted (on-call, team)
- Alert escalation process

## Third-Party Services

### Service Template
- **Purpose**: What it's used for
- **Documentation**: Link to docs
- **API Keys**: Where stored
- **Rate Limits**: Limits to be aware of
- **Fallback**: Behavior if unavailable

## Team Conventions

### Code Review Checklist
Project-specific items to check in every PR

### PR Size Guidelines
- Ideal size: < 300 lines
- Maximum size: < 800 lines
- When to split large PRs

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Hotfix: `hotfix/description`

## Resources

### Internal Documentation
- Architecture docs location
- API documentation location
- Database schema location
- Design system location

### External Resources
- Framework documentation
- Library documentation
- Service provider docs

## Onboarding Checklist

For new team members:
- [ ] Read this document
- [ ] Review architecture docs
- [ ] Set up local environment
- [ ] Deploy to staging
- [ ] Complete starter issue
- [ ] Pair with team member
- [ ] Review recent PRs
- [ ] Understand deployment process

## Maintenance

### Updating This Document
- Update when patterns change
- Add new mistakes as discovered
- Remove outdated information
- Review monthly in team meetings

### Last Updated
- **Date**: YYYY-MM-DD
- **By**: Team member
- **Changes**: Summary of changes

## Example: Firebase Project Patterns

### Firebase-Specific Setup
- Client SDK in `lib/firebase.ts` with public env vars
- Admin SDK in `lib/firebase-admin.ts` with private env vars
- Never use Admin SDK in client components
- Use React Query hooks for Firestore queries
- Centralize queries in custom hooks

### Common Firebase Mistakes
1. Using Admin SDK on client (causes build errors)
2. Not using React Query (manual state management)
3. Direct Firestore access in components (scattered logic)
4. Not validating with Zod schemas
5. Forgetting security rules in `firestore.rules`

### Firebase API Route Pattern
1. Define Zod schema for validation
2. Verify authentication token
3. Parse and validate body
4. Execute business logic
5. Return standard format

### Firebase Testing Pattern
- Mock `firebase-admin` in tests
- Mock authentication token verification
- Test API routes with mocked Firebase
- Test React Query hooks with mock data
