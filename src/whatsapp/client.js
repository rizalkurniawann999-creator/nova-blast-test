
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const path = require("path");
const fs = require("fs");

const authDir = path.join(process.cwd(), "data", "whatsapp-auth");

let sock = null;
let qrCode = null;
let connectionStatus = "disconnected";
let connecting = false;

async function connectWhatsApp() {
  if (connecting || sock) {
    return { status: connectionStatus, qr: qrCode };
  }

  connecting = true;

  try {
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(authDir);

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["NOVA BLAST", "Chrome", "1.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        connectionStatus = "qr";
      }

      if (connection === "open") {
        qrCode = null;
        connectionStatus = "connected";
        connecting = false;
        console.log("WhatsApp berhasil terhubung.");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        sock = null;
        qrCode = null;
        connecting = false;

        if (statusCode === DisconnectReason.loggedOut) {
          connectionStatus = "logged_out";
        } else {
          connectionStatus = "disconnected";
        }

        console.log("Koneksi WhatsApp:", connectionStatus);
      }
    });

    return { status: connectionStatus, qr: qrCode };
  } catch (error) {
    sock = null;
    connecting = false;
    connectionStatus = "error";
    console.error("Gagal memulai WhatsApp:", error.message);
    throw error;
  }
}

function getWhatsAppStatus() {
  return {
    status: connectionStatus,
    qr: qrCode,
  };
}

module.exports = {
  connectWhatsApp,
  getWhatsAppStatus,
};
