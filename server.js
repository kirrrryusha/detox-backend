import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

/* 🔥 CORS — ВАЖНО */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

const { SHOP_ID, SECRET_KEY } = process.env;

/* Проверка */
app.get("/", (req, res) => {
  res.send("Backend работает");
});

/* Создание платежа */
app.post("/create-payment", async (req, res) => {
  try {
const { name, telegram } = req.body;

if (!name || !telegram) {
  return res.status(400).json({ error: "Не все поля заполнены" });
}


    const paymentData = {
  amount: {
    value: "1.00",
    currency: "RUB"
  },

  confirmation: {
    type: "redirect",
    return_url: "https://dks.gitverse.site/detox-backend/success.html"
  },

  capture: true,
  description: "Интенсив «Детоксикация»",
  metadata: { name, telegram }
};


    const idempotenceKey = crypto.randomUUID();

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        "Authorization":
          "Basic " +
          Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64")
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();
    console.log("Ответ ЮKassa:", data);

    if (!data.confirmation) {
      return res.status(500).json(data);
    }

    res.json({
      confirmation_url: data.confirmation.confirmation_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка создания платежа" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server started on port", PORT);
});
/* 🔔 WEBHOOK ОТ ЮKassa */
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "payment.succeeded") {
      const payment = event.object;
      const { name, telegram, phone } = payment.metadata;

      const message = `
💰 ОПЛАЧЕНО

👤 Имя: ${name}
📲 Telegram: ${telegram}
💵 Сумма: ${payment.amount.value} ₽
🆔 Payment ID: ${payment.id}
`;

      await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.CHAT_ID,
            text: message
          })
        }
      );

      console.log("✅ Оплата подтверждена, сообщение отправлено");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Ошибка webhook:", err);
    res.sendStatus(500);
  }
});

