const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true})

module.exports = mongoose.model('ShoppingItem', {owner: Number, name: String, price: Number})
