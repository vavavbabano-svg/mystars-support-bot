const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '1444520038');

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не задан!');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('✅ Бот запущен');

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

// Обработка обычных сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Игнорируем команды
  if (!text || text.startsWith('/')) return;

  const from = msg.from.username ? `@${msg.from.username}` : msg.from.id;

  // Пересылаем админу
  bot.sendMessage(ADMIN_ID,
    `📩 Сообщение от ${from}:\n\n${text}`
  ).then(() => {
    bot.sendMessage(chatId, '✅ Ваше сообщение отправлено. Мы ответим в ближайшее время.');
  }).catch((err) => {
    console.error('Ошибка отправки админу:', err);
    bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  });
});
