import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { prisma } from '@/app/lib/db/client'
import { logger } from '@/app/lib/logger'
import { verifyAccessToken } from '@/app/lib/auth/jwt'

const updateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
})

function getUserIdFromRequest(req: NextRequest): string | null {
  // Try header first (set by middleware)
  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId) return headerUserId

  // Fallback: read cookie directly
  const token = req.cookies.get('access_token')?.value
  if (!token) return null

  try {
    const payload = verifyAccessToken(token)
    return payload.userId
  } catch {
    return null
  }
}

export async function PATCH(req: NextRequest) {
  const userId = getUserIdFromRequest(req)
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    if (data.bio) {
      data.bio = DOMPurify.sanitize(data.bio, { ALLOWED_TAGS: [] })
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