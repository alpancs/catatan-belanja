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
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfMonth(new Date())}}).exec()
  .then((monthlyShoppingItems) => {
    let dailySum = monthlyShoppingItems.filter(daily).reduce(sum, 0)
    let weeklySum = monthlyShoppingItems.filter(weekly).reduce(sum, 0)
    let monthlySum = monthlyShoppingItems.reduce(sum, 0)
    let text = `Belanja hari ini: ${pretty(dailySum)}\nBelanja pekan ini: ${pretty(weeklySum)}\nBelanja bulan ini: ${pretty(monthlySum)}`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showMonthlyList = showWeeklyList = showDailyList = (message) =>
  replyText(message.chat.id, message.message_id, 'Fitur ini belum dibikin bos...')

let replyText = (chat_id, reply_to_message_id, text) => telegramRequest.post('/sendMessage', {chat_id, reply_to_message_id, text})

let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1, -7)

let sum = (acc, shoppingItem) => acc + shoppingItem.price
let daily = (shoppingItem) => shoppingItem.createdAt >= beginningOfDay(new Date())
let weekly = (shoppingItem) => shoppingItem.createdAt >= beginningOfWeek(new Date())

let pretty = (number) => {
  let text = String(number)
  let result = ''
  while (text.length > 3) {
    result = '.' + text.slice(-3) + result
    text = text.slice(0, -3)
  }
  return text.slice(-3) + result
}
