require("./helper")
const api = require("axios").create({
  baseURL: "https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN,
})
const ShoppingItem = require("../model/shopping-item")
const regression = require("regression")

let respond = body => new Promise((resolve) => {
  let response = Promise.resolve()
  let message = body.message
  if (message && message.text) {
    let text = message.text
    let shoppingText = getShoppingText(text)
    if (shoppingText) response = createNewShopping(message, shoppingText)

    else if (text.startsWith("/rangkuman")) response = summary(message)

    else if (text.startsWith("/hari_ini")) response = listToday(message)
    else if (text.startsWith("/kemarin")) response = listYesterday(message)
    else if (text.startsWith("/pekan_ini")) response = listThisWeek(message)
    else if (text.startsWith("/pekan_lalu")) response = listPastWeek(message)
    else if (text.startsWith("/bulan_ini")) response = listThisMonth(message)
    else if (text.startsWith("/bulan_lalu")) response = listPastMonth(message)

    else if (text.startsWith("/gak_jadi")) response = undo(message)

    else if (isMentioned(message)) response = replyMention()
  }
  response
    .then(responseText => responseText ? reply(message, responseText) : Promise.resolve())
    .catch(console.error)
  resolve()
})

let reply = (message, text, replyTo) =>
  api.post("/sendMessage", {
    chat_id: message.chat.id,
    text: text,
    parse_mode: "Markdown",
    reply_to_message_id: replyTo,
  })


/* NEW SHOPPING ITEM */
let getShoppingText = (text) => {
  text = text.replace(/\d(\.\d{3})+/g, phrase => phrase.replace(/\./g, ""))
  text = text.replace(/\d,\d/g, phrase => phrase.replace(",", "."))
  text = text.replace(/\d+(\.\d+)?\s*(k|rb|ribu)/gi, phrase => phrase.match(/\d+(\.\d+)?/)[0] * 1000)
  text = text.replace(/\d+(\.\d+)?\s*(m|jt|juta)/gi, phrase => phrase.match(/\d+(\.\d+)?/)[0] * 1000 * 1000)
  const match = text.match(/(belanja|beli|bayar)\s+.*\w.*\s+\d{3,10}/i)
  return match ? match[0] : ""
}

const OK_MSGS = [
  "oke bos. sudah dicatat 👌",
  "dicatat bos 👌",
  "siap bos. dicatat ya 👌",
]
let createNewShopping = (message, shoppingText) => {
  let owner = message.chat.id
  let words = shoppingText.split(/\s+/)
  let name = words.slice(1, -1).join(" ")
  let price = Number(words[words.length - 1])
  return new ShoppingItem({ owner, name, price }).save()
    .then(
      () => calculateShock(owner, price)
        .then(shock =>
          OK_MSGS.sample() + `\n*${name}* *${price.pretty()}*`
          + (shock ? `\n\n${name} ${price.pretty()}? ` + "😱".repeat(shock) : "")
        ),
      error => console.error(error) || `wah, piye iki? ${name} gagal dicatat 🙏`
    )
}

let calculateShock = (owner, price) =>
  ShoppingItem.pastDays(owner, 15).then((pastItems) => {
    if (pastItems.length == 0) return 0
    let avg = pastItems.sumBy("price") / pastItems.length
    return Math.max(0, Math.round(Math.log(price / avg)))
  })


/* SUMMARY */
let summary = (message) => {
  let owner = message.chat.id
  return Promise.all([
    ShoppingItem.today(owner),
    ShoppingItem.yesterday(owner),
    ShoppingItem.thisWeek(owner),
    ShoppingItem.pastWeek(owner),
    ShoppingItem.thisMonth(owner),
    ShoppingItem.pastMonth(owner),
    ShoppingItem.pastDays(owner, 15),
  ]).then(([todayItems, yesterdayItems, thisWeekItems, pastWeekItems, thisMonthItems, pastMonthItems, pastItems]) => {
    let data = pastItems.reduce(perDay, []).map((reducedItem, i) => [
      i,
      reducedItem.price,
    ])
    let todayPrediction = Math.round(regression.linear(data).predict(data.length)[1] / 1000) * 1000
    let tomorrowPrediction = Math.round(regression.linear(data).predict(data.length + 1)[1] / 1000) * 1000
    return [
      "*== RANGKUMAN TOTAL BELANJA ==*",
      `hari ini: ${todayItems.sumBy("price").pretty()}`,
      `kemarin: ${yesterdayItems.sumBy("price").pretty()}`,
      `pekan ini: ${thisWeekItems.sumBy("price").pretty()}`,
      `pekan lalu: ${pastWeekItems.sumBy("price").pretty()}`,
      `bulan ini: ${thisMonthItems.sumBy("price").pretty()}`,
      `bulan lalu: ${pastMonthItems.sumBy("price").pretty()}`,
      "",
      `_hari ini mungkin ${todayPrediction.pretty()} .._`,
      `_.. terus besok ${tomorrowPrediction.pretty()}_`,
    ].join("\n")
  })
}

let perDay = (acc, item) => {
  let itemDate = item.createdAt.getDate()
  if (acc.length && acc[acc.length - 1].date === itemDate) {
    acc[acc.length - 1].price += item.price
  } else {
    acc.push({ date: itemDate, price: item.price })
  }
  return acc
}


/* LIST */
let listToday = message =>
  ShoppingItem
    .today(message.chat.id)
    .then(items => "*== BELANJAAN HARI INI ==*\n" + formatItems(items))

let listYesterday = message =>
  ShoppingItem
    .yesterday(message.chat.id)
    .then(items => "*== BELANJAAN KEMARIN ==*\n" + formatItems(items))

let listThisWeek = message =>
  ShoppingItem
    .thisWeek(message.chat.id)
    .then(items => "*== BELANJAAN PEKAN INI ==*\n" + formatItems(items))

let listPastWeek = message =>
  ShoppingItem
    .pastWeek(message.chat.id)
    .then(items => "*== BELANJAAN PEKAN LALU ==*\n" + formatItems(items))

let listThisMonth = message =>
  ShoppingItem
    .thisMonth(message.chat.id)
    .then(items => "*== BELANJAAN BULAN INI ==*\n" + formatItems(items))

let listPastMonth = message =>
  ShoppingItem
    .pastMonth(message.chat.id)
    .then(items => "*== BELANJAAN BULAN LALU ==*\n" + formatItems(items))

let formatItems = items =>
  items.map(item => `- ${item.name} (${item.price.pretty()}) – ${item.createdAt.simple()}`).join("\n")
  + `\n\n*total: ${items.sumBy("price").pretty()}*`


/* UNDO */
let undo = message =>
  ShoppingItem
    .lastItemToday(message.chat.id)
    .then(lastItem => lastItem.remove())
    .then(lastItem => `*${lastItem.name}* gak jadi dicatat bos`)


/* MENTION */
let isMentioned = message =>
  message.text.match(/\bbo(t|s)\b/i) ||
    message.text.toLowerCase().includes(process.env.BOT_USERNAME) ||
    (message.reply_to_message && message.reply_to_message.from.username === process.env.BOT_USERNAME)

const MENTIONED_MSGS = [
  "ngomong apa to bos?",
  "mbuh bos, gak ngerti",
  "aku orak paham boooss 😔",
]
let replyMention = () => Promise.resolve(MENTIONED_MSGS.sample())

module.exports = respond
