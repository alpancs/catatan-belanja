const app = require('express')()
const bodyParser = require('body-parser')
const telegramHandler = require('./telegram-handler')
const logger = require('./logger')

app.use(bodyParser.json())
app.use(logger)
app.post('/'+process.env.TELEGRAM_BOT_TOKEN, telegramHandler)

app.listen(process.env.PORT || 3000)
