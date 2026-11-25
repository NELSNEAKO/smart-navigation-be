import { crudRouter } from '../lib/crud.js'
import { str, num, id } from '../lib/validate.js'

export default crudRouter('floor', {
  orderBy: [{ buildingId: 'asc' }, { order: 'asc' }],
  parse: (b, { partial }) => ({
    buildingId: id(b, 'buildingId', { required: !partial }),
    label: str(b, 'label', { required: !partial, max: 60 }),
    order: num(b, 'order', { int: true, min: -10, max: 100 }),
  }),
})
