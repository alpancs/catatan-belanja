const app = require('express')()

app.use(require('body-parser').json())
app.post('/'+process.env.TELEGRAM_BOT_TOKEN, require('./telegram-handler'))

app.listen(process.env.PORT || 3000)
