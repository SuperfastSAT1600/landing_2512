# Dependency Audit Checklist

Use this checklist when adding, updating, or auditing dependencies.

---

## Adding New Dependencies

### Necessity Check
- [ ] Dependency is truly necessary (can't use existing code/deps)
- [ ] Not reinventing what standard library provides
- [ ] Functionality can't be easily implemented in-house
- [ ] Team agrees on the addition

### Package Evaluation
- [ ] Package has clear documentation
- [ ] Package has recent commits (active maintenance)
- [ ] Package has reasonable download numbers
- [ ] Package has acceptable issue response time
- [ ] Package has multiple maintainers (bus factor)

### Technical Assessment
- [ ] TypeScript types available (native or @types)
- [ ] Bundle size acceptable (check bundlephobia.com)
- [ ] No excessive transitive dependencies
- [ ] Compatible with current Node/runtime version
- [ ] Works with existing build tools

---

## Security Assessment

### Vulnerability Check
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] `snyk test` passes (if using Snyk)
- [ ] No known security advisories for package
- [ ] Dependencies of the package also checked

### Code Review
- [ ] Source code reviewed (for less-known packages)
- [ ] No suspicious network calls
- [ ] No suspicious file system access
- [ ] No obfuscated code
- [ ] Install scripts reviewed (if any)

### Supply Chain
- [ ] Package published by known/verified author
- [ ] Package name is correct (not typosquatting)
- [ ] GitHub/source matches published package
- [ ] Package has 2FA enabled for publishing (check npm)

---

## License Compliance

### License Check
- [ ] License is compatible with project license
- [ ] License allows commercial use (if applicable)
- [ ] No copyleft issues (GPL in MIT project, etc.)
- [ ] License documented in project

### License Types Reference
| License | Commercial | Copyleft | Attribution |
|---------|------------|----------|-------------|
| MIT | Yes | No | Yes |
| Apache 2.0 | Yes | No | Yes |
| BSD | Yes | No | Yes |
| ISC | Yes | No | Yes |
| GPL | Yes | Yes | Yes |
| LGPL | Yes | Partial | Yes |

---

## Performance Impact

### Bundle Size
- [ ] Check size on bundlephobia.com
- [ ] Tree-shaking supported
- [ ] Can import specific functions (not whole library)
- [ ] Size increase acceptable for functionality

### Runtime Performance
- [ ] No known performance issues
- [ ] Efficient algorithms used
- [ ] No memory leaks reported
- [ ] Lazy loading possible (if large)

---

## Maintenance Considerations

### Long-term Viability
- [ ] Package is actively maintained
- [ ] Breaking changes are infrequent/well-communicated
- [ ] Upgrade path is clear
- [ ] Community support available

### Alternatives Considered
- [ ] Evaluated at least 2-3 alternatives
- [ ] Documented why this package was chosen
- [ ] Fallback plan if package becomes unmaintained

---

## Updating Dependencies

### Pre-Update Checks
- [ ] Read changelog for breaking changes
- [ ] Review migration guide (if major version)
- [ ] Check GitHub issues for upgrade problems
- [ ] Ensure tests cover usage of this dependency

### Update Process
- [ ] Update one dependency at a time (for major updates)
- [ ] Run full test suite after update
- [ ] Test manually in development
- [ ] Review any deprecation warnings

### Post-Update Verification
- [ ] All tests pass
- [ ] No new deprecation warnings (or addressed)
- [ ] Application functions correctly
- [ ] Bundle size change acceptable
- [ ] No new vulnerabilities introduced

---

## Regular Audit Tasks

### Monthly Checks
- [ ] Run `npm audit`
- [ ] Check for outdated packages (`npm outdated`)
- [ ] Review dependabot/renovate PRs
- [ ] Update patch versions

### Quarterly Checks
- [ ] Review minor version updates
- [ ] Evaluate unused dependencies
- [ ] Review license compliance
- [ ] Check for deprecated packages

### Annual Checks
- [ ] Major version updates evaluation
- [ ] Dependency cleanup (remove unused)
- [ ] Alternative package evaluation
- [ ] Full security audit

---

## Dependency Categories

### Production Dependencies
Priority: High
- Security critical
- Affects users directly
- Must be stable and maintained

### Development Dependencies
Priority: Medium
- Less critical for security
- Should still be maintained
- Affects developer experience

### Optional/Peer Dependencies
Priority: Varies
- Check compatibility carefully
- Version ranges important
- Document requirements

---

## Red Flags (Avoid)

- [ ] No updates in 2+ years
- [ ] Single maintainer with no activity
- [ ] Known unpatched vulnerabilities
- [ ] Excessive dependencies
- [ ] Unclear or restrictive license
- [ ] Obfuscated code
- [ ] Suspicious install scripts
- [ ] Very low download numbers
- [ ] No source code available
- [ ] Package name typosquatting popular packages

---

## Commands Reference

```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Check outdated packages
npm outdated

# Check specific package info
npm info <package-name>

# Check bundle size
# Use bundlephobia.com or:
npx bundle-phobia <package-name>

# Check licenses
npx license-checker --summary

# Find unused dependencies
npx depcheck

# Interactive update
npx npm-check -u
```

---

## Documentation

When adding a dependency, document:
- [ ] Package name and version
- [ ] Purpose/use case
- [ ] License
- [ ] Alternatives considered
- [ ] Any caveats or known issues

---

## Notes

Document any specific considerations here.
