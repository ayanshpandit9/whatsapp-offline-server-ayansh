import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

const main = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    getMessage: async () => ({}),
    printQRInTerminal: false,
  })

  sock.ev.on('connection.update', (update) => {
    const { pairingCode, qr, connection } = update
    if (pairingCode) {
      console.log("\nðŸ”— Pair this device: https://wa.me/activate?pairing-code=" + pairingCode)
    }
    if (connection === 'open') {
      console.log("âœ… Connected to WhatsApp successfully.")
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

main()
