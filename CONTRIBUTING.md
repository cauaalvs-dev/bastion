# Contributing

## Branch workflow

```
main        — production, protected. never commit directly.
dev         — integration branch. all features merge here first.
feat/*      — new features
security/*  — security improvements
vuln/*      — vulnerability research (introduce → exploit → fix)
infra/*     — AWS / infrastructure changes
docs/*      — documentation only
fix/*       — bug fixes
chore/*     — deps, config, tooling
```

**Flow:**
```
feat/my-feature → dev → main
```

Never push directly to `main` or `dev`. Always open a Pull Request.

---

## Commit convention

Format: `type: short description in English`

| Type | When to use |
|---|---|
| `feat` | new feature |
| `fix` | bug fix |
| `security` | security hardening |
| `vuln` | vulnerability research commit |
| `infra` | infrastructure / AWS |
| `docs` | documentation |
| `chore` | deps, config, tooling |
| `perf` | performance improvement |
| `ci` | CI/CD pipeline |

**Rules:**
- Lowercase, no period at the end
- Present tense: `add`, not `added`
- One thing per commit — never bundle unrelated changes
- Reference the issue: `feat: add login rate limiting (closes #3)`

**Examples:**
```
feat: add JWT refresh token rotation
security: enforce HS256 algorithm — prevent none bypass
vuln: introduce SQL Injection on user search endpoint
fix: return 404 instead of 403 on IDOR attempt
docs: add IDOR entry to SECURITY-REPORT.md
infra: configure WAF with OWASP managed rule groups
chore: pin all dependency versions in package.json
```

---

## Closing issues via commits

Reference the issue number in the commit message to close it automatically on merge:

```bash
git commit -m "feat: implement RBAC middleware (closes #5)"
```

When the PR merges into `main`, GitHub closes the issue and updates the milestone progress automatically.

---

## Vulnerability research workflow

Each vulnerability in Phase 4 follows this exact pattern:

```bash
# 1. Create branch
git checkout -b vuln/sql-injection

# 2. Introduce the flaw intentionally
git commit -m "vuln: introduce SQL Injection on user search endpoint"

# 3. Document the exploit
git commit -m "vuln: document SQL Injection exploit and impact"

# 4. Fix it
git commit -m "fix: prevent SQL Injection with parameterized Prisma query (closes #25)"

# 5. PR → dev
```

---

## Pull Request checklist

Before opening a PR:

- [ ] Commits are semantic and atomic
- [ ] No secrets or credentials in code
- [ ] No `console.log` left in production code
- [ ] Types are correct — `npm run typecheck` passes
- [ ] Lint passes — `npm run lint`
- [ ] Issue number referenced in at least one commit

---

## Security

Found a real vulnerability in the live deployment? See [SECURITY.md](./SECURITY.md).
