import { randomUUID } from 'crypto'

type LogLevel = 'info' | 'warn' | 'error' | 'security'

interface LogEntry {
  timestamp: string
  level: LogLevel
  correlationId: string
  event: string
  userId?: string
  ip?: string
  path?: string
  meta?: Record<string, unknown>
}

function log(level: LogLevel, event: string, data?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'event' | 'correlationId'>> & { correlationId?: string }) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: data?.correlationId ?? randomUUID(),
    event,
    ...data,
  }

  // In production, pipe to CloudWatch via stdout
  console.log(JSON.stringify(entry))

  return entry.correlationId
}

export const logger = {
  info: (event: string, data?: Parameters<typeof log>[2]) => log('info', event, data),
  warn: (event: string, data?: Parameters<typeof log>[2]) => log('warn', event, data),
  error: (event: string, data?: Parameters<typeof log>[2]) => log('error', event, data),

  // Security events — these trigger CloudWatch alarms
  security: (event: string, data?: Parameters<typeof log>[2]) => log('security', event, data),

  // Auth-specific helpers
  loginSuccess: (userId: string, ip: string) =>
    log('security', 'auth.login.success', { userId, ip }),

  loginFailure: (ip: string, reason: string, path?: string) =>
    log('security', 'auth.login.failure', { ip, meta: { reason }, path }),

  accessDenied: (userId: string, path: string, ip: string) =>
    log('security', 'auth.access_denied', { userId, path, ip }),

  suspiciousRequest: (ip: string, path: string, meta?: Record<string, unknown>) =>
    log('security', 'request.suspicious', { ip, path, meta }),
}

// Request-scoped logger — binds correlationId for the duration of a request
// Usage: const log = requestLogger(req); log.info('event', { ... })
export function requestLogger(correlationId: string) {
  const bind = (level: Parameters<typeof log>[0]) =>
    (event: string, data?: Omit<Parameters<typeof log>[2], 'correlationId'>) =>
      log(level, event, { ...data, correlationId })

  return {
    info: bind('info'),
    warn: bind('warn'),
    error: bind('error'),
    security: bind('security'),
  }
}
