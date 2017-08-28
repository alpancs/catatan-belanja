const app = require('express')()
const bodyParser = require('body-parser')
const telegramHandler = require('./telegram-handler')

app.use(bodyParser.json())
app.post('/'+process.env.TELEGRAM_BOT_TOKEN, telegramHandler)

app.listen(process.env.PORT || 3000)
