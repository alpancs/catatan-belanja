const mongoose = require("mongoose")
mongoose.connect(process.env.MONGODB_URL)

let Classification = mongoose.model("Classification", {
  owner: Number,
  name: String,
  category: String,
  createdAt: { type: Date, default: Date.now },
})

module.exports = Classification
