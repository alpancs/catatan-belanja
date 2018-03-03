const mongoose = require("mongoose")

mongoose.Promise = Promise
mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true})

let schema = new mongoose.Schema({
    owner: Number,
    name: String,
    price: Number,
    createdAt: {type: Date, default: Date.now},
})

let asc = {createdAt: 1}

schema.statics.today = function(owner) {
    return this.find({owner, createdAt: {$gte: today()}}).sort(asc).exec()
}

schema.statics.yesterday = function(owner) {
    return this.find({owner, createdAt: {$gte: lastNDay(1), $lt: today()}}).sort(asc).exec()
}


schema.statics.thisWeek = function(owner) {
    return this.find({owner, createdAt: {$gte: thisWeek()}}).sort(asc).exec()
}

schema.statics.pastWeek = function(owner) {
    return this.find({owner, createdAt: {$gte: pastWeek(), $lt: thisWeek()}}).sort(asc).exec()
}


schema.statics.thisMonth = function(owner) {
    return this.find({owner, createdAt: {$gte: thisMonth()}}).sort(asc).exec()
}

schema.statics.pastMonth = function(owner) {
    return this.find({owner, createdAt: {$gte: pastMonth(), $lt: thisMonth()}}).sort(asc).exec()
}


schema.statics.pastDays = function(owner, n) {
    return this.find({owner, createdAt: {$gte: lastNDay(n), $lt: today()}}).sort(asc).exec()
}

schema.statics.lastItemToday = function(owner) {
    return this.findOne({owner, createdAt: {$gte: today()}}).sort({createdAt: -1}).exec()
}

schema.methods.simpleDate = function() {
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

module.exports = mongoose.model("ShoppingItem", schema)
