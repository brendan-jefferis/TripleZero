import Koa from 'koa'
import serve from 'koa-static'
import helmet from 'koa-helmet'
import Router from 'koa-router'
import route from 'koa-route'
import logger from 'koa-logger'
import websockify from 'koa-websocket'

const port = 3000
const app = websockify(new Koa())
const httpRouter = new Router()

httpRouter.get('/', async ctx => {
  ctx.body = 'hello'
})

app.ws.use((ctx, next) => next(ctx))

app.ws.use(route.all('/test/:id', function (ctx) {
  console.log('websocket route called')
  ctx.websocket.send('Hello World')
  ctx.websocket.on('message', message => {
    // do something with the message from client
    console.log(message)
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
