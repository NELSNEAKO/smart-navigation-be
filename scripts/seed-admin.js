// Create or reset the admin account.
// Usage: node scripts/seed-admin.js <email> <password>
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const [emailArg, password] = process.argv.slice(2)
if (!emailArg || !password) {
  console.error('Usage: node scripts/seed-admin.js <email> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Use a password of at least 8 characters.')
  process.exit(1)
}

const email = emailArg.trim().toLowerCase()
const prisma = new PrismaClient()

try {
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  })
  console.log(`Admin ready: ${email}`)
} finally {
  await prisma.$disconnect()
}
