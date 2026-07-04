import { serve } from '@hono/node-server'
import { app } from './api/index'

const port = 3001
console.log(`Starting local server on port ${port}...`)

serve({
  fetch: app.fetch,
  port
})
