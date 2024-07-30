import { dirname } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.static(__dirname))
app.listen(8888)
