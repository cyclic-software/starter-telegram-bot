import { Bot, webhookCallback } from "grammy";
import express from "express";

// Create a bot using the Telegram token
const bot = new Bot(process.env.TELEGRAM_TOKEN || "");

// Handle the /start and /yo commands
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));
bot.command("yo", (ctx) => ctx.reply(`Yo ${ctx.from?.username}`));

// Handle all other messages
bot.on("message", (ctx) => ctx.reply("Got another message!"));

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
