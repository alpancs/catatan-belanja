const mongoose = require("mongoose")
mongoose.connect(process.env.MONGODB_URL)

const Classification = mongoose.model("Classification", {
  owner: Number,
  name: String,
  category: String,
  createdAt: { type: Date, default: Date.now },
})

module.exports = Classification
