import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

// Public: the most searched buildings in the last 30 days, for the visitor home screen.
// Only building ids and counts; no search text or other log details are exposed.
router.get('/', async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [rows, buildings] = await Promise.all([
    prisma.searchLog.groupBy({
      by: ['buildingId'],
      where: { createdAt: { gte: since }, buildingId: { not: null } },
      _count: { _all: true },
    }),
    prisma.building.findMany({ select: { id: true } }),
  ])
  // Sorted here: Prisma's orderBy on _count is not applied reliably on MongoDB.
  const exists = new Set(buildings.map((b) => b.id))
  const top = rows
    .filter((r) => exists.has(r.buildingId)) // skip deleted buildings
    .map((r) => ({ buildingId: r.buildingId, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  res.set('Cache-Control', 'public, max-age=300')
  res.json(top)
})

export default router
