// Auth
export const JWT_EXPIRES_IN = '15m'
export const JWT_REFRESH_EXPIRES_IN = '7d'
export const BCRYPT_ROUNDS = 12
export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_LOCKOUT_MINUTES = 15

// Rate limiting
export const RATE_LIMIT_AUTH = { requests: 10, windowMs: 60_000 }  // 10 req/min on auth routes
export const RATE_LIMIT_API = { requests: 100, windowMs: 60_000 }   // 100 req/min on general API

// Roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Routes
export const PUBLIC_ROUTES = ['/', '/login', '/register', '/api/auth']
export const ADMIN_ROUTES = ['/admin']

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// File upload (S3)
export const MAX_FILE_SIZE_MB = 5
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
