const MongoClient = require('mongodb').MongoClient
let dbPromise = MongoClient.connect(process.env.MONGODB_URL)

module.exports = (req, res, next) => {
  next()
  dbPromise.then((db) => db.collection('logs').insert(req.body), console.log)
}
