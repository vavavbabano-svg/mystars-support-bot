const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не задан в переменных окружения');
    process.exit(1);
}

const ADMIN_ID = parseInt(process.env.ADMIN_ID);
if (!ADMIN_ID) {
    console.error('❌ ADMIN_ID не задан в переменных окружения');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('👋 Добро пожаловать в службу поддержки!');
});
bot.help((ctx) => {
    ctx.reply('📌 Просто напишите мне любое сообщение — я передам его администратору.');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID) return;

    const username = ctx.from.username || `id${userId}`;
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('✏️ Ответить', `reply_${userId}`)
    ]);

    try {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆕 Новое обращение от @${username}\n\n${ctx.message.text}`,
            keyboard
        );
        await ctx.reply('✅ Сообщение отправлено администратору.');
    } catch (err) {
        console.error('Ошибка при отправке админу:', err.message);
        await ctx.reply('❌ Не удалось отправить сообщение.');
    }
});

bot.action(/reply_(.+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery('Нет доступа');
        return;
    }
    await ctx.answerCbQuery();
    await ctx.reply(`Введите ответ для пользователя ${userId}:`);
    // Сохраняем userId в сессию (упрощённо — используем контекст)
    ctx.session = { replyTo: userId };
});

bot.on('text', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (!ctx.session?.replyTo) return;

    const targetUserId = ctx.session.replyTo;
    ctx.session.replyTo = null;

    try {
        await bot.telegram.sendMessage(targetUserId, `📬 Ответ поддержки:\n\n${ctx.message.text}`);
        await ctx.reply(`✅ Ответ отправлен пользователю ${targetUserId}.`);
    } catch (err) {
        await ctx.reply(`❌ Ошибка: ${err.message}`);
    }
});

bot.launch().then(() => {
    console.log('🚀 Бот успешно запущен и слушает сообщения');
}).catch(err => {
    console.error('❌ Критическая ошибка запуска:', err);
    process.exit(1);
});
