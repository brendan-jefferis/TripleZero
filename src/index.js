import Koa from 'koa'
import serve from 'koa-static'
import helmet from 'koa-helmet'
import Router from 'koa-router'
import route from 'koa-route'
import logger from 'koa-logger'
import websockify from 'koa-websocket'
import events from 'events'

const port = 3000
const app = websockify(new Koa())
const httpRouter = new Router()

const connections = {}
const connectionEvents = new events.EventEmitter()

const readyStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

function setConnection(id, data) {
  connections[id] = data
  connectionEvents.emit('update')
  console.log(`Added connection for ${id}`)
}

function updateConnection(id, data) {
  connections[id] = {...connections[id], ...data}
  console.log('CONNECTION UPDATED')
  connectionEvents.emit('update')
  console.log(`Updated connection for ${id}`)
}

function removeConnection(id) {
  delete connections[id]
  connectionEvents.emit('update')
  console.log(`Removed connection for ${id}`)
}

httpRouter.get('/', async ctx => {
  ctx.body = connections
})

app.ws.use(route.all('/dashboard', ctx => {
  if (ctx.websocket.readyState === readyStates.OPEN) ctx.websocket.send(JSON.stringify(connections))
  connectionEvents.on('update', () => {
    if (ctx.websocket.readyState === readyStates.OPEN) ctx.websocket.send(JSON.stringify(connections))
  })
}))

app.ws.use((ctx, next) => next(ctx))

app.ws.use(route.all('/test/:id', (ctx, id) => {
  console.log(`User ${id} | /test | CONNECTED`)
  ctx.websocket.on('message', message => {
    const data = JSON.parse(message)
    if (data.profile) {
      setConnection(id, {profile: data.profile})
      ctx.websocket.send(JSON.stringify({
        id: `${id}:${Date.now()}`,
        message: `CONNECTED`
      }))
      return
    }

    if (data.location) {
      updateConnection(id, {location: data.location})
      return
    }
    ctx.websocket.send(JSON.stringify({
      id: `${id}:${Date.now()}`,
      message: `echo ${data.message}`
    }))
  })

  ctx.websocket.on('close', () => {
    console.log(`USER ${id} | /test | CLOSED`)
    removeConnection(id)
  })
}))

app.use(logger())
app.use(helmet())
app.use(httpRouter.routes())
app.use(serve('./static'))
app.use(async ctx => {
  if (ctx.status === 404) ctx.body = '404 Not found'
})
app.listen(port)
