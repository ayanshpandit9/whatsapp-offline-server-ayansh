import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import fs from "fs"
import path from "path"

const main = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("./web/auth")
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: false,
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", ({ connection, qr }) => {
        if (qr) console.log("🔑 Pair this code in WhatsApp Web:\n", qr)
        if (connection === "open") console.log("✅ WhatsApp Bot Connected")
        if (connection === "close") console.log("❌ Disconnected")
    })

    const uploadsPath = path.join("./web/uploads")
    const configPath = path.join(uploadsPath, "config.txt")
    const messagePath = path.join(uploadsPath, "messages.txt")

    if (fs.existsSync(configPath) && fs.existsSync(messagePath)) {
        const [jid, delay] = fs.readFileSync(configPath, "utf-8").trim().split("\n")
        const messages = fs.readFileSync(messagePath, "utf-8").split("\n").filter(Boolean)

        let i = 0
        setInterval(async () => {
            try {
                await sock.sendMessage(jid, { text: messages[i % messages.length] })
                console.log("✅ Sent:", messages[i % messages.length])
                i++
            } catch (e) {
                console.log("❌ Send failed:", e.message)
            }
        }, Number(delay) * 1000)
    }
}
main()
