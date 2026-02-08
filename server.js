import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.resolve("config.json");

const {
  SHOP_ID,
  SECRET_KEY,
  ADMIN_SECRET,
  BOT_TOKEN,
  CHAT_ID
} = process.env;

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

/* Статика (admin.html, success.html и т.п.) */
app.use(express.static(process.cwd()));

/* =========================
   HELPERS
========================= */
function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* =========================
   API
========================= */

// Проверка
app.get("/", (req, res) => {
  res.send("Backend работает");
});

/* ===== CONFIG ===== */

// Получить конфиг (фронт + админка)
app.get("/config", (req, res) => {
  res.json(readConfig());
});

// Сохранить конфиг (админка)
app.post("/admin/save", (req, res) => {
  const { secret, config } = req.body;

  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Неверный секрет" });
  }

  saveConfig(config);
  res.json({ success: true });
});

/* ===== ПЛАТЁЖ ===== */

app.post("/create-payment", async (req, res) => {
  try {
    const { name, telegram } = req.body;

    if (!name || !telegram) {
      return res.status(400).json({ error: "Не все поля заполнены" });
    }

    const config = readConfig();

    const paymentData = {
      amount: {
        value: Number(config.price || 1).toFixed(2),
        currency: config.currency || "RUB"
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
    console.error("Ошибка создания платежа:", err);
    res.status(500).json({ error: "Ошибка создания платежа" });
  }
});

/* ===== WEBHOOK ===== */

app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "payment.succeeded") {
      const payment = event.object;
      const { name, telegram } = payment.metadata;

      const message = `
💰 ОПЛАЧЕНО

👤 Имя: ${name}
📲 Telegram: ${telegram}
💵 Сумма: ${payment.amount.value} ₽
🆔 Payment ID: ${payment.id}
`;

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
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

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server started: http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin.html`);
});
