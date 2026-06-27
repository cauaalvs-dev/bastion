import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'

// Limites por rota — ajustar conforme necessidade de produção
const limiters: Record<string, RateLimiterMemory> = {
  // Rotas de auth sensíveis: janela de 15min, máx 10 tentativas por IP
  'auth-strict': new RateLimiterMemory({ points: 10, duration: 15 * 60 }),
  // Register: mais permissivo, mas ainda protegido contra automação
  'auth-register': new RateLimiterMemory({ points: 5, duration: 60 * 60 }),
  // Refresh e logout: só pra evitar abuse em massa
  'auth-soft': new RateLimiterMemory({ points: 30, duration: 60 }),
}

type LimiterKey = keyof typeof limiters

type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfter: number }

export async function rateLimit(
  key: LimiterKey,
  identifier: string
): Promise<RateLimitResult> {
  try {
    await limiters[key].consume(identifier)
    return { limited: false }
  } catch (err) {
    const res = err as RateLimiterRes
    return {
      limited: true,
      retryAfter: Math.ceil((res.msBeforeNext ?? 60_000) / 1000),
    }
  }
}
