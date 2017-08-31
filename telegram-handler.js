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
  let match = text.replace(/\./g, '').match(/(belanja|beli)\s+.*\w.*\s+\d{3,9}/i)
  return match ? match[0] : ''
}

const OK_ANSWERS = ['Oke bos. Sudah dicatat ya..', 'Dicatat bos...', 'Siap bos. Dicatat ya.']
let createNewShopping = (message, shoppingText) => {
  let words = shoppingText.split(/\s+/)
  let itemName = words.slice(1, -1).join(' ')
  let price = parseInt(words[words.length-1].replace(/\D/g, ''))
  new ShoppingItem({owner: message.chat.id, name: itemName, price}).save()
  .then(() => replyText(message.chat.id, message.message_id, OK_ANSWERS[Math.floor(Math.random()*OK_ANSWERS.length)]))
  .catch(() => replyText(message.chat.id, message.message_id, 'Wah, piye iki? Yang ini gagal dicatat. :scream:'))
}

let showSummary = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfMonth(now())}}).exec()
  .then((monthlyShoppingItems) => {
    let dailySum = monthlyShoppingItems.filter(daily).reduce(sum, 0)
    let weeklySum = monthlyShoppingItems.filter(weekly).reduce(sum, 0)
    let monthlySum = monthlyShoppingItems.reduce(sum, 0)
    let text = `Total belanja hari ini: ${pretty(dailySum)}\nTotal belanja pekan ini: ${pretty(weeklySum)}\nTotal belanja bulan ini: ${pretty(monthlySum)}`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showDailyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfDay(now())}}).sort({createdAt: 1}).exec()
  .then((dailyShoppingItems) => {
    let itemsText = dailyShoppingItems.map((shoppingItem) => `${shoppingItem.name} (${pretty(shoppingItem.price)})`).join(', ')
    let dailySum = dailyShoppingItems.reduce(sum, 0)
    let text = `Belanjaan hari ini: ${itemsText}.\n*Total: ${pretty(dailySum)}.*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showWeeklyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfWeek(now())}}).sort({createdAt: 1}).exec()
  .then((weeklyShoppingItems) => {
    let itemsText = weeklyShoppingItems.map((shoppingItem) => `${shoppingItem.name} (${pretty(shoppingItem.price)})`).join(', ')
    let weeklySum = weeklyShoppingItems.reduce(sum, 0)
    let text = `Belanjaan pekan ini: ${itemsText}.\n*Total: ${pretty(weeklySum)}.*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showMonthlyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfMonth(now())}}).sort({createdAt: 1}).exec()
  .then((monthlyShoppingItems) => {
    let itemsText = monthlyShoppingItems.map((shoppingItem) => `${shoppingItem.name} (${pretty(shoppingItem.price)})`).join(', ')
    let monthlySum = monthlyShoppingItems.reduce(sum, 0)
    let text = `Belanjaan bulan ini: ${itemsText}.\n*Total: ${pretty(monthlySum)}.*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let replyText = (chat_id, reply_to_message_id, text) =>
  telegramRequest.post('/sendMessage', {chat_id, reply_to_message_id, text, parse_mode: 'Markdown'})

let sum = (acc, shoppingItem) => acc + shoppingItem.price
let daily = (shoppingItem) => shoppingItem.createdAt >= beginningOfDay(now())
let weekly = (shoppingItem) => shoppingItem.createdAt >= beginningOfWeek(now())
let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1, -7)
let now = () => new Date(Date.now() + 7*3600*1000)

let pretty = (number) => {
  let text = String(number)
  let result = ''
  while (text.length > 3) {
    result = '.' + text.slice(-3) + result
    text = text.slice(0, -3)
  }
  return text.slice(-3) + result
}
