const express = require('express')
const path = require('path')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/collect', require('./routes/collect'))
app.use('/api/data', require('./routes/data'))
app.use('/api/export', require('./routes/export'))
app.use('/api/naver', require('./routes/naver'))
app.use('/api/fred',    require('./routes/fred'))
app.use('/api/bls',     require('./routes/bls'))
app.use('/api/finnhub', require('./routes/finnhub'))
app.use('/api/fmp',     require('./routes/fmp'))
app.use('/api/edgar',   require('./routes/edgar'))
app.use('/api/yahoo',   require('./routes/yahoo'))
app.use('/api/cboe',     require('./routes/cboe'))
app.use('/api/treasury', require('./routes/treasury'))
app.use('/api/bea',      require('./routes/bea'))
app.use('/api/polygon',  require('./routes/polygon'))
app.use('/api/etf',      require('./routes/etf'))
app.use('/api/edgar13f', require('./routes/edgar13f'))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
