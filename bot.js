import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import fs from "fs"
import path from "path"

const main = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("./auth")
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on("creds.update", saveCreds)

    const config = fs.readFileSync("./uploads/config.txt", "utf-8").split("\n")
    const jid = config[0]
    const delay = parseInt(config[1])
    const prefix = config[2] || ""
    const senderName = config[3] || ""
    const messages = fs.readFileSync("./uploads/messages.txt", "utf-8").split("\n").filter(Boolean)

    let i = 0
    setInterval(async () => {
        const text = `${prefix} ${messages[i % messages.length]}`
        try {
            await sock.sendMessage(jid, { text })
            console.log("✅ Sent:", text)
            i++
        } catch (e) {
            console.log("❌ Error:", e.message)
        }
    }, delay * 1000)
}
main()
