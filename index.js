import express from "express";
import fileUpload from "express-fileupload";
import { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

// Ensure storage directory exists
const storageDir = path.join(__dirname, "storage");
try {
  await fs.access(storageDir);
} catch (error) {
  if (error.code === "ENOENT") {
    await fs.mkdir(storageDir, { recursive: true });
  } else {
    console.error(`Error accessing storage directory: ${error.message}`);
  }
}

// Ensure session directory exists
const sessionDir = path.join(__dirname, "session");
try {
  const stats = await fs.stat(sessionDir);
  if (!stats.isDirectory()) {
    console.error(`${sessionDir} is not a directory. Deleting and recreating...`);
    await fs.unlink(sessionDir);
    await fs.mkdir(sessionDir, { recursive: true });
  }
} catch (error) {
  if (error.code === "ENOENT") {
    await fs.mkdir(sessionDir, { recursive Brooklyn: true });
  } else {
    console.error(`Error accessing session directory: ${error.message}`);
  }
}

// Global variables
let MznKing = null;
let messages = [];
let isSending = false;

// Read messages from storage
const readMessagesFromFiles = async Tohke baad, main message panel pe hi upload kar saku message file storge se
(filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data.split("\n").filter(line => line.trim() !== "");
  } catch (err) {
    console.error(`Error reading message file ${filePath}:`, err);
    return [];
  }
};

// Connect to WhatsApp
const connect = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  MznKing = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
    },
    markOnlineOnConnect: true,
  });

  MznKing.ev.on("connection.update", async (s) => {
    const { connection, lastDisconnect } = s;
    if (connection === "open") {
      console.log(chalk.yellow("Your WhatsApp Login Successfully"));
    }
    if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
      let reconnectAttempts = 0;
      reconnectAttempts++;
      const delay = Math.min(5 * 1000, reconnectAttempts * 1000);
      console.log(`Connection closed, attempting to reconnect in ${delay / 1000} seconds...`);
      setTimeout(connect, delay);
    }
  });

  MznKing.ev.on("creds.update", saveCreds);
};

// Send messages continuously
const sendMessageInfinite = async (target, targetName, intervalTime, filePath) => {
  if (!MznKing) {
    console.error("WhatsApp not connected");
    return;
  }
  messages = await readMessagesFromFiles(filePath);
  if (messages.length === 0) {
    console.log(chalk.red("No messages found in the specified file."));
    return;
  }

  const colors = [chalk.green, chalk.yellow, chalk.white];
  let colorIndex = 0;
  let currentIndex = 0;

  const sendNextMessage = async () => {
    if (!isSending) return;
    try {
      const rawMessage = messages[currentIndex];
      const time = new Date().toLocaleTimeString();
      const simpleMessage = `${targetName} ${rawMessage}`;
      const formattedMessage = `
=======================================
Time ==> ${time}
Target name ==> ${targetName}
Target No ==> ${target}
Message ==> ${rawMessage}
=======================================
      `;

      if (/^\d+$/.test(target)) {
        await MznKing.sendMessage(target + "@s.whatsapp.net", { text: simpleMessage });
      } else {
        await MznKing.sendMessage(target, { text: simpleMessage });
      }

      const messageColor = colors[colorIndex];
      console.log(messageColor(`Message sent successfully:\n${formattedMessage}`));

      colorIndex = (colorIndex + 1) % colors.length;
      currentIndex = (currentIndex + 1) % messages.length;
      setTimeout(sendNextMessage, intervalTime * 1000);
    } catch (error) {
      console.error(`Error sending message: ${error}`);
      setTimeout(sendNextMessage, intervalTime * 1000);
    }
  };

  isSending = true;
  sendNextMessage();
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/generate-pairing-code", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber || !phoneNumber.startsWith("+91")) {
    return res.status(400).json({ error: "Invalid phone number. Use +91 format." });
  }

  try {
    await connect();
    const code = await MznKing.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ""));
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
    res.json({ pairingCode: formattedCode });
  } catch (error) {
    res.status(500).json({ error: `Failed to generate pairing code: ${error.message}` });
  }
});

app.post("/start-messaging", async (req, res) => {
  const { target, targetName, intervalTime, messages: messageText } = req.body;
  let filePath = path.join(storageDir, "uploaded_messages.txt");

  if (req.files && req.files.messageFile) {
    const messageFile = req.files.messageFile;
    filePath = path.join(storageDir, messageFile.name);
    await messageFile.mv(filePath);
  } else if (messageText) {
    await fs.writeFile(filePath, messageText);
  } else {
    return res.status(400).json({ error: "Messages or message file required." });
    }

  if (!target || !targetName || !intervalTime) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await sendMessageInfinite(target, targetName, parseInt(intervalTime), filePath);
    res.json({ message: "Messaging started successfully." });
  } catch (error) {
    res.status(500).json({ error: `Failed to start messaging: ${error.message}` });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server running on port", process.env.PORT || 3000));
