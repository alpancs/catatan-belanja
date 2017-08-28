const axios = require('axios')
const TELEGRAM_API = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/'

module.exports = (req, res) => {
  res.sendStatus(200)
  let update = req.body
  if (update.text) replyText(update.chat.id, update.message.message_id, update.text + ' juga')
}

function replyText(chatId, messageId, text) {
  return axios.post(TELEGRAM_API+'sendMessage', {chat_id: chatId, reply_to_message_id: messageId, text})
}
