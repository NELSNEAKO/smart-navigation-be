import { PrismaClient } from '@prisma/client'

// Reuse one client across serverless invocations (and across --watch reloads locally).
const g = globalThis
export const prisma = g.__prisma ?? new PrismaClient()
if (!g.__prisma) g.__prisma = prisma
