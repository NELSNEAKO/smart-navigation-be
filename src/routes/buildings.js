import { crudRouter } from '../lib/crud.js'
import { str, lat, lng } from '../lib/validate.js'

export default crudRouter('building', {
  orderBy: { name: 'asc' },
  parse: (b, { partial }) => ({
    name: str(b, 'name', { required: !partial, max: 120 }),
    description: str(b, 'description', { max: 2000 }),
    photoUrl: str(b, 'photoUrl', { max: 1000 }),
    lat: lat(b, { required: !partial }),
    lng: lng(b, { required: !partial }),
  }),
})
