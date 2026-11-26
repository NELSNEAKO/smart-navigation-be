import { crudRouter } from '../lib/crud.js'
import { HttpError, str, lat, lng } from '../lib/validate.js'
import { buildingShape } from '../lib/shapes.js'

// Keep in sync with smart-navigation-fe/src/lib/categories.js
export const BUILDING_CATEGORIES = ['academic', 'administration', 'library', 'food', 'health', 'sports', 'services', 'home-management']

export default crudRouter('building', {
  orderBy: { name: 'asc' },
  parse: (b, { partial }) => {
    // '' or null clears the category; undefined leaves it unchanged on update.
    let category = b?.category
    if (category === '') category = null
    if (category !== undefined && category !== null && !BUILDING_CATEGORIES.includes(category)) {
      throw new HttpError(400, `category must be one of: ${BUILDING_CATEGORIES.join(', ')}`)
    }
    return {
      name: str(b, 'name', { required: !partial, max: 120 }),
      description: str(b, 'description', { max: 2000 }),
      photoUrl: str(b, 'photoUrl', { max: 1000 }),
      category,
      shape: buildingShape(b), // null clears it (MongoDB accepts plain null for Json fields)
      lat: lat(b, { required: !partial }),
      lng: lng(b, { required: !partial }),
    }
  },
})
