import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import qrcode from "qrcode-terminal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authDir = path.join(__dirname, "auth");
try {
  await fs.mkdir(authDir, { recursive: true });
  console.log("Created auth directory:", authDir);
} catch (error) {
  console.error("Error creating auth directory:", error.message);
}

let MznKing = null;

const connect = async () => {
  try {
    console.log("Attempting to connect with auth from:", authDir);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    MznKing = makeWASocket({
      logger: pino({ level: "silent" }),
      auth: state,
      printQRInTerminal: true,
      connectTimeoutMs: 60000, // 60 seconds timeout
      keepAliveIntervalMs: 30000, // Keep connection alive
    });

    MznKing.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log("Scan this QR code with your WhatsApp:");
        qrcode.generate(qr, { small: true });
      }
      if (connection === "open") {
        console.log(chalk.yellow("Your WhatsApp Login Successfully"));
      }
      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log(`Connection closed (Reason: ${reason})`);
        if (reason !== DisconnectReason.loggedOut) {
          connect(); // Auto-reconnect
        }
      }
    });

    MznKing.ev.on("creds.update", saveCreds);
  } catch (error) {
    console.error("Connection error:", error.message);
  }
};

app.post("/generate-pairing-code", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "Invalid phone number. Use +91 followed by 10 digits." });
  }

  try {
    console.log("Generating pairing code for:", phoneNumber);
    await connect();
    if (!MznKing) throw new Error("Connection not established");
    const code = await MznKing.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ""));
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
    if (!formattedCode) throw new Error("No pairing code received");
    console.log("Generated pairing code:", formattedCode);
    res.json({ pairingCode: formattedCode });
  } catch (error) {
    console.error("Pairing code generation error:", error.message);
    res.status(500).json({ error: `Failed to generate pairing code: ${error.message}` });
  }
});

app.get("/start-qr", (req, res) => {
  connect();
  res.send("Starting connection. Check terminal for QR code.");
});

app.listen(process.env.PORT || 3000, () => console.log("Server running on port", process.env.PORT || 3000));
