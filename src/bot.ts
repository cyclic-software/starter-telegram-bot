mport { Bot, Router, Markup, InlineKeyboard, webhookCallback } from "grammy";
import { chunk } from "lodash";
import express from "express";


// Create a bot using the Telegram token
const bot = new Bot(process.env.TELEGRAM_TOKEN || "");

const waitingList = [];
const chatSessions = {};
let blockerEnabled = false;

bot.command('start', async (ctx) => {
    const description = `Welcome to the Encrypted Pair Chat Bot!\n\nThis chat bot pairs you with a random stranger for an encrypted chat session.\n\nRules:\n- Speak in English.\n- Be respectful and polite.\n- Do not share personal information.\n- Do not engage in illegal or harmful activities.\n\nCommands:\nTo start chatting, type /find.\nTo find the next stranger, type /next.\nTo End the chat, type /end.\n\nEnjoy your chat!`;

    await ctx.reply(description);
});

bot.command('find', async (ctx) => {
    const userId = ctx.from.id;
    const activeUsers = Object.keys(chatSessions).length + waitingList.length;
    const chatSession = Object.keys(chatSessions).length / 2;
    const waitingLists = waitingList.length;

    await ctx.reply(`Searching for a stranger... Active users: ${activeUsers}\nChat connect pairs: ${chatSession}\nWaiting Lists: ${waitingLists}`);

    if (chatSessions[userId]) {
        await ctx.reply("You are already in a chat. Use /end to leave the chat.");
    } else if (waitingList.includes(userId)) {
        await ctx.reply("You are already in the waiting list. Please wait for a partner to be assigned.");
    } else {
        waitingList.push(userId);
        tryMatchPartners();
    }
});

// Define other command handlers (/end, /next, /blockon, /unblock) similarly...

bot.on('message', async (ctx) => {
    const { text } = ctx.message;
    const userId = ctx.from.id;

    if (chatSessions[userId]) {
        const partnerId = chatSessions[userId];
        if (partnerId) {
            if (blockerEnabled && containsBlockedWord(text)) {
                await ctx.reply("Your partner enabled the blocker. Please refrain from using toxic or inappropriate language and respect your partner.");
                return;
            }
            await bot.api.sendMessage(partnerId, text);
        } else {
            await ctx.reply("You don't have an ongoing chat. Use /find to search for a partner to chat with.");
        }
    } else {
        await ctx.reply("You don't have an ongoing chat. Use /find to search for a partner to chat with.");
    }
});

// Define other message handlers (image, sticker, voice, video) similarly...

function tryMatchPartners() {
    while (waitingList.length >= 2) {
        const userId1 = waitingList.shift();
        const userId2 = waitingList.shift();

        chatSessions[userId1] = userId2;
        chatSessions[userId2] = userId1;

        bot.api.sendMessage(userId1, "Partner found! Remember to speak in English with your partner.");
        bot.api.sendMessage(userId2, "Partner found! Remember to speak in English with your partner.");
    }
}

// Define containsBlockedWord function...

bot.use((ctx) => {
    const userId = ctx.from.id;
    if (Object.values(chatSessions).includes(userId)) {
        return ctx.reply("How do you feel about this message?", {
            reply_markup: Markup.keyboard([
                ['👍 Like', '👎 Dislike'],
                ['😄 Happy', '😔 Sad']
            ]).oneTime()
        });
    }
});

bot.on('message', async (ctx) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 5000)); // introduce a delay
        const retMsg = await ctx.reply("response message");
        console.log(retMsg);
        // assert retMsg.content_type == 'text';
    } catch (error) {
        if (error instanceof Error && error.message.includes("bot was blocked by the user")) {
            const userId = ctx.from.id;
            await ctx.reply("Sorry, you have blocked my bot. Please press or type /next");
        } else {
            throw error;
        }
    }
});

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
