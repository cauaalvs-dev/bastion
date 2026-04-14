## Architecture

```
Internet
    │
    ▼
 AWS WAF ── OWASP managed rules
    │
    ▼
   ALB ── HTTPS only (ACM)
    │
    ▼
┌─────────────── VPC ───────────────────┐
│                                       │
│  ┌── Public subnet ─────────────┐     │
│  │  ALB → EC2 (private subnet)  │     │
│  └──────────────────────────────┘     │
│                                       │
│  ┌── Private subnet A ──────────┐     │
│  │  EC2 — SSM only, no port 22  │     │
│  └──────────────────────────────┘     │
│              │         │              │
│              ▼         ▼              │
│  ┌── Private subnet B ──────────┐     │
│  │  RDS PostgreSQL              │     │
│  │  Secrets Manager             │     │
│  │  S3 (private, MFA delete)    │     │
│  └──────────────────────────────┘     │
│                                       │
│  GuardDuty · CloudTrail · CloudWatch  │
└───────────────────────────────────────┘
```

> EC2 is accessible only via AWS Systems Manager Session Manager — no open port 22, no SSH keys.
> All credentials stored in Secrets Manager — no `.env` files in production.
