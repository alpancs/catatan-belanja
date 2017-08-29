const axios = require('axios')
const ShoppingItem = require('./shopping-item')
const TELEGRAM_API = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/'

module.exports = (req, res) => {
  let message = req.body.message
  if (message && message.text) {
    if (isCreateNewShopping(message.text)) createNewShopping(message)
  }
  res.sendStatus(200)
}

let isCreateNewShopping = (text) => text.match(/^(\w+ )*(belanja|beli)( \w+)+ \d+$/i)

const OK_ANSWERS = ['Oke bos. Sudah dicatat ya..', 'Siap bos. Sudah dicatat.', 'Siap bos. Dicatat ya..']
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

let replyText = (chatId, messageId, text) =>
  axios.post(TELEGRAM_API+'sendMessage', {chat_id: chatId, reply_to_message_id: messageId, text})
