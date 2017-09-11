const axios = require('axios')
const regression = require('regression')
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
    else if (message.text.startsWith('/gak_jadi'))
      undo(message)
  }
  res.sendStatus(200)
}

let getShoppingText = (text) => {
  text = text.replace(/\d+\s*(rb|ribu)/gi, (phrase) => phrase.replace(/\s*(rb|ribu)/i, '000'))
  text = text.replace(/\d+\s*(jt|juta)/gi, (phrase) => phrase.replace(/\s*(jt|juta)/i, '000000'))
  let match = text.replace(/,|\./g, '').match(/(belanja|beli)\s+.*\w.*\s+\d{3,9}/i)
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
  Promise.all([
    ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfDay(now())}}).exec(),
    ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfWeek(now())}}).exec(),
    ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfMonth(now())}}).exec(),
    ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfDay(lastDays(10)), $lt: beginningOfDay(now())}}).sort({createdAt: 1}).exec(),
  ])
  .then(([dailyItems, weeklyItems, monthlyItems, last10DayItems]) => {
    let dailySum = dailyItems.reduce(sum, 0)
    let weeklySum = weeklyItems.reduce(sum, 0)
    let monthlySum = monthlyItems.reduce(sum, 0)

    let last10DaySums = last10DayItems.reduce(perDay, [])
    let data = last10DaySums.map((y, i) => [i, y.price])
    let todayPrediction = Math.round(regression.linear(data).predict(data.length)[1]/1000)*1000
    let tomorrowPrediction = Math.round(regression.linear(data).predict(data.length+1)[1]/1000)*1000

    let text = `*Total Belanja*\n- Hari ini: ${pretty(dailySum)}\n- Pekan ini: ${pretty(weeklySum)}\n- Bulan ini: ${pretty(monthlySum)}\n\n_hari ini paling ${pretty(todayPrediction)}..terus besok ${pretty(tomorrowPrediction)}_`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showDailyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfDay(now())}}).sort({createdAt: 1}).exec()
  .then((dailyItems) => {
    let itemsText = dailyItems.map((item) => `- ${item.name} (${pretty(item.price)})`).join('\n')
    let dailySum = dailyItems.reduce(sum, 0)
    let text = `*Belanjaan Hari Ini*\n${itemsText}\n\n*Total: ${pretty(dailySum)}*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showWeeklyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfWeek(now())}}).sort({createdAt: 1}).exec()
  .then((weeklyItems) => {
    let itemsText = weeklyItems.map((item) => `- ${item.name} (${pretty(item.price)})`).join('\n')
    let weeklySum = weeklyItems.reduce(sum, 0)
    let text = `*Belanjaan Pekan Ini*\n${itemsText}\n\n*Total: ${pretty(weeklySum)}*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let showMonthlyList = (message) => {
  ShoppingItem.find({owner: message.chat.id, createdAt: {$gte: beginningOfMonth(now())}}).sort({createdAt: 1}).exec()
  .then((monthlyItems) => {
    let itemsText = monthlyItems.map((item) => `- ${item.name} (${pretty(item.price)})`).join('\n')
    let monthlySum = monthlyItems.reduce(sum, 0)
    let text = `*Belanjaan Bulan Ini*\n${itemsText}\n\n*Total: ${pretty(monthlySum)}*`
    replyText(message.chat.id, message.message_id, text)
  }, console.log)
}

let undo = (message) => {
  ShoppingItem.findOne({owner: message.chat.id}).sort({createdAt: -1}).exec()
  .then((lastItem) => {
    lastItem.remove().then(() => replyText(message.chat.id, message.message_id, '${lastItem.name} gak jadi dicatat bos'))
  }, console.log)
}

let replyText = (chat_id, reply_to_message_id, text) =>
  telegramRequest.post('/sendMessage', {chat_id, reply_to_message_id, text, parse_mode: 'Markdown'})

let now = () => new Date(Date.now() + 7*3600*1000)
let lastDays = (n) => new Date(Date.now() + 7*3600*1000 - n*24*3600*1000)
let sum = (acc, item) => acc + item.price
let perDay = (acc, item) => {
  if (acc.length === 0 || acc[acc.length-1].date.getDate() !== item.createdAt.getDate())
    acc.push({date: item.createdAt, price: item.price})
  else
    acc[acc.length-1].price += item.price
  return acc
}

let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1, -7)

let pretty = (number) => {
  let text = String(Math.abs(number))
  let result = ''
  while (text.length > 3) {
    result = '.' + text.slice(-3) + result
    text = text.slice(0, -3)
  }
  return (number < 0 ? '-' : '') + text.slice(-3) + result
}
