const express = require('express');
const fs = require('fs').promises;
const { makeWASocket, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const multer = require('multer');
const chalk = require('chalk');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Load creds.json
const credsData = JSON.parse(fs.readFileSync('creds.json', 'utf-8'));
const authState = {
  creds: credsData,
  keys: makeCacheableSignalKeyStore({}, pino({ level: "fatal" })),
};

const MznKing = makeWASocket({
  logger: pino({ level: 'silent' }),
  auth: authState,
  markOnlineOnConnect: true,
});

// Home Page
app.get('/', (req, res) => {
  res.render('index', { status: 'Not Connected' });
});

// Handle Form Submission
app.post('/configure', upload.fields([{ name: 'credsFile' }, { name: 'messageFile' }]), async (req, res) => {
  const { target, prefixName, speed } = req.body;
  let credsJson = req.files['credsFile'] ? JSON.parse(await fs.readFile(req.files['credsFile'][0].path)) : credsData;
  const messageContent = req.files['messageFile'] ? await fs.readFile(req.files['messageFile'][0].path, 'utf-8') : await fs.readFile('messages.txt', 'utf-8');
  const messages = messageContent.split('\n').filter(line => line.trim() !== '');

  if (MznKing.authState.creds.registered) {
    const sendMessageInfinite = async () => {
      const rawMessage = messages[Math.floor(Math.random() * messages.length)];
      const simpleMessage = `${prefixName} ${rawMessage}`;
      try {
        if (/^\d+$/.test(target)) {
          await MznKing.sendMessage(`${target}@s.whatsapp.net`, { text: simpleMessage });
        } else {
          await MznKing.sendMessage(target, { text: simpleMessage });
        }
        console.log(chalk.green(`Message sent to ${target}`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
      }
      setTimeout(sendMessageInfinite, speed * 1000);
    };
    sendMessageInfinite();
    res.render('index', { status: 'Connected and Sending', target, prefixName, speed });
  } else {
    res.render('index', { status: 'Connection Failed', target, prefixName, speed });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
