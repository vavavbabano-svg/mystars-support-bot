import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "1444520038"))


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start"""
    args = context.args  # Получаем аргументы после /start
    user = update.effective_user
    
    if args and args[0] == "help":
        await update.message.reply_text(
            f"👋 Привет, {user.first_name}!\n\n"
            f"Чем я могу помочь? Опишите проблему, и я свяжусь с вами."
        )
    else:
        await update.message.reply_text(
            f"👋 Добро пожаловать в MyStars Support!\n\n"
            f"Я бот поддержки. Используйте /help для связи."
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help"""
    await update.message.reply_text(
        "🆘 Нужна помощь?\n\n"
        "Опишите вашу проблему, и администратор свяжется с вами в ближайшее время."
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка обычных сообщений"""
    user = update.effective_user
    message = update.message.text
    
    # Пересылаем сообщение админу
    try:
        await context.bot.send_message(
            chat_id=ADMIN_ID,
            text=f"📩 Сообщение от @{user.username or user.id}:\n\n{message}"
        )
        await update.message.reply_text("✅ Ваше сообщение отправлено. Мы ответим в ближайшее время.")
    except Exception as e:
        logger.error(f"Ошибка отправки админу: {e}")
        await update.message.reply_text("❌ Произошла ошибка. Попробуйте позже.")


def main():
    """Запуск бота"""
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN не задан!")
        return
    
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    logger.info("✅ Бот запущен")
    app.run_polling()


if __name__ == "__main__":
    main()
