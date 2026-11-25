import { crudRouter } from '../lib/crud.js'
import { str, id, oneOf } from '../lib/validate.js'

export const ROOM_TYPES = ['classroom', 'office', 'restroom', 'lab']

export default crudRouter('room', {
  orderBy: { name: 'asc' },
  parse: (b, { partial }) => ({
    floorId: id(b, 'floorId', { required: !partial }),
    name: str(b, 'name', { required: !partial, max: 120 }),
    type: oneOf(b, 'type', ROOM_TYPES),
    notes: str(b, 'notes', { max: 1000 }),
  }),
})
