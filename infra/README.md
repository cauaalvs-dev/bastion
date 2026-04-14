# Infrastructure — bastion

AWS setup documentation. This covers every service used and the security configuration applied to each.

## Architecture overview

```
Internet → Route 53 → ACM (HTTPS) → ALB → EC2 (private subnet)
                                       ↓
                                   WAF (OWASP rules)
                                       ↓
                              RDS PostgreSQL (private subnet)
                              S3 (private, no public access)
                              Secrets Manager (JWT secrets, DB creds)
```

## Services used

| Service | Purpose | Security config |
|---|---|---|
| EC2 | Application server | Private subnet, SSM only (no SSH port 22) |
| RDS | PostgreSQL database | Private subnet, SG: only EC2 |
| S3 | File storage | Block Public Access enabled, MFA Delete |
| WAF | Request filtering | OWASP managed rule groups |
| GuardDuty | Threat detection | Enabled on all regions |
| CloudTrail | API audit log | All regions, S3 log storage |
| Secrets Manager | Credentials | JWT_SECRET, DB password, Supabase keys |
| CloudWatch | Logs + alarms | JSON structured logs, SNS alerts |
| ACM | HTTPS certificates | Auto-renewed |
| Route 53 | DNS | bastion.dev |

## IAM — least privilege

Each component has its own IAM role with only the permissions it needs.

**EC2 role (`bastion-ec2-role`)**:
- `secretsmanager:GetSecretValue` — only for `/bastion/*` secrets
- `s3:PutObject`, `s3:GetObject` — only on `bastion-uploads` bucket
- `cloudwatch:PutMetricData`
- `ssm:*` — for SSM Session Manager access (replaces SSH)

**No role has `*` on any resource.**

## EC2 — no SSH

Access via AWS Systems Manager Session Manager only.

```bash
# Connect without SSH key or open port 22
aws ssm start-session --target i-xxxxxxxxxxxxx
```

Security group: no inbound rules. Outbound: 443 only.

## S3 — private by default

```json
{
  "BlockPublicAcls": true,
  "IgnorePublicAcls": true,
  "BlockPublicPolicy": true,
  "RestrictPublicBuckets": true
}
```

Versioning and MFA Delete enabled.

Pre-signed URLs used for all file uploads/downloads — files are never directly public.

## WAF — OWASP rule groups

Web ACL attached to ALB with:
- `AWSManagedRulesCommonRuleSet` — general OWASP protections
- `AWSManagedRulesSQLiRuleSet` — SQL injection protection
- `AWSManagedRulesKnownBadInputsRuleSet` — known malicious patterns

Rate limiting: 1000 requests per 5 minutes per IP.

## GuardDuty alerts

GuardDuty findings → EventBridge → SNS → email alert.

Monitored: unusual API calls, credential exfiltration, crypto mining, port scanning.

## CloudWatch alarms

| Alarm | Threshold | Action |
|---|---|---|
| Login failures | ≥ 5 in 1 min | SNS → email |
| Admin access denied | ≥ 1 | SNS → email |
| WAF blocked requests | ≥ 50 in 5 min | SNS → email |
| IAM policy change | Any | SNS → email |
| GuardDuty finding | Any HIGH | SNS → email |
