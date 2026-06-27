import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/app/lib/db/client"
import { signAccessToken, signRefreshToken } from "@/app/lib/auth/jwt"
import { BCRYPT_ROUNDS, AUDIT_EVENTS } from "@/app/lib/constants"
import { audit } from "@/app/lib/audit"
import { logger } from "@/app/lib/logger"
import { randomUUID } from "crypto"

const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const path = "/api/auth/register"

  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      await audit({
        event: AUDIT_EVENTS.REGISTER_FAILURE,
        ip,
        path,
        meta: { reason: "email_already_exists" },
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    })

    const sessionId = randomUUID()

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    const refreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await audit({ event: AUDIT_EVENTS.REGISTER_SUCCESS, userId: user.id, ip, path })
    logger.info("auth.register.success", { userId: user.id, ip })

    const response = NextResponse.json({ user }, { status: 201 })

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    })

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/api/auth/refresh",
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    logger.error("auth.register.error", { ip, meta: { error: String(error) } })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
