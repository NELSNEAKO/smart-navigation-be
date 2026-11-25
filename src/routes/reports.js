import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { num } from '../lib/validate.js'

const router = Router()
router.use(requireAdmin)

router.get('/', async (req, res) => {
  const days = num(req.query, 'days', { int: true, min: 1, max: 365 }) ?? 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const where = { createdAt: { gte: since } }

  const [total, byBuilding, byQuery, byFrom, recent, buildings] = await Promise.all([
    prisma.searchLog.count({ where }),
    prisma.searchLog.groupBy({
      by: ['buildingId'],
      where: { ...where, buildingId: { not: null } },
      _count: { _all: true },
    }),
    prisma.searchLog.groupBy({
      by: ['query'],
      where: { ...where, query: { not: null } },
      _count: { _all: true },
    }),
    prisma.searchLog.groupBy({
      by: ['fromCode'],
      where: { ...where, fromCode: { not: null } },
      _count: { _all: true },
    }),
    prisma.searchLog.findMany({ where, select: { createdAt: true } }),
    prisma.building.findMany({ select: { id: true, name: true } }),
  ])

  const names = Object.fromEntries(buildings.map((b) => [b.id, b.name]))
  // Prisma's orderBy on _count is not applied reliably on MongoDB, so rank here.
  const top10 = (rows) => [...rows].sort((a, b) => b._count._all - a._count._all).slice(0, 10)

  // Searches per day (UTC dates), oldest first, including days with zero.
  const perDay = {}
  for (let i = days - 1; i >= 0; i--) {
    perDay[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = 0
  }
  for (const r of recent) {
    const key = r.createdAt.toISOString().slice(0, 10)
    if (key in perDay) perDay[key]++
  }

  res.json({
    days,
    total,
    topBuildings: top10(byBuilding).map((r) => ({
      buildingId: r.buildingId,
      name: names[r.buildingId] ?? '(deleted building)',
      count: r._count._all,
    })),
    topQueries: top10(byQuery).map((r) => ({ query: r.query, count: r._count._all })),
    topStarts: top10(byFrom).map((r) => ({ code: r.fromCode, count: r._count._all })),
    perDay: Object.entries(perDay).map(([day, count]) => ({ day, count })),
  })
})

export default router
