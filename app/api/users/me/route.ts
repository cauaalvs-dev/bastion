import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { prisma } from '@/app/lib/db/client'
import { logger } from '@/app/lib/logger'

// Whitelist: ONLY these fields can be updated by the user
// role, passwordHash, totpSecret etc. are intentionally absent
const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
})

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Zod strips unknown fields — mass assignment protection
    const data = updateSchema.parse(body)

    // Sanitize bio to prevent stored XSS
    if (data.bio) {
      data.bio = DOMPurify.sanitize(data.bio, { ALLOWED_TAGS: [] }) // strip all HTML
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, bio: true, role: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        event: 'user.profile_updated',
        ip,
        meta: { fields: Object.keys(data) },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    logger.error('user.update.error', { userId, ip })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
