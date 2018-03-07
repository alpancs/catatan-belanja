const app = require("express")()
const respond = require("./responder/telegram")

app.use(require("body-parser").json())
app.post("/" + process.env.TELEGRAM_BOT_TOKEN, (req, res) => {
  respond(req.body).then(
    () => res.sendStatus(200),
    error => console.error(error) || res.sendStatus(500)
  )
  console.info(JSON.stringify(req.body))
})

app.listen(process.env.PORT || 3000)
