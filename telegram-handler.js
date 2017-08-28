const axios = require('axios')
const TELEGRAM_API = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/'

module.exports = (req, res) => {
  let message = req.body.message
  if (message && message.text)
    replyText(message.chat.id, message.message_id, message.text + ' juga')
  res.sendStatus(200)
}

function replyText(chatId, messageId, text) {
  return axios.post(TELEGRAM_API+'sendMessage', {chat_id: chatId, reply_to_message_id: messageId, text})
  .then(console.log)
  .catch(console.log)
}
