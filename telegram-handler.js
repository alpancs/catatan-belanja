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
  let match = text.replace(/,|\./g, '').match(/(belanja|beli|bayar)\s+.*\w.*\s+\d{3,9}/i)
  return match ? match[0] : ''
}

const OK_ANSWERS = ['Oke bos. Sudah dicatat ya..', 'Dicatat bos...', 'Siap bos. Dicatat ya.']
let createNewShopping = (message, shoppingText) => {
  let words = shoppingText.split(/\s+/)
  let itemName = words.slice(1, -1).join(' ')
  let price = parseInt(words[words.length-1].replace(/\D/g, ''))
  new ShoppingItem({owner: message.chat.id, name: itemName, price}).save()
  .then(() => reply(message, OK_ANSWERS[Math.floor(Math.random()*OK_ANSWERS.length)]))
  .catch(() => reply(message, 'Wah, piye iki? Yang ini gagal dicatat. :scream:'))
}

let sumPrice = (items) => items.reduce((acc, item) => acc + item.price, 0)

let showSummary = (message) => {
  let owner = message.chat.id
  Promise.all([
    ShoppingItem.findToday(owner),
    ShoppingItem.findThisWeek(owner),
    ShoppingItem.findThisMonth(owner),
    ShoppingItem.findLastDays(owner, 15),
  ])
  .then(([dailyItems, weeklyItems, monthlyItems, lastItems]) => {
    let data = lastItems.reduce(perDay, []).map((reducedItem, i) => [i, reducedItem.price])
    let todayPrediction = Math.round(regression.linear(data).predict(data.length)[1]/1000)*1000
    let tomorrowPrediction = Math.round(regression.linear(data).predict(data.length+1)[1]/1000)*1000

    let text = [
      '*== TOTAL BELANJA ==*',
      'Hari ini: ' + pretty(sumPrice(dailyItems)),
      'Pekan ini: ' + pretty(sumPrice(weeklyItems)),
      'Bulan ini: ' + pretty(sumPrice(monthlyItems)),
      '',
      `_Hari ini paling belanja ${pretty(todayPrediction)} bos... terus besok ${tomorrowPrediction}_`,
    ].join('\n')
    reply(message, text)
  }, console.log)
}

let showList = (message, items, title) => {
  let text = title + '\n'
  text += items.map((item) => `- ${item.name} (${pretty(item.price)})\n`).join('')
  text += `\n*Total: ${pretty(sumPrice(items))}*`
  return reply(message, text)
}

let showDailyList = (message) =>
  ShoppingItem.findToday(message.chat.id)
  .then((dailyItems) => showList(message, dailyItems, '*== BELANJAAN HARI INI ==*'), console.log)

let showWeeklyList = (message) =>
  ShoppingItem.findThisWeek(message.chat.id)
  .then((weeklyItems) => showList(message, weeklyItems, '*== BELANJAAN PEKAN INI ==*'), console.log)

let showMonthlyList = (message) =>
  ShoppingItem.findThisMonth(message.chat.id)
  .then((monthlyItems) => showList(message, dailyItems, '*== BELANJAAN BULAN INI ==*'), console.log)

let undo = (message) => {
  return ShoppingItem.findOne({owner: message.chat.id, createdAt: {$gte: beginningOfDay(now())}}).sort({createdAt: -1}).exec()
  .then((lastItem) => lastItem.remove())
  .then(() => reply(message, `*${lastItem.name}* gak jadi dicatat bos`))
  .catch(console.log)
}

let reply = (message, text) =>
  telegramRequest.post('/sendMessage', {
    chat_id: message.chat.id,
    reply_to_message_id: message.message_id,
    text,
    parse_mode: 'Markdown'
  })

let perDay = (acc, item) => {
  if (acc.length === 0 || acc[acc.length-1].date.getDate() !== item.createdAt.getDate())
    acc.push({date: item.createdAt, price: item.price})
  else
    acc[acc.length-1].price += item.price
  return acc
}

let pretty = (number) => {
  let text = String(Math.abs(number))
  let result = ''
  while (text.length > 3) {
    result = '.' + text.slice(-3) + result
    text = text.slice(0, -3)
  }
  return (number < 0 ? '-' : '') + text.slice(-3) + result
}
