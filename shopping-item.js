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

ShoppingItem.findToday = (owner) => ShoppingItem.find({owner, createdAt: {$gte: beginningOfDay(now())}}).sort({createdAt: 1}).exec()
ShoppingItem.findLastDays = (owner, n) => ShoppingItem.find({owner, createdAt: {$gte: beginningOfDay(lastDays(n)), $lt: beginningOfDay(now())}}).sort({createdAt: 1}).exec()
ShoppingItem.findThisWeek = (owner) => ShoppingItem.find({owner, createdAt: {$gte: beginningOfWeek(now())}}).sort({createdAt: 1}).exec()
ShoppingItem.findThisMonth = (owner) => ShoppingItem.find({owner, createdAt: {$gte: beginningOfMonth(now())}}).sort({createdAt: 1}).exec()
ShoppingItem.findLastItemToday = (owner) => ShoppingItem.findOne({owner, createdAt: {$gte: beginningOfDay(now())}}).sort({createdAt: -1}).exec()

let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1, -7)

let lastDays = (n) => new Date(Date.now() + 7*3600*1000 - n*24*3600*1000)
let now = () => lastDays(0)

module.exports = ShoppingItem
