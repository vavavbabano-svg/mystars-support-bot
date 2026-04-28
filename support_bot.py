import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import os

# 🔐 Токен твоего бота (получи у @BotFather)
BOT_TOKEN = "8714370698:AAEtod0QulFufvb1DE_h_TwRsPsVV_dfnt4"
# 🧑‍💻 ID админа (твой Telegram ID)
ADMIN_ID = 1444520038  # твой ID из базы

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Хранилище временных сообщений от пользователей
temp_messages = {}

# Состояния для ответа админа
class AdminReply(StatesGroup):
    waiting_for_reply = State()

# ---------- Команда /start ----------
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "👋 Добро пожаловать в службу поддержки!\n\n"
        "Опишите вашу проблему — я передам её администратору.\n"
        "Обычно ответ приходит в течение 24 часов."
    )

# ---------- Команда /help ----------
@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "📌 *Как связаться с поддержкой:*\n"
        "Просто напишите мне любое сообщение — я передам его администратору.\n\n"
        "После ответа администратора вы получите уведомление.",
        parse_mode="Markdown"
    )

# ---------- Обработка любого текста от НЕ админа ----------
@dp.message(lambda msg: msg.from_user.id != ADMIN_ID)
async def forward_to_admin(message: types.Message):
    user = message.from_user
    user_name = user.username or f"{user.first_name} {user.last_name or ''}".strip() or "Без имени"
    user_link = f"@{user.username}" if user.username else f"[{user_name}](tg://user?id={user.id})"
    
    # Отправляем админу
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Ответить", callback_data=f"reply_{user.id}")]
    ])
    
    await bot.send_message(
        ADMIN_ID,
        f"🆕 *Новое обращение*\n"
        f"👤 Пользователь: {user_link}\n"
        f"🆔 ID: `{user.id}`\n\n"
        f"💬 *Текст:*\n{message.text}",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )
    
    # Подтверждение пользователю
    await message.answer("✅ Ваше сообщение отправлено администратору. Ожидайте ответа в ближайшее время.")

# ---------- Обработка нажатия кнопки "Ответить" админом ----------
@dp.callback_query(lambda c: c.data.startswith("reply_"))
async def ask_reply(callback: types.CallbackQuery, state: FSMContext):
    user_id = int(callback.data.split("_")[1])
    await state.update_data(user_id=user_id)
    await state.set_state(AdminReply.waiting_for_reply)
    
    await callback.message.answer(
        f"✍️ Введите ответ для пользователя (ID: {user_id}):"
    )
    await callback.answer()

# ---------- Получение ответа от админа ----------
@dp.message(AdminReply.waiting_for_reply)
async def send_reply(message: types.Message, state: FSMContext):
    data = await state.get_data()
    user_id = data.get("user_id")
    reply_text = message.text
    
    if not user_id:
        await message.answer("❌ Ошибка: не удалось определить пользователя.")
        await state.clear()
        return
    
    # Отправляем ответ пользователю
    try:
        await bot.send_message(
            user_id,
            f"📬 *Ответ от поддержки:*\n\n{reply_text}\n\n"
            "Если остались вопросы — напишите новое сообщение.",
            parse_mode="Markdown"
        )
        await message.answer(f"✅ Ответ отправлен пользователю {user_id}.")
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки: {e}")
    
    await state.clear()

# ---------- Админ может написать пользователю вручную (команда /reply 123456 текст) ----------
@dp.message(Command("reply"))
async def admin_direct_reply(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        await message.answer("⛔ Доступно только администратору.")
        return
    
    parts = message.text.split(maxsplit=2)
    if len(parts) < 3:
        await message.answer("❌ Использование: /reply USER_ID текст")
        return
    
    _, user_id_str, reply_text = parts
    user_id = int(user_id_str)
    
    try:
        await bot.send_message(
            user_id,
            f"📬 *Ответ от поддержки:*\n\n{reply_text}\n\n"
            "Если остались вопросы — напишите новое сообщение.",
            parse_mode="Markdown"
        )
        await message.answer(f"✅ Сообщение отправлено пользователю {user_id}.")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")

# ---------- Запуск ----------
async def main():
    print("🚀 Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
