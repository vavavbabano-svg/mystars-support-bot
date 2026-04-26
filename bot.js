const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN || 'ТВОЙ_ТОКЕН';
const ADMIN_ID = 1444520038;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен');

// Мини-сервер чтобы Render не усыпал
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive');
}).listen(process.env.PORT || 10000);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Добро пожаловать в MyStars Support!\n\nОпишите вашу проблему, и мы ответим в ближайшее время.');
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, '🆘 Нужна помощь?\n\nОпишите вашу проблему, и администратор свяжется с вами.');
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const userId = msg.from.id;
  const from = msg.from.username ? `@${msg.from.username}` : userId;

  // Ответ админа пользователю
  if (userId === ADMIN_ID) {
    if (msg.reply_to_message) {
      const repliedText = msg.reply_to_message.text || '';
      const match = repliedText.match(/📩 Сообщение от (@?\w+) \((\d+)\):/);
      if (match) {
        const targetUserId = parseInt(match[2]);
        bot.sendMessage(targetUserId, `👨‍💻 Ответ поддержки:\n\n${text}`)
          .then(() => bot.sendMessage(chatId, `✅ Ответ отправлен пользователю ${match[1]}`))
          .catch((err) => bot.sendMessage(chatId, `❌ Ошибка: ${err.message}`));
        return;
      }
    }
    return;
  }

  // Пересылка админу
  bot.sendMessage(ADMIN_ID, `📩 Сообщение от ${from} (${userId}):\n\n${text}`)
    .then(() => bot.sendMessage(chatId, '✅ Ваше сообщение отправлено. Мы ответим в ближайшее время.'))
    .catch((err) => console.error('Ошибка отправки админу:', err));
});
