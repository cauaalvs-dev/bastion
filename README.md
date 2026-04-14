# bastion

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20WAF-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Security: OWASP](https://img.shields.io/badge/Security-OWASP%20Top%2010-red?style=flat-square)](./SECURITY.md)

A full-stack SaaS application built to be **intentionally broken — then secured**. This project covers the full lifecycle of Cloud Security engineering: threat modeling, vulnerability research, exploitation, and remediation.

> **Goal**: Build a system I would try to break myself — then make it impossible.

🔗 **Live**: [bastion.vercel.app](https://bastion.vercel.app) · 📋 **Security Report**: [SECURITY-REPORT.md](./SECURITY-REPORT.md)

---

## About

bastion is a SaaS boilerplate with authentication, role-based access control, and a user dashboard — designed with security engineering as the primary concern, not an afterthought.

The project was built in **7 phases** over 4 months, each adding a security layer on top of a functional system. Every vulnerability was first intentionally introduced, documented, exploited, and then corrected with a detailed write-up.

This is not a tutorial project. It is a professional security portfolio.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (API) |
| Database | Supabase (PostgreSQL + RLS) |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT + refresh token rotation, bcrypt, TOTP (2FA) |
| Cloud | AWS EC2, S3, RDS, Secrets Manager, WAF, GuardDuty, CloudTrail |
| Monitoring | CloudWatch Logs + Alarms, SNS alerts |
| CI/CD | GitHub Actions |
| Security tools | OWASP ZAP, Burp Suite Community, Semgrep, Snyk |

---

## Security features

- **JWT with refresh token rotation** — short-lived access tokens, automatic rotation on use
- **2FA via TOTP** — time-based one-time passwords with `speakeasy`
- **RBAC** — role-based access control (`admin`, `user`, `viewer`) enforced server-side
- **Row Level Security** — Supabase RLS policies restrict data at the database level
- **AWS WAF** — managed OWASP rule groups blocking common attack patterns
- **AWS GuardDuty** — continuous threat detection on cloud resources
- **AWS Secrets Manager** — no credentials in environment files or CI/CD logs
- **SSM Session Manager** — EC2 access with zero open SSH ports
- **CSP headers** — strict Content Security Policy via `next.config.js`
- **Rate limiting** — per-route limits on auth endpoints
- **Structured logging** — JSON logs with correlation IDs for traceability
- **Audit table** — all login attempts, role changes, and sensitive actions recorded

---

## Threat model (STRIDE)

| Threat | Asset | Control |
|---|---|---|
| Spoofing | User identity | JWT + TOTP 2FA |
| Tampering | API requests | Zod validation + CSRF tokens |
| Repudiation | User actions | Audit log table |
| Information disclosure | User data | RLS + encrypted storage |
| Denial of service | Auth endpoints | Rate limiting + WAF |
| Elevation of privilege | Admin routes | RBAC middleware + ownership checks |

---

## Running locally

```bash
git clone https://github.com/cauaalvs-dev/bastion
cd bastion
npm install
cp .env.example .env.local
# fill in your Supabase and JWT secrets
npm run dev
```

---

## Deploy

Auto-deployed on every push to `main` via GitHub Actions → Vercel.

AWS infrastructure is provisioned separately. See [`/infra`](./infra/README.md) for setup.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full AWS diagram.

\`\`\`
Internet → WAF (OWASP rules) → ALB (HTTPS)
                                    │
                    ┌───── Private subnet A ─────┐
                    │  EC2 — SSM only, no SSH     │
                    └────────────────────────────┘
                                    │
                    ┌───── Private subnet B ─────┐
                    │  RDS · Secrets Manager · S3 │
                    └────────────────────────────┘
                    GuardDuty · CloudTrail · CloudWatch
\`\`\`

---

## Project structure

```
bastion/
├── app/
│   ├── api/              # Route Handlers (REST API)
│   ├── components/
│   │   ├── ui/           # Shared UI primitives
│   │   └── public/       # Public-facing components
│   └── lib/
│       ├── auth/         # JWT, session, RBAC logic
│       ├── db/           # Prisma client + queries
│       └── constants.ts  # App-wide constants
├── infra/                # AWS setup documentation
├── .github/
│   └── workflows/        # CI/CD pipelines
├── SECURITY.md
├── SECURITY-REPORT.md    # Vulnerability research log
└── CHANGELOG.md
```

---

## Security Report

See [SECURITY-REPORT.md](./SECURITY-REPORT.md) for the full vulnerability research log.

Each entry follows the format:

```
Vulnerability → How I exploited it → Impact → Fix → Code diff
```

Vulnerabilities documented: SQL Injection · XSS (stored + reflected) · CSRF · IDOR · Mass Assignment · Broken Access Control · JWT none algorithm · Session fixation

---

## License

MIT © [Cauã Alves](https://github.com/cauaalvs-dev)
