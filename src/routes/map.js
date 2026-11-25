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
  // Always revalidate: admins expect their edits to show immediately. (stale-while-revalidate
  // let browsers serve the previous version.) The frontend's service worker handles offline.
  res.set('Cache-Control', 'no-cache')
  res.json({ buildings, nodes, edges, generatedAt: new Date().toISOString() })
})

export default router
