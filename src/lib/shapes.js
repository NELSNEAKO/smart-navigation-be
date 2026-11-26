// Validation for drawn map geometry (building outlines, roads, areas).
import { HttpError } from './validate.js'

const MAX_POINTS = 200

/** Validate a list of { lat, lng } points. Returns a clean array (numbers rounded to 7 decimals). */
export function points(value, key, { min = 2 } = {}) {
  if (!Array.isArray(value)) throw new HttpError(400, `${key} must be a list of points`)
  if (value.length < min) throw new HttpError(400, `${key} needs at least ${min} points`)
  if (value.length > MAX_POINTS) throw new HttpError(400, `${key} can have at most ${MAX_POINTS} points`)
  return value.map((p, i) => {
    const lat = Number(p?.lat)
    const lng = Number(p?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new HttpError(400, `${key}[${i}] is not a valid point`)
    }
    return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 }
  })
}

/** Building outline: undefined (unchanged), null (remove) or { kind, points }. */
export function buildingShape(body) {
  const v = body?.shape
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'object') throw new HttpError(400, 'shape must be an object')
  const kind = v.kind === 'rect' ? 'rect' : 'poly'
  return { kind, points: points(v.points, 'shape.points', { min: 3 }) }
}
