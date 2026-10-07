import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT) || 8787
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_BODY = 2 * 1024 * 1024
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'data')
const DATA_FILE = path.join(DATA_DIR, 'sites.json')
const DIST_DIR = path.join(ROOT, 'dist')

const OCCASIONS = ['date', 'walk']
const THEMES = ['rose', 'night', 'meadow']
const SECTIONS = ['hero', 'message', 'when', 'where', 'photo', 'rsvp']
const ALIGNS = ['left', 'center', 'right']

const expiredIds = new Set()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function clip(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function sanitizeInvitation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const raw = value
  if (!OCCASIONS.includes(raw.occasion)) return null
  const theme = THEMES.includes(raw.theme) ? raw.theme : raw.occasion === 'date' ? 'rose' : 'meadow'
  const sections = Array.isArray(raw.sections)
    ? raw.sections.filter((item, index, list) => SECTIONS.includes(item) && list.indexOf(item) === index)
    : [...SECTIONS]
  let photoDataUrl = null
  if (typeof raw.photoDataUrl === 'string' && raw.photoDataUrl.startsWith('data:image/')) {
    if (raw.photoDataUrl.length > 1_200_000) return null
    photoDataUrl = raw.photoDataUrl
  }
  const width = Number(raw.photoWidth)
  const mapUrl = clip(raw.mapUrl, 2000)
  let safeMap = ''
  if (mapUrl) {
    try {
      const parsed = new URL(mapUrl)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeMap = parsed.toString()
    } catch {
      safeMap = ''
    }
  }
  return {
    occasion: raw.occasion,
    theme,
    recipient: clip(raw.recipient, 120),
    sender: clip(raw.sender, 120),
    title: clip(raw.title, 180),
    message: clip(raw.message, 4000),
    datetime: clip(raw.datetime, 40),
    placeName: clip(raw.placeName, 180),
    placeNote: clip(raw.placeNote, 240),
    mapUrl: safeMap,
    photoDataUrl,
    photoAlign: ALIGNS.includes(raw.photoAlign) ? raw.photoAlign : 'center',
    photoWidth: Number.isFinite(width) ? Math.min(100, Math.max(30, Math.round(width))) : 100,
    rsvpYes: clip(raw.rsvpYes, 80),
    rsvpNo: clip(raw.rsvpNo, 80),
    rsvpYesNote: clip(raw.rsvpYesNote, 400),
    rsvpNoNote: clip(raw.rsvpNoNote, 400),
    sections,
  }
}

function readStore() {
  try {
    if (!existsSync(DATA_FILE)) return {}
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, ''))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function writeStore(store) {
  mkdirSync(DATA_DIR, { recursive: true })
  const temporary = `${DATA_FILE}.tmp`
  writeFileSync(temporary, JSON.stringify(store))
  renameSync(temporary, DATA_FILE)
}

function isExpired(record, now = Date.now()) {
  return !record?.expiresAt || Date.parse(record.expiresAt) <= now
}

function purge(store, now = Date.now()) {
  let changed = false
  for (const [id, record] of Object.entries(store)) {
    if (isExpired(record, now)) {
      expiredIds.add(id)
      delete store[id]
      changed = true
    }
  }
  return changed
}

function publicView(record) {
  return {
    invitation: record.invitation,
    expiresAt: record.expiresAt,
    rsvp: record.rsvp,
  }
}

function createId(store) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(6).toString('base64url').slice(0, 8).toLowerCase()
    if (!store[id]) return id
  }
  return randomBytes(9).toString('base64url').toLowerCase()
}

function tokenMatches(record, header) {
  const presented = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : ''
  const expected = record?.editToken ?? ''
  if (!presented || !expected || presented.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected))
}

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        const error = new Error('large')
        error.status = 413
        reject(error)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        const error = new Error('json')
        error.status = 400
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function serveStatic(req, res, url) {
  if (!existsSync(DIST_DIR)) return false
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
  const filePath = path.normalize(path.join(DIST_DIR, pathname))
  if (!filePath.startsWith(DIST_DIR)) {
    send(res, 403, { error: 'forbidden' })
    return true
  }
  let target = filePath
  if (!existsSync(target) || statSync(target).isDirectory()) {
    target = path.join(DIST_DIR, 'index.html')
  }
  if (!existsSync(target)) return false
  const ext = path.extname(target)
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
  res.end(readFileSync(target))
  return true
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  const match = url.pathname.match(/^\/api\/sites(?:\/([^/]+))?(?:\/(rsvp))?$/)

  if (!match) {
    if (req.method === 'GET' && serveStatic(req, res, url)) return
    send(res, 404, { error: 'not_found' })
    return
  }

  const publicId = match[1]
  const action = match[2]
  const store = readStore()
  const requested = publicId ? store[publicId] : null
  const requestedExpired = Boolean(requested && isExpired(requested))
  if (purge(store)) writeStore(store)

  if (publicId && (requestedExpired || expiredIds.has(publicId))) {
    send(res, 410, { error: 'expired' })
    return
  }

  try {
    if (req.method === 'POST' && !publicId) {
      const invitation = sanitizeInvitation(await readBody(req))
      if (!invitation) {
        send(res, 400, { error: 'invalid' })
        return
      }
      const now = new Date()
      const record = {
        editToken: randomBytes(24).toString('base64url'),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + RETENTION_MS).toISOString(),
        rsvp: null,
        invitation,
      }
      const id = createId(store)
      store[id] = record
      writeStore(store)
      send(res, 201, { publicId: id, editToken: record.editToken, expiresAt: record.expiresAt })
      return
    }

    const record = publicId ? store[publicId] : null
    if (!record || isExpired(record)) {
      if (record) {
        delete store[publicId]
        writeStore(store)
      }
      send(res, record ? 410 : 404, { error: record ? 'expired' : 'not_found' })
      return
    }

    if (req.method === 'GET' && publicId && !action) {
      send(res, 200, publicView(record))
      return
    }

    if (req.method === 'PUT' && publicId && !action) {
      if (!tokenMatches(record, req.headers.authorization)) {
        send(res, 401, { error: 'unauthorized' })
        return
      }
      const invitation = sanitizeInvitation(await readBody(req))
      if (!invitation) {
        send(res, 400, { error: 'invalid' })
        return
      }
      record.invitation = invitation
      record.updatedAt = new Date().toISOString()
      writeStore(store)
      send(res, 200, { expiresAt: record.expiresAt })
      return
    }

    if (req.method === 'DELETE' && publicId && !action) {
      if (!tokenMatches(record, req.headers.authorization)) {
        send(res, 401, { error: 'unauthorized' })
        return
      }
      delete store[publicId]
      writeStore(store)
      send(res, 204, {})
      return
    }

    if (req.method === 'POST' && publicId && action === 'rsvp') {
      const body = await readBody(req)
      const choice = body?.choice
      if (choice !== 'yes' && choice !== 'no' && choice !== null) {
        send(res, 400, { error: 'invalid' })
        return
      }
      record.rsvp = choice
      record.updatedAt = new Date().toISOString()
      writeStore(store)
      send(res, 200, { rsvp: record.rsvp })
      return
    }

    send(res, 405, { error: 'method' })
  } catch (error) {
    const status = error?.status || 500
    send(res, status, { error: status === 413 ? 'too_large' : status === 400 ? 'invalid' : 'server' })
  }
})

const initial = readStore()
if (purge(initial)) writeStore(initial)

server.listen(PORT, '127.0.0.1', () => {
  console.log(`api http://127.0.0.1:${PORT}`)
})
