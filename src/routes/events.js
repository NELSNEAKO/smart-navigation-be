import { Router } from 'express'
import { prisma } from '../db.js'
import { crudRouter } from '../lib/crud.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { HttpError, str, date } from '../lib/validate.js'

const router = Router()

// GET /api/events          public: events happening now or later
// GET /api/events?all=1    admin: every event, newest first
router.get('/', (req, res, next) => (req.query.all ? requireAdmin(req, res, next) : next()), async (req, res) => {
  if (req.query.all) {
    return res.json(await prisma.event.findMany({ orderBy: { startsAt: 'desc' } }))
  }
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const events = await prisma.event.findMany({
    where: {
      OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: startOfToday } }],
    },
    orderBy: { startsAt: 'asc' },
    take: 20,
  })
  res.json(events)
})

// Admin: POST /, PUT /:id, DELETE /:id (and GET /:id).
router.use(
  crudRouter('event', {
    parse: (b, { partial }) => {
      const data = {
        title: str(b, 'title', { required: !partial, max: 160 }),
        body: str(b, 'body', { required: !partial, max: 4000 }),
        startsAt: date(b, 'startsAt', { required: !partial }),
        endsAt: date(b, 'endsAt'),
      }
      if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
        throw new HttpError(400, 'endsAt must be after startsAt')
      }
      return data
    },
  }),
)

export default router
