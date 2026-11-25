import { prisma } from '../db.js'
import { crudRouter } from '../lib/crud.js'
import { HttpError, str, id, lat, lng } from '../lib/validate.js'
import { distanceBetween } from '../lib/geo.js'

const CODE = /^[a-z0-9-]{1,40}$/

export default crudRouter('node', {
  parse: (b, { partial }) => {
    const code = str(b, 'code', { max: 40 })
    if (code && !CODE.test(code)) {
      throw new HttpError(400, 'code may only use lowercase letters, numbers and dashes (e.g. "gate1")')
    }
    return {
      lat: lat(b, { required: !partial }),
      lng: lng(b, { required: !partial }),
      code,
      label: str(b, 'label', { max: 120 }),
      buildingId: id(b, 'buildingId'),
    }
  },

  // code is unique when set (see the note in prisma/schema.prisma).
  beforeSave: async (data, { id: selfId }) => {
    if (data.code) {
      const clash = await prisma.node.findFirst({
        where: { code: data.code, ...(selfId ? { NOT: { id: selfId } } : {}) },
      })
      if (clash) throw new HttpError(409, `Another node already uses the code "${data.code}"`)
    }
    return data
  },

  // When a node moves, keep the lengths of its edges correct.
  afterSave: async (node) => {
    const edges = await prisma.edge.findMany({
      where: { OR: [{ fromId: node.id }, { toId: node.id }] },
      include: { from: true, to: true },
    })
    await Promise.all(
      edges.map((e) =>
        prisma.edge.update({ where: { id: e.id }, data: { distanceM: distanceBetween(e.from, e.to) } }),
      ),
    )
  },
})
