# Smart Campus Navigator: Backend (smart-navigation-be)

Capstone project: a mobile-first PWA for navigating the TCC campus (about 2 ha, 7 buildings plus the Home Management buildings across the road). This repo is the **API only**. The Vue frontend lives in the sibling repo `smart-navigation-fe`.

Budget is zero: free tiers only, no paid map API, no AI features. Routing (Dijkstra) runs in the browser, not here.

## Stack
- Node 20+, **Express 5** (async errors are forwarded to the error handler automatically)
- MongoDB Atlas M0 (free) via **Prisma ORM 6.19.x**. Do NOT upgrade to Prisma 7, which does not support MongoDB yet.
- Hosted on **Render** (free Web Service). JavaScript ES modules, no TypeScript unless asked.

## Hosting notes
- The frontend (Vercel) forwards `/api/*` to this service with a rewrite, so browsers see one origin and no CORS is needed. `CORS_ORIGIN` exists only for calling Render directly.
- Live at https://smart-navigation-be.onrender.com (frontend: https://smart-navigation-fe-tau.vercel.app).
- Render's free tier sleeps after ~15 min idle; the first request after that takes ~30-60 s. The frontend's service worker caches `/api/map` so returning visitors still get the map instantly.
- `GET /api/health` is the fast health check (no database). `GET /api/health?db=1` also pings MongoDB and returns 503 with `dbHint` explaining the failure (bad URL, quotes, wrong password, network access) without exposing the connection string.
- Render build command: `npm install && npm run build` (runs `prisma generate`). `prisma` is a regular dependency so it is installed even when dev dependencies are skipped.
- Render env values must not include quotes (unlike `.env`).
- Atlas Network Access must allow `0.0.0.0/0` (Render IPs are dynamic).

## Layout
```
src/
  index.js              loads .env, app.listen(PORT || 3001)
  app.js                Express app: routes, optional CORS, error handler
  db.js                 PrismaClient singleton
  routes/               auth, map, buildings, floors, rooms, nodes, edges, events, logs, reports
  middleware/requireAdmin.js
  lib/validate.js       body validators + HttpError
  lib/crud.js           crudRouter(model, { parse, beforeSave, afterSave }) for admin CRUD
  lib/geo.js            haversine (same file as the frontend's src/lib/geo.js; keep them in sync)
prisma/schema.prisma
scripts/seed-admin.js
render.yaml             optional Render Blueprint
```

## Commands
- `npm run dev`: API on http://localhost:3001 with auto-reload
- `npm start`: production start (Render)
- `npx prisma db push`: sync the schema to MongoDB (Prisma Migrate is NOT supported on MongoDB)
- `npx prisma generate`: runs on `postinstall`, so Render builds work
- `node scripts/seed-admin.js <email> <password>`: create or reset the admin

## Environment variables (.env locally, Render dashboard in production)
- `DATABASE_URL`: Atlas connection string including the database name (`.../campusnav?retryWrites=true&w=majority`)
- `JWT_SECRET`: a long random string
- `CORS_ORIGIN` (optional): comma-separated allowed origins

## Data models (Prisma, MongoDB)
Admin(email unique, passwordHash) · Building(name, description, photoUrl, lat, lng) · Floor(buildingId, label, order) · Room(floorId, name, type: classroom|office|restroom|lab, notes) · Node(lat, lng, code?, label?, buildingId? for entrances) · Edge(fromId, toId, distanceM) · Event(title, body, startsAt, endsAt?) · SearchLog(query?, fromCode?, buildingId?, createdAt)
- Every id: `String @id @default(auto()) @map("_id") @db.ObjectId`.
- `Node.code` must be unique when set. This is checked in `routes/nodes.js`, not with `@unique`, because a MongoDB unique index rejects several nodes with no code.
- Deleting a building cascades to floors and rooms; its entrance nodes keep existing with `buildingId` cleared. Deleting a node deletes its edges.

## Auth (admin only, keep it simple)
- No signup route. The admin is created with the seed script (bcrypt hash).
- `POST /api/auth/login` returns `{ token, email }`; the JWT expires after 8h. Clients send `Authorization: Bearer <token>`.
- `requireAdmin` guards every write route and the admin reads.
- Visitors are anonymous. Never add user accounts.

## API
Public: `GET /api/health`, `GET /api/map` (buildings + floors + rooms + nodes + edges), `GET /api/events` (current and upcoming), `POST /api/logs`, `POST /api/auth/login`
Admin: CRUD (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) on `/api/buildings`, `/floors`, `/rooms`, `/nodes`, `/edges`, `/events`; `GET /api/events?all=1`; `GET /api/reports?days=30`
- `POST /api/paths` (admin) saves a whole walkway in one request: `{ points: [{ id } | { lat, lng, label? }] }` in walking order; existing ids are reused (that is how paths join the network), consecutive points are connected unless already connected. `POST /api/paths/delete` `{ nodeIds, edgeIds }` is the matching undo.
- `GET /api/map` is sent with `Cache-Control: no-cache` so admin edits show immediately.
- `Building.category` is an optional string validated against `BUILDING_CATEGORIES` in `routes/buildings.js` (academic, administration, library, food, health, sports, services, home-management); keep it in sync with the frontend's `src/lib/categories.js`.
- `GET /api/popular` (public): top 6 most searched existing buildings in the last 30 days, `[{ buildingId, count }]`.
- Campus area: single `Campus` document `{ name?, lat, lng, radiusM }` (radius 30–5000 m). `GET /api/campus` (public), `PUT /api/campus` (admin, upsert). Also returned as `campus` in `GET /api/map` (null until set).
- Prisma's `groupBy` `orderBy: { _count }` is not applied reliably on MongoDB: rank grouped rows in JS (see `popular.js`, `reports.js`).
- `Edge.distanceM` is always computed here with haversine (never from the client), and recomputed when a node moves.
- Edges are undirected; linking A-B when B-A exists returns 409.

## Conventions
- Validate request bodies with `lib/validate.js`. Errors are `{ error: "message" }` with the right status (400 validation, 401 auth, 404, 409 conflict).
- `PUT` is a partial update: omitted fields stay unchanged.
- Don't commit `.env`.
