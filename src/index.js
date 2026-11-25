import 'dotenv/config'
import app from './app.js'

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Missing DATABASE_URL or JWT_SECRET. Copy .env.example to .env (or set them in Render).')
  process.exit(1)
}

// Render provides PORT. Locally it defaults to 3001, which the frontend's Vite proxy expects.
const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`API ready on port ${port} (/api)`))
