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

// Audit events
// Namespace pattern: domain.entity.action
// NEVER log passwords, tokens, or secrets in meta — audit logs are readable by anyone with DB access
export const AUDIT_EVENTS = {
  // Login
  LOGIN_SUCCESS:        'auth.login.success',
  LOGIN_FAILURE:        'auth.login.failure',
  LOGIN_RATE_LIMITED:   'auth.login.rate_limited',
  LOGIN_TOTP_FAILED:    'auth.login.totp_failed',
  // Register
  REGISTER_SUCCESS:     'auth.register.success',
  REGISTER_FAILURE:     'auth.register.failure',
  // Token lifecycle
  TOKEN_REFRESH:        'auth.token.refresh',
  TOKEN_REUSE_DETECTED: 'auth.token.reuse_detected',
  // 2FA
  TOTP_ENABLED:         'auth.2fa.enabled',
  TOTP_VERIFIED:        'auth.2fa.verified',
  TOTP_FAILED:          'auth.2fa.failed',
  TOTP_DISABLED:        'auth.2fa.disabled',
  // Session
  LOGOUT:               'auth.logout',
} as const

export type AuditEvent = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS]
