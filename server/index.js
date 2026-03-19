const express = require('express')
const path = require('path')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/collect', require('./routes/collect'))
app.use('/api/data', require('./routes/data'))
app.use('/api/export', require('./routes/export'))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
