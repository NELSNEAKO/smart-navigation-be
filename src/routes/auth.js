import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { str } from '../lib/validate.js'

const router = Router()

// No signup route: the admin is created with scripts/seed-admin.js.
router.post('/login', async (req, res) => {
  const email = str(req.body, 'email', { required: true, max: 200 }).toLowerCase()
  const password = str(req.body, 'password', { required: true, max: 200 })

  const admin = await prisma.admin.findUnique({ where: { email } })
  const ok = admin && (await bcrypt.compare(password, admin.passwordHash))
  if (!ok) return res.status(401).json({ error: 'Wrong email or password' })

  const token = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, email: admin.email })
})

export default router
