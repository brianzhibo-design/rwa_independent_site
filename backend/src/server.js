// src/server.js
import express from 'express'
import cors from 'cors'
import ordersRouter from './routes/orders.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

// 关键：挂载订单路由
app.use('/orders', ordersRouter)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`[API] listening on :${PORT}`)
})
