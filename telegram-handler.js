const axios = require('axios')
const ShoppingItem = require('./shopping-item')
const telegramRequest = axios.create({baseURL: 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN})

module.exports = (req, res) => {
  let message = req.body.message
  if (message && message.text) {
    if (isCreateNewShopping(message.text))
      createNewShopping(message)
    else if (message.text === '/rangkuman')
      showSummary(message)
    else if (message.text === '/daftar_hari_ini')
      showDailyList(message)
    else if (message.text === '/daftar_pekan_ini')
      showWeeklyList(message)
    else if (message.text === '/daftar_bulan_ini')
      showMonthlyList(message)
  }
  res.sendStatus(200)
}

let isCreateNewShopping = (text) => text.match(/^(\w+ )*(belanja|beli)( \w+)+ \d+$/i)

const OK_ANSWERS = ['Oke bos. Sudah dicatat ya..', 'Dicatat bos...', 'Siap bos. Dicatat ya..']
let createNewShopping = (message) => {
  let tailText = message.text.slice(message.text.indexOf(' ')+1)
  let lastSpaceIndex = tailText.lastIndexOf(' ')
  let itemName = tailText.slice(0, lastSpaceIndex)
  let price = parseInt(tailText.slice(lastSpaceIndex+1))
  new ShoppingItem({owner: message.chat.id, name: itemName, price})
  .save()
  .then(() => replyText(message.chat.id, message.message_id, OK_ANSWERS[Math.floor(Math.random()*OK_ANSWERS.length)]))
  .catch(() => replyText(message.chat.id, message.message_id, 'Wah, piye iki? Yang ini gagal dicatat. :scream:'))
}

let showSummary = (message) => {
  ShoppingItem.find({owner: message.chat.id})
  .exec((err, shoppingItems) => {
    if (err) return console.error(err)
    let priceSum = shoppingItems.reduce((sum, shoppingItem) => sum + shoppingItem.price, 0)
    replyText(message.chat.id, message.message_id, `Total belanja: ${priceSum}`)
  })
}

let replyText = (chatId, messageId, text) =>
  telegramRequest.post('/sendMessage', {chat_id: chatId, reply_to_message_id: messageId, text})
