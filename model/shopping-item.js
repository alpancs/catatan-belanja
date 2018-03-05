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
        .find({owner, createdAt: $lt ? {$gte, $lt} : {$gte}})
        .sort({createdAt: 1})
        .exec()
ShoppingItem.today = (owner) => ShoppingItem.findRange(owner, today())
ShoppingItem.yesterday = (owner) => ShoppingItem.findRange(owner, yesterday(), today())
ShoppingItem.thisWeek = (owner) => ShoppingItem.findRange(owner, thisWeek())
ShoppingItem.pastWeek = (owner) => ShoppingItem.findRange(owner, pastWeek(), thisWeek())
ShoppingItem.thisMonth = (owner) => ShoppingItem.findRange(owner, thisMonth())
ShoppingItem.pastMonth = (owner) => ShoppingItem.findRange(owner, pastMonth(), thisMonth())
ShoppingItem.pastDays = (owner, n) => ShoppingItem.findRange(owner, shiftDay(-n), today())

ShoppingItem.lastItemToday = (owner) =>
    ShoppingItem
        .findOne({owner, createdAt: {$gte: today()}})
        .sort({createdAt: -1})
        .exec()

ShoppingItem.prototype.simpleDate = function() {
    return `${this.createdAt.getDate()}/${this.createdAt.getMonth()+1}`
}

let shiftDay = (n) => {
    let date = new Date(Date.now() + 7*3600*1000)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()+n, -7)
}
let today = () => shiftDay(0)
let yesterday = () => shiftDay(-1)

let beginningOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), -7)
let thisWeek = () => beginningOfWeek(shiftDay(0))
let pastWeek = () => beginningOfWeek(shiftDay(-7))

let shiftMonth = (n) => {
    let date = new Date(Date.now() + 7*3600*1000)
    return new Date(date.getFullYear(), date.getMonth()+n, 1, -7)
}
let thisMonth = () => shiftMonth(0)
let pastMonth = () => shiftMonth(-1)

module.exports = ShoppingItem
