const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Ошибка: BOT_TOKEN или ADMIN_ID не заданы');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

let currentReplyToUserId = null; // кто ожидает ответа от админа

bot.start((ctx) => {
    ctx.reply('👋 Добро пожаловать в службу поддержки!\n\nОпишите вашу проблему — я передам её администратору.');
});

bot.help((ctx) => {
    ctx.reply('📌 Просто напишите любое сообщение — администратор получит его и сможет ответить.');
});

// Пользователь пишет → пересылаем админу
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID) return;

    const username = ctx.from.username || `id${userId}`;
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback(`✏️ Ответить ${userId}`, `reply_${userId}`)
    ]);

    try {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆕 Новое обращение\n👤 @${username}\n🆔 ${userId}\n\n💬 ${ctx.message.text}`,
            keyboard
        );
        await ctx.reply('✅ Сообщение отправлено администратору.');
    } catch (err) {
        console.error('Ошибка:', err.message);
        await ctx.reply('❌ Ошибка отправки.');
    }
});

// Админ нажимает «Ответить»
bot.action(/reply_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery('Нет доступа');
        return;
    }

    currentReplyToUserId = parseInt(ctx.match[1]);
    await ctx.editMessageText(`✏️ Введите ваш ответ для пользователя ${currentReplyToUserId}:`);
    await ctx.answerCbQuery();
});

// Админ пишет ответ → отправляем пользователю
bot.on('text', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (!currentReplyToUserId) return;

    const targetUserId = currentReplyToUserId;
    const replyText = ctx.message.text;
    currentReplyToUserId = null;

    try {
        await bot.telegram.sendMessage(
            targetUserId,
            `📬 *Ответ от поддержки:*\n\n${replyText}`,
            { parse_mode: 'Markdown' }
        );
        await ctx.reply(`✅ Ответ отправлен пользователю ${targetUserId}.`);
    } catch (err) {
        await ctx.reply(`❌ Ошибка: ${err.message}`);
        currentReplyToUserId = targetUserId; // можно попробовать снова
    }
});

bot.launch().then(() => console.log('🚀 Бот успешно запущен')).catch(err => {
    console.error('❌ Ошибка запуска:', err);
    process.exit(1);
});
