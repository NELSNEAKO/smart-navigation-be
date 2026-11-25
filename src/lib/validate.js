// Small request-body validators. Each throws HttpError(400) with a readable message.

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const OBJECT_ID = /^[a-f0-9]{24}$/i

export function str(body, key, { required = false, max = 500 } = {}) {
  const v = body?.[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `${key} is required`)
    return v === undefined ? undefined : null
  }
  if (typeof v !== 'string') throw new HttpError(400, `${key} must be a string`)
  const t = v.trim()
  if (required && !t) throw new HttpError(400, `${key} is required`)
  if (t.length > max) throw new HttpError(400, `${key} must be at most ${max} characters`)
  return t || null
}

export function num(body, key, { required = false, min = -Infinity, max = Infinity, int = false } = {}) {
  const v = body?.[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `${key} is required`)
    return undefined
  }
  const n = Number(v)
  if (!Number.isFinite(n)) throw new HttpError(400, `${key} must be a number`)
  if (int && !Number.isInteger(n)) throw new HttpError(400, `${key} must be a whole number`)
  if (n < min || n > max) throw new HttpError(400, `${key} must be between ${min} and ${max}`)
  return n
}

export function id(body, key, { required = false } = {}) {
  const v = body?.[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `${key} is required`)
    return v === undefined ? undefined : null
  }
  if (typeof v !== 'string' || !OBJECT_ID.test(v)) throw new HttpError(400, `${key} is not a valid id`)
  return v
}

export function date(body, key, { required = false } = {}) {
  const v = body?.[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `${key} is required`)
    return v === undefined ? undefined : null
  }
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${key} must be a valid date`)
  return d
}

export function oneOf(body, key, values, { required = false } = {}) {
  const v = body?.[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw new HttpError(400, `${key} is required`)
    return undefined
  }
  if (!values.includes(v)) throw new HttpError(400, `${key} must be one of: ${values.join(', ')}`)
  return v
}

export const lat = (body, opts) => num(body, 'lat', { ...opts, min: -90, max: 90 })
export const lng = (body, opts) => num(body, 'lng', { ...opts, min: -180, max: 180 })

// Drop undefined keys so partial updates (PUT with some fields) don't overwrite others.
export function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

export function assertId(value) {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) throw new HttpError(400, 'Invalid id')
  return value
}
