const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '1444520038');
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не задан!');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('✅ Бот запущен');

// Мини-сервер чтобы Render не ругался
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive');
}).listen(PORT, () => {
  console.log(`🌐 Сервер на порту ${PORT}`);
});

// Обработка /start
bot.onText(/\/start(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1] ? match[1].trim() : '';
  const firstName = msg.from.first_name;

  if (args === 'help') {
    bot.sendMessage(chatId, 
      `👋 Привет, ${firstName}!\n\n` +
      `Чем я могу помочь? Опишите проблему, и я свяжусь с вами.`
    );
  } else {
    bot.sendMessage(chatId, 
      `👋 Добро пожаловать в MyStars Support!\n\n` +
      `Я бот поддержки. Используйте /help для связи.`
    );
  }
});

// Обработка /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `🆘 Нужна помощь?\n\n` +
    `Опишите вашу проблему, и администратор свяжется с вами в ближайшее время.`
  );
});

// Обработка сообщений
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
          .catch((err) => bot.sendMessage(chatId, `❌ Не удалось отправить ответ: ${err.message}`));
        return;
      }
    }
    return;
  }

  // Пересылка админу
  bot.sendMessage(ADMIN_ID,
    `📩 Сообщение от ${from} (${userId}):\n\n${text}`
  ).then(() => {
    bot.sendMessage(chatId, '✅ Ваше сообщение отправлено. Мы ответим в ближайшее время.');
  }).catch((err) => {
    console.error('Ошибка отправки админу:', err);
    bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  });
});
