const ShoppingItem = require('./shopping-item')
const regression = require('regression')
const telegramRequest = require('axios').create({baseURL: 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN})

module.exports = (req, res) => {
  let message = req.body.message
  if (message && message.text) {
    let shoppingText = getShoppingText(message.text)
    if (shoppingText) createNewShopping(message, shoppingText)

    else if (message.text.startsWith('/rangkuman')) summary(message)
    else if (message.text.startsWith('/gak_jadi')) undo(message)

    else if (message.text.startsWith('/hari_ini')) listToday(message)
    else if (message.text.startsWith('/kemarin')) listYesterday(message)

    else if (message.text.startsWith('/pekan_ini')) listThisWeek(message)
    else if (message.text.startsWith('/pekan_lalu')) listPastWeek(message)

    else if (message.text.startsWith('/bulan_ini')) listThisMonth(message)
    else if (message.text.startsWith('/bulan_lalu')) listPastMonth(message)

    else if (mentioned(message)) reply(message, randomPick(['ngomong apa bos?', 'mbuh bos, gak ngerti']))
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

  calculateShock(message.chat.id, price).then(shock => {
    if (shock > 0) text += `\n\n*${name}* *${pretty(price)}*? ` + '😱'.repeat(shock)
    new ShoppingItem({owner: message.chat.id, name: name, price}).save()
    .then(() => reply(message, text))
    .catch(() => reply(message, 'wah, piye iki? yang ini gagal dicatat. 😱'))
  })
}

let calculateShock = (owner, price) => {
  return ShoppingItem.findLastDays(owner, 15).then(lastItems => {
    if (lastItems.length == 0) return 0
    let avg = lastItems.reduce((acc, item) => acc + item.price, 0) / lastItems.length
    return Math.max(0, Math.round(Math.log(price/avg)))
  })
}

let summary = (message) => {
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
      'hari ini: ' + pretty(sumItems(dailyItems)),
      'pekan ini: ' + pretty(sumItems(weeklyItems)),
      'bulan ini: ' + pretty(sumItems(monthlyItems)),
      '',
      `_hari ini paling belanja ${pretty(todayPrediction)} bos... terus besok ${pretty(tomorrowPrediction)}_`,
    ].join('\n')
    reply(message, text)
  }, console.log)
}

let undo = (message) =>
  ShoppingItem
  .findLastItemToday(message.chat.id)
  .then((lastItem) => lastItem.remove())
  .then((lastItem) => reply(message, `*${lastItem.name}* gak jadi dicatat bos`))
  .catch(console.log)

let showList = (message, items, title) => {
  let text = title + '\n'
  text += items.map((item) => `• ${item.name} (${pretty(item.price)})\n`).join('')
  text += `\n*total: ${pretty(sumItems(items))}*`
  return reply(message, text)
}

let listToday = (message) =>
  ShoppingItem
  .findToday(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN HARI INI ==*'), console.log)

let listYesterday = (message) =>
  ShoppingItem
  .findYesterday(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN KEMARIN ==*'), console.log)

let listThisWeek = (message) =>
  ShoppingItem
  .findThisWeek(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN PEKAN INI ==*'), console.log)

let listPastWeek = (message) =>
  ShoppingItem
  .findPastWeek(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN PEKAN LALU ==*'), console.log)

let listThisMonth = (message) =>
  ShoppingItem
  .findThisMonth(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN BULAN INI ==*'), console.log)

let listPastMonth = (message) =>
  ShoppingItem
  .findPastMonth(message.chat.id)
  .then((items) => showList(message, items, '*== BELANJAAN BULAN LALU ==*'), console.log)

let reply = (message, text) =>
  telegramRequest.post('/sendMessage', {chat_id: message.chat.id, text: text, parse_mode: 'Markdown'})

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

let sumItems = (items) => items.reduce((acc, item) => acc + item.price, 0)

let randomPick = (list) => list[Math.floor(Math.random()*list.length)]

let mentioned = (message) =>
  message.text.match(/\bbo(t|s)\b/i) ||
  message.text.toLowerCase().includes(process.env.BOT_USERNAME) ||
  (message.reply_to_message && message.reply_to_message.from.username === process.env.BOT_USERNAME)
