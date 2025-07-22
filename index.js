const { makeWASocket, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const pino = require('pino');
const chalk = require('chalk');
const axios = require('axios');

(async () => {
  try {
    // Load creds.json
    const credsData = JSON.parse(await fs.readFile('creds.json', 'utf-8'));
    const authState = {
      creds: credsData,
      keys: makeCacheableSignalKeyStore({}, pino({ level: "fatal" })),
    };

    const MznKing = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: authState,
      markOnlineOnConnect: true,
    });

    MznKing.ev.on("connection.update", async (s) => {
      const { connection } = s;
      if (connection === "open") {
        console.log(chalk.yellow("Your WhatsApp Login Successfully"));

        // Fetch messages from URL (replace with your URL)
        const messageUrl = process.env.MESSAGE_URL || 'https://example.com/messages.txt'; // Set this in Render env
        let messages = [];
        try {
          const response = await axios.get(messageUrl);
          messages = response.data.split('\n').filter(line => line.trim() !== '');
        } catch (error) {
          console.error(chalk.red(`Error fetching messages from URL: ${error}`));
          process.exit(1);
        }

        if (messages.length === 0) {
          console.log(chalk.bgBlack(chalk.redBright("No messages found in the URL.")));
          process.exit(0);
        }

        const target = process.env.TARGET_NUMBER || '91XXXXXXXXXX'; // Set in Render env
        const prefixName = process.env.PREFIX_NAME || 'Test'; // Set in Render env
        const intervalTime = parseInt(process.env.INTERVAL_TIME) || 10; // Set in Render env

        const sendMessageInfinite = async () => {
          const rawMessage = messages[Math.floor(Math.random() * messages.length)];
          const simpleMessage = `${prefixName} ${rawMessage}`;
          try {
            if (/^\d+$/.test(target)) {
              await MznKing.sendMessage(`${target}@s.whatsapp.net`, { text: simpleMessage });
            } else {
              await MznKing.sendMessage(target, { text: simpleMessage });
            }
            console.log(chalk.green(`Message sent to ${target}: ${simpleMessage}`));
          } catch (error) {
            console.error(chalk.red(`Error sending message: ${error}`));
          }
          setTimeout(sendMessageInfinite, intervalTime * 1000);
        };

        sendMessageInfinite();
      }
    });

  } catch (error) {
    console.error("Error:", error);
  }
})();
