const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Ошибка: BOT_TOKEN или ADMIN_ID не заданы в переменных окружения');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Хранилище: какой пользователь ждёт ответа от админа
const waitingForReply = new Map();

// Приветствие
bot.start((ctx) => {
    ctx.reply(
        '👋 Добро пожаловать в службу поддержки!\n\n' +
        'Опишите вашу проблему — я передам её администратору.\n' +
        'Обычно ответ приходит в течение 24 часов.'
    );
});

bot.help((ctx) => {
    ctx.reply(
        '📌 Просто напишите мне любое сообщение — я передам его администратору.\n\n' +
        'После ответа администратора вы получите уведомление.'
    );
});

// Пересылка сообщения от пользователя админу
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID) return; // админа не пересылаем

    const username = ctx.from.username || `id${userId}`;
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('✏️ Ответить', `reply_${userId}`)
    ]);

    try {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆕 *Новое обращение*\n👤 Пользователь: @${username}\n🆔 ID: \`${userId}\`\n\n💬 *Текст:*\n${ctx.message.text}`,
            { parse_mode: 'Markdown', ...keyboard }
        );
        await ctx.reply('✅ Ваше сообщение отправлено администратору. Ожидайте ответа.');
    } catch (err) {
        console.error('Ошибка отправки админу:', err.message);
        await ctx.reply('❌ Не удалось отправить сообщение. Попробуйте позже.');
    }
});

// Админ нажимает "Ответить"
bot.action(/reply_(.+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery('⛔ Доступно только администратору.');
        return;
    }

    waitingForReply.set(ADMIN_ID, userId);
    await ctx.editMessageText(`✏️ Введите ваш ответ для пользователя ${userId}:`);
    await ctx.answerCbQuery();
});

// Админ пишет ответ
bot.on('text', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const targetUserId = waitingForReply.get(ADMIN_ID);
    if (!targetUserId) return; // админ не в режиме ответа

    const replyText = ctx.message.text;
    waitingForReply.delete(ADMIN_ID);

    try {
        await bot.telegram.sendMessage(
            targetUserId,
            `📬 *Ответ от поддержки:*\n\n${replyText}\n\nЕсли остались вопросы — напишите новое сообщение.`,
            { parse_mode: 'Markdown' }
        );
        await ctx.reply(`✅ Ответ отправлен пользователю ${targetUserId}.`);
    } catch (err) {
        console.error('Ошибка отправки пользователю:', err.message);
        await ctx.reply(`❌ Не удалось отправить ответ пользователю ${targetUserId}.`);
    }
});

// Запуск
bot.launch().then(() => {
    console.log('🚀 Бот успешно запущен');
}).catch(err => {
    console.error('❌ Ошибка запуска:', err);
    process.exit(1);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
