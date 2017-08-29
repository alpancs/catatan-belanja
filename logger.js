const MongoClient = require('mongodb').MongoClient

module.exports = (req, res, next) => {
  next()
  MongoClient.connect(process.env.MONGODB_URL)
  .then((db) => db.collection('logs').insert(req.body), undefined)
}
