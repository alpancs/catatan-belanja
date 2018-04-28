const mongoose = require("mongoose")
mongoose.connect(process.env.MONGODB_URL)

const ShoppingItem = mongoose.model("ShoppingItem", {
  owner: Number,
  name: String,
  price: Number,
  createdAt: { type: Date, default: Date.now },
})

ShoppingItem.findRange = (owner, $gte, $lt) =>
  ShoppingItem
    .find({ owner, createdAt: $lt ? { $gte, $lt } : { $gte } })
    .sort({ createdAt: 1 })
    .exec()
ShoppingItem.today = owner => ShoppingItem.findRange(owner, shiftDay(0))
ShoppingItem.yesterday = owner => ShoppingItem.findRange(owner, shiftDay(-1), shiftDay(0))
ShoppingItem.thisWeek = owner => ShoppingItem.findRange(owner, shiftWeek(0))
ShoppingItem.pastWeek = owner => ShoppingItem.findRange(owner, shiftWeek(-1), shiftWeek(0))
ShoppingItem.thisMonth = owner => ShoppingItem.findRange(owner, shiftMonth(0))
ShoppingItem.pastMonth = owner => ShoppingItem.findRange(owner, shiftMonth(-1), shiftMonth(0))
ShoppingItem.pastDays = (owner, n) => ShoppingItem.findRange(owner, shiftDay(-n), shiftDay(0))

ShoppingItem.lastItem = owner =>
  ShoppingItem
    .findOne({ owner })
    .sort({ createdAt: -1 })
    .exec()

const shiftDay = (n) => {
  const date = new Date(Date.now() + 7 * 3600 * 1000)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, -7)
}

const shiftWeek = (n) => {
  const date = shiftDay(7 * n)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
}

const shiftMonth = (n) => {
  const date = shiftDay(0)
  return new Date(date.getFullYear(), date.getMonth() + n, 1, -7)
}

module.exports = ShoppingItem
