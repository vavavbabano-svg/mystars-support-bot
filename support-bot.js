const { Telegraf, Markup } = require('telegraf');

// ===== КОНФИГУРАЦИЯ =====
const BOT_TOKEN = '8714370698:AAEtod0QulFufvb1DE_h_TwRsPsVV_dfnt4';
const ADMIN_ID = 1444520038; // ТВОЙ ID

const bot = new Telegraf(BOT_TOKEN);

// Хранилище: user_id -> ожидает ответа от админа
const waitingForReply = new Map();

// ===== КОМАНДЫ =====
bot.start((ctx) => {
    ctx.reply(
        '👋 Добро пожалую в службу поддержки!\n\n' +
        'Опишите вашу проблему — я передам её администратору.\n' +
        'Обычно ответ приходит в течение 24 часов.'
    );
});

bot.help((ctx) => {
    ctx.reply(
        '📌 Как связаться с поддержкой:\n' +
        'Просто напишите мне любое сообщение — я передам его администратору.\n\n' +
        'После ответа администратора вы получите уведомление.'
    );
});

// ===== ПЕРЕСЫЛКА ЛЮБОГО СООБЩЕНИЯ АДМИНУ =====
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID) return; // не пересылаем сообщение самого админа

    const username = ctx.from.username || `id${userId}`;
    const userLink = username ? `@${username}` : `[Пользователь](tg://user?id=${userId})`;

    // Кнопка для ответа админа
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('✏️ Ответить', `reply_${userId}`)
    ]);

    try {
        await ctx.telegram.sendMessage(
            ADMIN_ID,
            `🆕 *Новое обращение*\n` +
            `👤 Пользователь: ${userLink}\n🆔 ID: \`${userId}\`\n\n` +
            `💬 *Текст:*\n${ctx.message.text}`,
            { parse_mode: 'Markdown', ...keyboard }
        );
        await ctx.reply('✅ Ваше сообщение отправлено администратору. Ожидайте ответа.');
    } catch (err) {
        console.error('Ошибка отправки админу:', err);
        await ctx.reply('❌ Не удалось отправить сообщение. Попробуйте позже.');
    }
});

// ===== ОБРАБОТКА КНОПКИ "ОТВЕТИТЬ" =====
bot.action(/reply_(.+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery('⛔ Доступно только администратору.');
        return;
    }

    waitingForReply.set(ADMIN_ID, userId);
    await ctx.editMessageText('✏️ Введите ваш ответ (одним сообщением):');
    await ctx.answerCbQuery();
});

// ===== ПРИЁМ ОТВЕТА ОТ АДМИНА =====
bot.on('text', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const targetUserId = waitingForReply.get(ADMIN_ID);
    if (!targetUserId) return; // админ не в режиме ответа

    const replyText = ctx.message.text;
    waitingForReply.delete(ADMIN_ID);

    try {
        await ctx.telegram.sendMessage(
            targetUserId,
            `📬 *Ответ от поддержки:*\n\n${replyText}\n\n` +
            `Если остались вопросы — напишите новое сообщение.`,
            { parse_mode: 'Markdown' }
        );
        await ctx.reply(`✅ Ответ отправлен пользователю ${targetUserId}.`);
    } catch (err) {
        console.error('Ошибка отправки пользователю:', err);
        await ctx.reply(`❌ Не удалось отправить ответ пользователю ${targetUserId}.`);
    }
});

// ===== ЗАПУСК =====
bot.launch().then(() => console.log('🚀 Бот запущен')).catch(err => console.error('Ошибка запуска:', err));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
