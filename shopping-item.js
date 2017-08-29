const mongoose = require('mongoose')

mongoose.Promise = Promise
mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true})

let shoppingItemSchema = {
  owner: Number,
  name: String,
  price: Number,
  createdAt: {type: Date, default: Date.now},
}

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema)
