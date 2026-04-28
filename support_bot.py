import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

BOT_TOKEN = "8714370698:AAEtod0QulFufvb1DE_h_TwRsPsVV_dfnt4"
ADMIN_ID = 1444520038  # твой ID

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

class AdminReply(StatesGroup):
    waiting_for_reply = State()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer("👋 Добро пожаловать в службу поддержки!\nОпишите вашу проблему — я передам её администратору. Обычно ответ приходит в течение 24 часов.")

@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer("📌 Как связаться с поддержкой:\nПросто напишите мне любое сообщение — я передам его администратору.\n\nПосле ответа администратора вы получите уведомление.")

@dp.message(lambda msg: msg.from_user.id != ADMIN_ID)
async def forward_to_admin(message: types.Message):
    user = message.from_user
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Ответить", callback_data=f"reply_{user.id}")]
    ])
    await bot.send_message(
        ADMIN_ID,
        f"🆕 Новое обращение от @{user.username or user.id}\n\n{message.text}",
        reply_markup=keyboard
    )
    await message.answer("✅ Ваше сообщение отправлено администратору. Ожидайте ответа.")

@dp.callback_query(F.data.startswith("reply_"))
async def ask_reply(callback: types.CallbackQuery, state: FSMContext):
    user_id = int(callback.data.split("_")[1])
    await state.update_data(user_id=user_id)
    await state.set_state(AdminReply.waiting_for_reply)
    await callback.message.answer(f"✍️ Введите ответ для пользователя {user_id}:")
    await callback.answer()

@dp.message(AdminReply.waiting_for_reply)
async def send_reply(message: types.Message, state: FSMContext):
    data = await state.get_data()
    user_id = data.get("user_id")
    await bot.send_message(user_id, f"📬 Ответ от поддержки:\n\n{message.text}")
    await message.answer(f"✅ Ответ отправлен пользователю {user_id}.")
    await state.clear()

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
