const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
    },
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
});

let qrCodeData = '';
let isLoggedIn = false;

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCodeData = qr;
});

client.on('ready', () => {
    console.log('Client is ready!');
    isLoggedIn = true;
});

client.on('authenticated', () => {
    console.log('Client is authenticated!');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure', msg);
    isLoggedIn = false;
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    isLoggedIn = false;
    qrCodeData = '';
});

client.initialize().catch((error) => {
    console.error('Initialization error:', error);
});

const generateQR = async (req, res) => {
    if (qrCodeData) {
        try {
            const qrCodeUrl = await qrcode.toDataURL(qrCodeData);
            res.status(200).json({ qrCode: qrCodeUrl });
        } catch (error) {
            console.error('Error generating QR code:', error);
            res.status(500).json({ message: 'Error generating QR code', error: error.message });
        }
    } else {
        res.status(500).json({ message: 'QR code not available' });
    }
};

const sendMessage = async (req, res) => {
    const { numero, mensaje } = req.body;
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await client.sendMessage(`${numero}@c.us`, mensaje);
        res.status(200).json({ message: 'Mensaje enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error al enviar el mensaje', error });
    }
};

const checkSession = (req, res) => {
    res.status(200).json({ isLoggedIn });
};

const getChats = async (req, res) => {
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chats = await client.getChats();
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({ message: 'Error getting chats', error });
    }
};

const getContacts = async (req, res) => {
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contacts = await client.getContacts();
        res.status(200).json(contacts);
    } catch (error) {
        console.error('Error getting contacts:', error);
        res.status(500).json({ message: 'Error getting contacts', error });
    }
};

const getChatById = async (req, res) => {
    const { chatId } = req.params;
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await client.getChatById(chatId);
        res.status(200).json(chat);
    } catch (error) {
        console.error('Error getting chat by ID:', error);
        res.status(500).json({ message: 'Error getting chat by ID', error });
    }
};

const getChatMessages = async (req, res) => {
    const { chatId } = req.params;
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 50 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error getting chat messages:', error);
        res.status(500).json({ message: 'Error getting chat messages', error });
    }
};

const sendMedia = async (req, res) => {
    const { numero, mediaUrl, caption } = req.body;
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = MessageMedia.fromUrl(mediaUrl);
        await client.sendMessage(`${numero}@c.us`, media, { caption });
        res.status(200).json({ message: 'Media enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending media:', error);
        res.status(500).json({ message: 'Error al enviar el media', error });
    }
};

const getProfilePicUrl = async (req, res) => {
    const { numero } = req.params;
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const url = await client.getProfilePicUrl(`${numero}@c.us`);
        res.status(200).json({ url });
    } catch (error) {
        console.error('Error getting profile picture URL:', error);
        res.status(500).json({ message: 'Error getting profile picture URL', error });
    }
};

const getState = async (req, res) => {
    if (!isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const state = await client.getState();
        res.status(200).json({ state });
    } catch (error) {
        console.error('Error getting client state:', error);
        res.status(500).json({ message: 'Error getting client state', error });
    }
};

const logout = async (req, res) => {
    try {
        await client.logout();
        isLoggedIn = false;
        qrCodeData = '';
        res.status(200).json({ message: 'Client logged out successfully.' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ message: 'Error logging out', error });
    }
};

module.exports = { 
    generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout 
};
