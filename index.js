const express = require('express');
const fs = require('fs').promises;
const { makeWASocket, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const chalk = require('chalk');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Home Page with Form
app.get('/', (req, res) => {
  res.render('index', { status: 'Not Connected' });
});

// Handle Form Submission
app.post('/start', upload.fields([{ name: 'credsFile' }, { name: 'messageFile' }]), async (req, res) => {
  const { target, prefixName, intervalTime } = req.body;
  const credsContent = req.files['credsFile'] ? await fs.readFile(req.files['credsFile'][0].path, 'utf-8') : '';
  const messageContent = req.files['messageFile'] ? await fs.readFile(req.files['messageFile'][0].path, 'utf-8') : '';

  if (!credsContent || !messageContent) {
    return res.render('index', { status: 'Error: Please upload both creds and message files' });
  }

  const credsData = JSON.parse(credsContent);
  const messages = messageContent.split('\n').filter(line => line.trim() !== '');

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
      res.render('index', { status: 'Connected and Sending', target, prefixName, intervalTime });

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
    } else if (connection === "close") {
      res.render('index', { status: 'Connection Closed' });
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
