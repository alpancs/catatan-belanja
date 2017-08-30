const axios = require('axios')
const ShoppingItem = require('./shopping-item')
const telegramRequest = axios.create({baseURL: 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN})

module.exports = (req, res) => {
  let message = req.body.message
  if (message && message.text) {
    let shoppingText = getShoppingText(message.text)
    if (shoppingText)
      createNewShopping(message, shoppingText)
    else if (message.text.startsWith('/rangkuman'))
      showSummary(message)
    else if (message.text.startsWith('/daftar_hari_ini'))
      showDailyList(message)
    else if (message.text.startsWith('/daftar_pekan_ini'))
      showWeeklyList(message)
    else if (message.text.startsWith('/daftar_bulan_ini'))
      showMonthlyList(message)
  }
  res.sendStatus(200)
}

let getShoppingText = (text) => {
  let match = text.match(/(belanja|beli)\s+.*\w.*\s+\d{3,9}/i)
  return match ? match[0] : ''
}

const OK_ANSWERS = ['Oke bos. Sudah dicatat ya..', 'Dicatat bos...', 'Siap bos. Dicatat ya..']
let createNewShopping = (message, shoppingText) => {
  let words = shoppingText.split(/\s+/)
  let itemName = words.slice(1, -1).join(' ')
  let price = parseInt(words[words.length-1])
  new ShoppingItem({owner: message.chat.id, name: itemName, price}).save()
  .then(() => replyText(message.chat.id, message.message_id, OK_ANSWERS[Math.floor(Math.random()*OK_ANSWERS.length)]))
  .catch(() => replyText(message.chat.id, message.message_id, 'Wah, piye iki? Yang ini gagal dicatat. :scream:'))
}

let showSummary = (message) => {
  ShoppingItem.find({owner: message.chat.id}).exec()
  .then((shoppingItems) => {
    let priceSum = shoppingItems.reduce((sum, shoppingItem) => sum + shoppingItem.price, 0)
    replyText(message.chat.id, message.message_id, `Total belanja: ${priceSum}`)
  }, console.log)
}

let showMonthlyList = showWeeklyList = showDailyList = (message) =>
  replyText(message.chat.id, message.message_id, 'Fitur ini belum dibikin bos...')

let replyText = (chatId, messageId, text) =>
  telegramRequest.post('/sendMessage', {chat_id: chatId, reply_to_message_id: messageId, text})
