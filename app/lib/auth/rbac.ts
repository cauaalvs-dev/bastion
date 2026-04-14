import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './jwt'
import { ROLES, ADMIN_ROUTES, PUBLIC_ROUTES, type Role } from '@/app/lib/constants'

export function withAuth(handler: Function, requiredRole?: Role) {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    try {
      const payload = verifyAccessToken(token)

      if (requiredRole && payload.role !== requiredRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return handler(req, context, payload)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }
}

export function isAdminOnly(role: string): boolean {
  return role === ROLES.ADMIN
}

export function canRead(role: string): boolean {
  return [ROLES.ADMIN, ROLES.USER, ROLES.VIEWER].includes(role as Role)
}

export function canWrite(role: string): boolean {
  return [ROLES.ADMIN, ROLES.USER].includes(role as Role)
}
