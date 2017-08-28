module.exports = (req, res) => {
  console.log(JSON.stringify(req.body))
  res.sendStatus(200)
}
