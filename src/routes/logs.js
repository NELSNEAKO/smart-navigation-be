import { Router } from 'express'
import { prisma } from '../db.js'
import { str, id, clean } from '../lib/validate.js'

const router = Router()

// Anonymous usage log for the admin reports. No personal data is stored.
router.post('/', async (req, res) => {
  const data = clean({
    query: str(req.body, 'query', { max: 120 }),
    fromCode: str(req.body, 'fromCode', { max: 40 }),
    buildingId: id(req.body, 'buildingId'),
  })
  await prisma.searchLog.create({ data })
  res.status(201).json({ ok: true })
})

export default router
