import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

// Explains a database failure without leaking the connection string.
function describeDbError(err) {
  const code = err?.errorCode || err?.code || null
  const raw = String(err?.message || '')
  const hints = {
    P1000: 'Atlas rejected the username or password in DATABASE_URL.',
    P1001: 'Cannot reach the Atlas cluster. Check Network Access allows 0.0.0.0/0.',
    P1002: 'The Atlas cluster timed out. It may be paused.',
    P1003: 'The database name in DATABASE_URL does not exist.',
    P1012: 'DATABASE_URL is not a valid MongoDB URL (remove any quotes; it must start with mongodb+srv://).',
    P1013: 'DATABASE_URL is not a valid MongoDB URL.',
  }
  let hint = hints[code]
  if (!hint && /Validation Error|must start with the protocol/i.test(raw)) hint = hints.P1012
  if (!hint && /empty database name|Database must be defined/i.test(raw)) {
    hint = 'DATABASE_URL has no database name. Add /campusnav after mongodb.net, e.g. ...mongodb.net/campusnav?retryWrites=true&w=majority'
  }
  if (!hint && /Server selection timeout|fatal alert|ReplicaSetNoPrimary/i.test(raw)) {
    hint = 'Cannot reach the Atlas cluster. Check Network Access allows 0.0.0.0/0 and the cluster is running.'
  }
  if (!hint && /auth|SCRAM|bad auth/i.test(raw)) hint = 'Atlas rejected the username or password in DATABASE_URL.'
  if (!hint && /did not initialize|prisma generate/i.test(raw)) hint = 'Prisma Client was not generated during the build.'
  return { code, hint: hint || 'Unknown database error. See the server logs.' }
}

/**
 * GET /api/health        -> { ok, uptime }            (fast, no database)
 * GET /api/health?db=1   -> { ok, db: 'ok' | 'error', dbCode?, dbHint? }
 */
router.get('/', async (req, res) => {
  const body = { ok: true, uptime: Math.round(process.uptime()) }
  if (!req.query.db) return res.json(body)

  try {
    await prisma.$runCommandRaw({ ping: 1 })
    body.db = 'ok'
    res.json(body)
  } catch (err) {
    console.error('Database health check failed:', err)
    const { code, hint } = describeDbError(err)
    res.status(503).json({ ...body, ok: false, db: 'error', dbCode: code, dbHint: hint })
  }
})

export default router
