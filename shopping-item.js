const mongoose = require('mongoose')

mongoose.Promise = Promise
mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true})

let shoppingItemSchema = {
  owner: Number,
  name: String,
  price: Number,
  createdAt: {type: Date, default: Date.now},
}

ShoppingItem = mongoose.model('ShoppingItem', shoppingItemSchema)

ShoppingItem.findToday = (owner) => ShoppingItem.find({owner, createdAt: {$gte: today()}}).sort({createdAt: 1}).exec()
ShoppingItem.findYesterday = (owner) => ShoppingItem.find({owner, createdAt: {$gte: yesterday(), $lt: today()}}).sort({createdAt: 1}).exec()

ShoppingItem.findThisWeek = (owner) => ShoppingItem.find({owner, createdAt: {$gte: thisWeek()}}).sort({createdAt: 1}).exec()
ShoppingItem.findPastWeek = (owner) => ShoppingItem.find({owner, createdAt: {$gte: pastWeek(), $lt: thisWeek()}}).sort({createdAt: 1}).exec()

ShoppingItem.findThisMonth = (owner) => ShoppingItem.find({owner, createdAt: {$gte: thisMonth()}}).sort({createdAt: 1}).exec()
ShoppingItem.findPastMonth = (owner) => ShoppingItem.find({owner, createdAt: {$gte: pastMonth(), $lt: thisMonth()}}).sort({createdAt: 1}).exec()

ShoppingItem.findPastDays = (owner, n) => ShoppingItem.find({owner, createdAt: {$gte: lastNDay(n), $lt: today()}}).sort({createdAt: 1}).exec()
ShoppingItem.findLastItemToday = (owner) => ShoppingItem.findOne({owner, createdAt: {$gte: today()}}).sort({createdAt: -1}).exec()

let today = () => lastNDay(0)
let yesterday = () => lastNDay(1)

let thisWeek = () => beginningOfWeek(today())
let pastWeek = () => beginningOfWeek(lastNDay(7))

let thisMonth = () => beginningOfLastNMonth(today(), 0)
let pastMonth = () => beginningOfLastNMonth(today(), 1)

let now = () => new Date(Date.now() + 7*3600*1000)
let lastNDay = (n) => beginningOfDay(new Date(Date.now() + 7*3600*1000 - n*24*3600*1000))

let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfLastNMonth = (date, n) => new Date(date.getFullYear(), date.getMonth() - n, 1, -7)

module.exports = ShoppingItem
