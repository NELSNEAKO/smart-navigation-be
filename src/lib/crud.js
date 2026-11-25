import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { assertId, clean } from './validate.js'

/**
 * Admin CRUD router for a Prisma model.
 * parse(body, { partial }) validates the body and returns the data object.
 * Hooks let a route add checks or side effects (e.g. edge distances).
 */
export function crudRouter(modelName, { parse, orderBy, include, beforeSave, afterSave } = {}) {
  const model = prisma[modelName]
  const router = Router()

  router.use(requireAdmin)

  router.get('/', async (req, res) => {
    res.json(await model.findMany({ orderBy, include }))
  })

  router.get('/:id', async (req, res) => {
    const item = await model.findUnique({ where: { id: assertId(req.params.id) }, include })
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  })

  router.post('/', async (req, res) => {
    let data = clean(parse(req.body ?? {}, { partial: false }))
    if (beforeSave) data = await beforeSave(data, { id: null })
    const item = await model.create({ data, include })
    if (afterSave) await afterSave(item)
    res.status(201).json(item)
  })

  router.put('/:id', async (req, res) => {
    const itemId = assertId(req.params.id)
    let data = clean(parse(req.body ?? {}, { partial: true }))
    if (beforeSave) data = await beforeSave(data, { id: itemId })
    const item = await model.update({ where: { id: itemId }, data, include })
    if (afterSave) await afterSave(item)
    res.json(item)
  })

  router.delete('/:id', async (req, res) => {
    await model.delete({ where: { id: assertId(req.params.id) } })
    res.status(204).end()
  })

  return router
}
