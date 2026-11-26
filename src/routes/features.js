// Roads, crossings and areas drawn on the campus map (display only; routing uses nodes/edges).
import { crudRouter } from '../lib/crud.js'
import { HttpError, num, oneOf, str } from '../lib/validate.js'
import { points } from '../lib/shapes.js'

export const FEATURE_KINDS = ['road', 'crossing', 'area']

export default crudRouter('mapFeature', {
  orderBy: { createdAt: 'asc' },
  parse: (b, { partial }) => {
    const kind = oneOf(b, 'kind', FEATURE_KINDS, { required: !partial })
    const data = {
      kind,
      name: str(b, 'name', { max: 120 }),
      widthM: num(b, 'widthM', { min: 1, max: 40 }),
    }
    if (b?.points !== undefined || !partial) {
      // Areas are polygons (3+ points); roads and crossings are lines (2+ points).
      data.points = points(b?.points, 'points', { min: kind === 'area' ? 3 : 2 })
    }
    if (!partial && kind !== 'area' && data.widthM === undefined) data.widthM = kind === 'road' ? 6 : 3
    if (kind && !FEATURE_KINDS.includes(kind)) throw new HttpError(400, 'Unknown kind')
    return data
  },
})
