const mongoose = require("mongoose")
mongoose.connect(process.env.MONGODB_URL)

let ShoppingItem = mongoose.model("ShoppingItem", {
    owner: Number,
    name: String,
    price: Number,
    createdAt: {type: Date, default: Date.now},
})

ShoppingItem.findRange = (owner, $gte, $lt) =>
    ShoppingItem
        .find({owner, createdAt: {$gte, $lt}})
        .sort({createdAt: 1})
        .exec()
ShoppingItem.today = (owner) => ShoppingItem.findRange(owner, today())
ShoppingItem.yesterday = (owner) => ShoppingItem.findRange(owner, lastNDay(1), today())
ShoppingItem.thisWeek = (owner) => ShoppingItem.findRange(owner, thisWeek())
ShoppingItem.pastWeek = (owner) => ShoppingItem.findRange(owner, pastWeek(), thisWeek())
ShoppingItem.thisMonth = (owner) => ShoppingItem.findRange(owner, thisMonth())
ShoppingItem.pastMonth = (owner) => ShoppingItem.findRange(owner, pastMonth(), thisMonth())
ShoppingItem.pastDays = (owner, n) => ShoppingItem.findRange(owner, lastNDay(n), today())

ShoppingItem.lastItemToday = (owner) =>
    ShoppingItem
        .findOne({owner, createdAt: {$gte: today()}})
        .sort({createdAt: -1})
        .exec()

ShoppingItem.prototype.simpleDate = function() {
    return `${this.createdAt.getDate()}/${this.createdAt.getMonth()+1}`
}

let today = () => lastNDay(0)
let lastNDay = (n) => beginningOfDay(new Date(Date.now() + 7*3600*1000 - n*24*3600*1000))

let thisWeek = () => beginningOfWeek(lastNDay(0))
let pastWeek = () => beginningOfWeek(lastNDay(7))

let thisMonth = () => beginningOfLastNMonth(today(), 0)
let pastMonth = () => beginningOfLastNMonth(today(), 1)

let beginningOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), -7)
let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let beginningOfLastNMonth = (date, n) => new Date(date.getFullYear(), date.getMonth() - n, 1, -7)

module.exports = ShoppingItem
