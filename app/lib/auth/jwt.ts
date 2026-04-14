import jwt from 'jsonwebtoken'
import { JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '@/app/lib/constants'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters')
}

if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters')
}

export interface JWTPayload {
  userId: string
  role: string
  sessionId: string
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',  // explicit — prevents 'none' algorithm attack
  })
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'],  // reject any other algorithm including 'none'
  }) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    algorithms: ['HS256'],
  }) as JWTPayload
}
