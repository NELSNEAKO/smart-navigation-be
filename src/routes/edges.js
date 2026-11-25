import { prisma } from '../db.js'
import { crudRouter } from '../lib/crud.js'
import { HttpError, id } from '../lib/validate.js'
import { distanceBetween } from '../lib/geo.js'

// Paths are walkable both ways; the client treats every edge as undirected.
// distanceM is always computed here with haversine, never taken from the client.
export default crudRouter('edge', {
  parse: (b, { partial }) => ({
    fromId: id(b, 'fromId', { required: !partial }),
    toId: id(b, 'toId', { required: !partial }),
  }),

  beforeSave: async (data, { id: selfId }) => {
    let { fromId, toId } = data
    if (selfId && (!fromId || !toId)) {
      const current = await prisma.edge.findUnique({ where: { id: selfId } })
      if (!current) throw new HttpError(404, 'Not found')
      fromId ??= current.fromId
      toId ??= current.toId
    }
    if (fromId === toId) throw new HttpError(400, 'A path must connect two different points')

    const [from, to] = await Promise.all([
      prisma.node.findUnique({ where: { id: fromId } }),
      prisma.node.findUnique({ where: { id: toId } }),
    ])
    if (!from || !to) throw new HttpError(400, 'Both points must exist')

    const duplicate = await prisma.edge.findFirst({
      where: {
        OR: [
          { fromId, toId },
          { fromId: toId, toId: fromId },
        ],
        ...(selfId ? { NOT: { id: selfId } } : {}),
      },
    })
    if (duplicate) throw new HttpError(409, 'These two points are already connected')

    return { fromId, toId, distanceM: distanceBetween(from, to) }
  },
})
