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
    else if (message.text.startsWith('/hari_ini'))
      showDailyList(message)
    else if (message.text.startsWith('/pekan_ini'))
      showWeeklyList(message)
    else if (message.text.startsWith('/bulan_ini'))
      showMonthlyList(message)
    else if (message.text.startsWith('/gak_jadi'))
      undo(message)
    else if (mentioned(message))
      reply(message, randomPick(['ngomong apa bos?', 'mbuh bos, gak ngerti']))
  }
  res.sendStatus(200)
}

let getShoppingText = (text) => {
  text = text.replace(/\d+\s*(rb|ribu)/gi, (phrase) => phrase.replace(/\s*(rb|ribu)/i, '000'))
  text = text.replace(/\d+\s*(jt|juta)/gi, (phrase) => phrase.replace(/\s*(jt|juta)/i, '000000'))
  let match = text.replace(/,|\./g, '').match(/(belanja|beli|bayar)\s+.*\w.*\s+\d{3,9}/i)
  return match ? match[0] : ''
}

let createNewShopping = (message, shoppingText) => {
  let words = shoppingText.split(/\s+/)
  let name = words.slice(1, -1).join(' ')
  let price = parseInt(words[words.length-1].replace(/\D/g, ''))
  let text = randomPick(['oke bos. sudah dicatat 👌', 'dicatat bos 👌', 'siap bos. dicatat ya 👌'])
  text += `\n*${name}* *${pretty(price)}*`
  new ShoppingItem({owner: message.chat.id, name: name, price}).save()
  .then(() => reply(message, text))
  .catch(() => reply(message, 'wah, piye iki? yang ini gagal dicatat. 😱'))
}

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
      'hari ini: ' + prettySum(dailyItems),
      'pekan ini: ' + prettySum(weeklyItems),
      'bulan ini: ' + prettySum(monthlyItems),
      '',
      `_hari ini paling belanja ${pretty(todayPrediction)} bos... terus besok ${pretty(tomorrowPrediction)}_`,
    ].join('\n')
    reply(message, text)
  }, console.log)
}

let showList = (message, items, title) => {
  let text = title + '\n'
  text += items.map((item) => `- ${item.name} (${pretty(item.price)})\n`).join('')
  text += `\n*total: ${prettySum(items)}*`
  return reply(message, text)
}

let showDailyList = (message) =>
  ShoppingItem.findToday(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN HARI INI ==*'), console.log)

let showWeeklyList = (message) =>
  ShoppingItem.findThisWeek(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN PEKAN INI ==*'), console.log)

let showMonthlyList = (message) =>
  ShoppingItem.findThisMonth(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN BULAN INI ==*'), console.log)

let undo = (message) => {
  return ShoppingItem.findLastItemToday(message.chat.id)
  .then((lastItem) => lastItem.remove())
  .then((lastItem) => reply(message, `*${lastItem.name}* gak jadi dicatat bos`))
  .catch(console.log)
}

let reply = (message, text) =>
  telegramRequest.post('/sendMessage', {
    chat_id: message.chat.id,
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

let prettySum = (items) => pretty(items.reduce((acc, item) => acc + item.price, 0))

let randomPick = (list) => list[Math.floor(Math.random()*list.length)]

let mentioned = (message) =>
  message.text.match(/\bbot\b/i) ||
  message.text.toLowerCase().includes(process.env.BOT_USERNAME) ||
  (message.reply_to_message && message.reply_to_message.from.username === process.env.BOT_USERNAME)
