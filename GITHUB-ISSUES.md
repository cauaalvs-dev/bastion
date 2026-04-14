# bastion — GitHub Issues / Milestones

Cole esses issues no seu repositório. Cada fase = 1 milestone.
Isso mostra organização profissional pra qualquer recrutador que abrir o repo.

---

## Milestone 1 — Base do sistema (Semanas 1–3)

- [ ] feat: setup Next.js 14 + TypeScript + Tailwind + Prisma
- [ ] feat: schema do banco com User, Session, Invoice, AuditLog
- [ ] feat: rota POST /api/auth/register com Zod + bcrypt
- [ ] feat: rota POST /api/auth/login com rate limiting
- [ ] feat: middleware de autenticação global
- [ ] feat: dashboard básico autenticado
- [ ] feat: CRUD de perfil de usuário
- [ ] security: security headers no next.config.js (CSP, HSTS, X-Frame-Options)
- [ ] docs: threat model STRIDE no README

## Milestone 2 — Deploy AWS (Semanas 4–5)

- [ ] infra: EC2 em subnet privada + SSM (sem porta 22)
- [ ] infra: RDS PostgreSQL em subnet privada
- [ ] infra: S3 com Block Public Access + MFA Delete
- [ ] infra: HTTPS via ACM + Route 53
- [ ] infra: Secrets Manager para JWT_SECRET e DATABASE_URL
- [ ] infra: IAM roles com least privilege
- [ ] infra: VPC com subnets públicas/privadas
- [ ] docs: infra/README.md com arquitetura completa

## Milestone 3 — Auth avançada + RBAC (Semanas 6–7)

- [ ] feat: JWT refresh token rotation
- [ ] feat: RBAC middleware (admin, user, viewer)
- [ ] feat: 2FA com TOTP (speakeasy + QR code)
- [ ] feat: session fixation prevention (rotate session ID no login)
- [ ] feat: token blacklist para logout real
- [ ] feat: tabela audit_log para todas ações sensíveis
- [ ] feat: rate limiting nas rotas de auth

## Milestone 4 — Vulnerabilidades (Semanas 8–10)

- [ ] security: introduzir + explorar + corrigir SQL Injection
- [ ] security: introduzir + explorar + corrigir Stored XSS
- [ ] security: introduzir + explorar + corrigir IDOR em /api/invoices/:id
- [ ] security: introduzir + explorar + corrigir CSRF em account update
- [ ] security: introduzir + explorar + corrigir JWT none algorithm bypass
- [ ] security: introduzir + explorar + corrigir Mass Assignment
- [ ] security: introduzir + explorar + corrigir Broken Access Control
- [ ] security: introduzir + explorar + corrigir Session Fixation
- [ ] docs: SECURITY-REPORT.md com todos os 8 entries

## Milestone 5 — Cloud Security (Semanas 11–13)

- [ ] infra: AWS WAF com managed OWASP rule groups
- [ ] infra: GuardDuty habilitado
- [ ] infra: CloudTrail habilitado em todas as regiões
- [ ] infra: AWS Config com compliance rules
- [ ] infra: S3 Versioning + MFA Delete
- [ ] infra: Security Groups revisados (zero 0.0.0.0/0)

## Milestone 6 — Observabilidade (Semanas 14–15)

- [ ] feat: structured logging com correlation IDs
- [ ] infra: CloudWatch Logs + Log Groups
- [ ] infra: alarme: ≥5 login failures em 1 min → SNS → email
- [ ] infra: alarme: admin access denied → SNS → email
- [ ] infra: alarme: WAF blocked ≥50 req em 5 min → SNS → email
- [ ] infra: alarme: IAM policy change → SNS → email
- [ ] infra: GuardDuty HIGH finding → EventBridge → SNS

## Milestone 7 — Portfolio final (Semana 16+)

- [ ] docs: README Diamond tier completo
- [ ] docs: SECURITY-REPORT.md finalizado com evidências
- [ ] docs: diagrama de arquitetura AWS no README
- [ ] docs: badges (Next.js, TypeScript, Tailwind, AWS, License, OWASP)
- [ ] ci: GitHub Actions com Semgrep SAST + npm audit
- [ ] release: Release v1.0.0 publicado
- [ ] feat: deploy final no Vercel (ou EC2) funcionando
