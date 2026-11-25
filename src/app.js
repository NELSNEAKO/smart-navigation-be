import express from 'express'
import { Prisma } from '@prisma/client'
import { HttpError } from './lib/validate.js'
import auth from './routes/auth.js'
import map from './routes/map.js'
import buildings from './routes/buildings.js'
import floors from './routes/floors.js'
import rooms from './routes/rooms.js'
import nodes from './routes/nodes.js'
import edges from './routes/edges.js'
import events from './routes/events.js'
import logs from './routes/logs.js'
import reports from './routes/reports.js'
import health from './routes/health.js'
import paths from './routes/paths.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', true) // behind Render's (and Vercel's) proxy

// The frontend normally reaches this API through a Vercel rewrite (same origin, no CORS).
// CORS_ORIGIN is only for calling Render directly from the browser.
const allowed = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
if (allowed.length) {
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && allowed.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
      res.set('Vary', 'Origin')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    }
    if (req.method === 'OPTIONS') return res.status(204).end()
    next()
  })
}

app.use(express.json({ limit: '100kb' }))

app.use('/api/health', health)
app.use('/api/auth', auth)
app.use('/api/map', map)
app.use('/api/buildings', buildings)
app.use('/api/floors', floors)
app.use('/api/rooms', rooms)
app.use('/api/nodes', nodes)
app.use('/api/edges', edges)
app.use('/api/paths', paths)
app.use('/api/events', events)
app.use('/api/logs', logs)
app.use('/api/reports', reports)

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// Express 5 forwards rejected async handlers here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' })
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'That value is already in use' })
    if (err.code === 'P2023') return res.status(400).json({ error: 'Invalid id' })
    if (err.code === 'P2003' || err.code === 'P2014') return res.status(400).json({ error: 'Linked record not found' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

export default app
