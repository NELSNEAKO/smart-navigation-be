import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

// Everything the visitor app needs, in one payload. Search and routing run in the browser.
router.get('/', async (req, res) => {
  const [buildings, nodes, edges] = await Promise.all([
    prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        floors: {
          orderBy: { order: 'asc' },
          include: { rooms: { orderBy: { name: 'asc' } } },
        },
      },
    }),
    prisma.node.findMany(),
    prisma.edge.findMany(),
  ])
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  res.json({ buildings, nodes, edges, generatedAt: new Date().toISOString() })
})

export default router
