import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { lat as latField, lng as lngField, num, str } from '../lib/validate.js'

const router = Router()

// GET /api/campus -> { name, lat, lng, radiusM } or null (not set yet). Also included in /api/map.
router.get('/', async (req, res) => {
  res.json(await prisma.campus.findFirst())
})

// PUT /api/campus (admin) { name?, lat, lng, radiusM }: there is only one campus area.
router.put('/', requireAdmin, async (req, res) => {
  const data = {
    name: str(req.body, 'name', { max: 120 }) ?? null,
    lat: latField(req.body, { required: true }),
    lng: lngField(req.body, { required: true }),
    radiusM: num(req.body, 'radiusM', { required: true, min: 30, max: 5000 }),
  }
  const existing = await prisma.campus.findFirst()
  const campus = existing ? await prisma.campus.update({ where: { id: existing.id }, data }) : await prisma.campus.create({ data })
  res.json(campus)
})

export default router
