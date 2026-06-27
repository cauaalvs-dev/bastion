import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/db/client'
import { AuditEvent } from '@/app/lib/constants'

type AuditInput = {
  event: AuditEvent
  userId?: string | null
  ip?: string | null
  path?: string | null
  // meta deve conter apenas contexto (reason, attemptCount, etc.)
  // NUNCA incluir senhas, tokens crus ou secrets — audit log é legível por qualquer um com acesso ao banco
  meta?: Record<string, unknown>
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event: input.event,
        userId: input.userId ?? null,
        ip: input.ip ?? null,
        path: input.path ?? null,
        meta: input.meta ? (input.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (err) {
    // Falha no audit nunca propaga — observabilidade não pode derrubar fluxo principal
    console.error('[audit] write_failed', { event: input.event, err })
  }
}
