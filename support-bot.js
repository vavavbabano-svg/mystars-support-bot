const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Ошибка: BOT_TOKEN или ADMIN_ID не заданы');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Хранилище: какой пользователь ожидает ответа от админа
let waitingForReply = {};

bot.start((ctx) => {
    ctx.reply('👋 Добро пожаловать в службу поддержки!\n\nОпишите вашу проблему или отправьте скриншот — я передам администратору.');
});

bot.help((ctx) => {
    ctx.reply('📌 Просто напишите сообщение или отправьте фото — администратор получит и сможет ответить.');
});

// Обработка фото (скриншотов)
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || `id${userId}`;
    const caption = ctx.message.caption || 'Без текста';
    
    // Берём самое большое фото (последнее в массиве)
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    try {
        await bot.telegram.sendPhoto(
            ADMIN_ID,
            fileId,
            {
                caption: `📸 Скриншот\n👤 @${username}\n🆔 ${userId}\n💬 ${caption}`,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✏️ Ответить', callback_data: `reply_${userId}` }],
                        [{ text: '🚫 Игнорировать', callback_data: `ignore_${userId}` }]
                    ]
                }
            }
        );
        await ctx.reply('✅ Скриншот отправлен администратору.');
    } catch (err) {
        console.error('Ошибка отправки фото:', err.message);
        await ctx.reply('❌ Ошибка отправки скриншота.');
    }
});

// Обработка документов (файлов)
bot.on('document', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || `id${userId}`;
    const caption = ctx.message.caption || 'Без текста';
    const fileId = ctx.message.document.file_id;

    try {
        await bot.telegram.sendDocument(
            ADMIN_ID,
            fileId,
            {
                caption: `📎 Файл\n👤 @${username}\n🆔 ${userId}\n💬 ${caption}`,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✏️ Ответить', callback_data: `reply_${userId}` }],
                        [{ text: '🚫 Игнорировать', callback_data: `ignore_${userId}` }]
                    ]
                }
            }
        );
        await ctx.reply('✅ Файл отправлен администратору.');
    } catch (err) {
        console.error('Ошибка отправки файла:', err.message);
        await ctx.reply('❌ Ошибка отправки файла.');
    }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    // Если сообщение от администратора
    if (userId === ADMIN_ID) {
        if (waitingForReply[userId]) {
            const targetUserId = waitingForReply[userId];
            delete waitingForReply[userId];

            try {
                await bot.telegram.sendMessage(
                    targetUserId,
                    `📬 *Ответ от поддержки:*\n\n${messageText}`,
                    { parse_mode: 'Markdown' }
                );
                await ctx.reply(`✅ Ответ отправлен пользователю ${targetUserId}.`);
            } catch (err) {
                await ctx.reply(`❌ Ошибка отправки: ${err.message}`);
                waitingForReply[userId] = targetUserId;
            }
            return;
        }
        return;
    }

    // Если сообщение от обычного пользователя
    const username = ctx.from.username || `id${userId}`;
    
    try {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆕 Новое обращение\n👤 @${username}\n🆔 ${userId}\n\n💬 ${messageText}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✏️ Ответить', callback_data: `reply_${userId}` }],
                        [{ text: '🚫 Игнорировать', callback_data: `ignore_${userId}` }]
                    ]
                }
            }
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

    const targetUserId = parseInt(ctx.match[1]);
    waitingForReply[ADMIN_ID] = targetUserId;
    
    await ctx.editMessageText(`✏️ Введите ответ для пользователя ${targetUserId}:\n\nПросто напишите сообщение в этот чат.`);
    await ctx.answerCbQuery();
});

// Админ нажимает «Игнорировать»
bot.action(/ignore_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery('Нет доступа');
        return;
    }

    const targetUserId = parseInt(ctx.match[1]);
    
    try {
        await bot.telegram.sendMessage(
            targetUserId,
            '⏳ Ваше обращение находится в обработке. Пожалуйста, ожидайте.'
        );
    } catch (err) {
        console.error('Ошибка отправки уведомления:', err.message);
    }
    
    await ctx.editMessageCaption(`🚫 Обращение от пользователя ${targetUserId} помечено как обработанное.`);
    await ctx.answerCbQuery('Уведомление отправлено пользователю');
});

const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(port, () => console.log(`HTTP server on port ${port}`));

bot.launch().then(() => console.log('🚀 Бот успешно запущен')).catch(err => {
    console.error('❌ Ошибка запуска:', err);
    process.exit(1);
});
