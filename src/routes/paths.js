// Bulk path editing for the admin: save a whole drawn or recorded walkway in one request,
// and undo it in one request. Distances are always computed here with haversine.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { HttpError, id as idField, lat as latField, lng as lngField, str } from '../lib/validate.js'
import { distanceBetween } from '../lib/geo.js'

const router = Router()
router.use(requireAdmin)

const MAX_POINTS = 500

/**
 * POST /api/paths
 * body: { points: [ { id } | { lat, lng, label? } ] }   (in walking order, at least 2)
 * Existing points are reused (that is how a new path joins the network); new ones are created.
 * Consecutive points are connected unless already connected.
 * -> 201 { nodes: [created nodes], edges: [created edges] }
 */
router.post('/', async (req, res) => {
  const points = req.body?.points
  if (!Array.isArray(points) || points.length < 2) throw new HttpError(400, 'points must be a list of at least 2 points')
  if (points.length > MAX_POINTS) throw new HttpError(400, `A path can have at most ${MAX_POINTS} points`)

  // Validate everything before writing anything.
  const parsed = points.map((p, i) => {
    if (!p || typeof p !== 'object') throw new HttpError(400, `points[${i}] is not valid`)
    if (p.id) return { id: idField({ [`points[${i}].id`]: p.id }, `points[${i}].id`, { required: true }) }
    return {
      lat: latField(p, { required: true }),
      lng: lngField(p, { required: true }),
      label: str(p, 'label', { max: 120 }) ?? null,
    }
  })
  const existingIds = [...new Set(parsed.filter((p) => p.id).map((p) => p.id))]
  const existing = await prisma.node.findMany({ where: { id: { in: existingIds } } })
  if (existing.length !== existingIds.length) throw new HttpError(400, 'Some points no longer exist. Reload and try again.')
  const byId = new Map(existing.map((n) => [n.id, n]))

  const createdNodes = []
  const chain = []
  for (const p of parsed) {
    if (p.id) chain.push(byId.get(p.id))
    else {
      const node = await prisma.node.create({ data: { lat: p.lat, lng: p.lng, label: p.label } })
      createdNodes.push(node)
      chain.push(node)
    }
  }

  const createdEdges = []
  const seen = new Set()
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1]
    const b = chain[i]
    if (a.id === b.id) continue
    const key = [a.id, b.id].sort().join('-')
    if (seen.has(key)) continue
    seen.add(key)
    const dup = await prisma.edge.findFirst({
      where: { OR: [{ fromId: a.id, toId: b.id }, { fromId: b.id, toId: a.id }] },
    })
    if (dup) continue
    createdEdges.push(await prisma.edge.create({ data: { fromId: a.id, toId: b.id, distanceM: distanceBetween(a, b) } }))
  }

  res.status(201).json({ nodes: createdNodes, edges: createdEdges })
})

/**
 * POST /api/paths/delete   (undo)
 * body: { nodeIds?: [], edgeIds?: [] }
 * Deletes the given paths, then the given points (their remaining paths go with them).
 */
router.post('/delete', async (req, res) => {
  const list = (key) => {
    const v = req.body?.[key] ?? []
    if (!Array.isArray(v) || v.length > MAX_POINTS * 2) throw new HttpError(400, `${key} must be a list`)
    return v.map((x, i) => idField({ [`${key}[${i}]`]: x }, `${key}[${i}]`, { required: true }))
  }
  const edgeIds = list('edgeIds')
  const nodeIds = list('nodeIds')
  const edges = await prisma.edge.deleteMany({ where: { id: { in: edgeIds } } })
  // Remove paths attached to the points first, then the points.
  const attached = await prisma.edge.deleteMany({ where: { OR: [{ fromId: { in: nodeIds } }, { toId: { in: nodeIds } }] } })
  const nodes = await prisma.node.deleteMany({ where: { id: { in: nodeIds } } })
  res.json({ deletedEdges: edges.count + attached.count, deletedNodes: nodes.count })
})

export default router
