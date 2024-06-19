const { Client, LocalAuth, MessageMedia, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const fs = require('fs');

const clients = {};

const initializeClient = async (token) => {
    if (clients[token]) {
        return { isLoggedIn: true, message: 'Client already initialized' };
    }

    try {
        const { data: validationResponse } = await axios.post('https://chatmyway.com/api/validate/token', { token });
        if (!validationResponse.valid) {
            return { isLoggedIn: false, message: 'Invalid token' };
        }
    } catch (error) {
        return { isLoggedIn: false, message: `Error validating token: ${error.message}` };
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: token }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-gpu'],
        },
        webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
    });

    clients[token] = { client, qrCodeData: '', qrAttempts: 0, isLoggedIn: false };

    client.on('qr', (qr) => {
        clients[token].qrCodeData = qr;
        clients[token].qrAttempts += 1;
        if (clients[token].qrAttempts >= 5) {
            client.destroy();
            delete clients[token];
        }
    });

    client.on('ready', () => {
        clients[token].isLoggedIn = true;
        clients[token].qrCodeData = '';
        clients[token].qrAttempts = 0;
    });

    client.on('authenticated', () => {
        clients[token].isLoggedIn = true;
    });

    client.on('auth_failure', () => {
        clients[token].isLoggedIn = false;
    });

    client.on('disconnected', (reason) => {
        clients[token].isLoggedIn = false;
        clients[token].qrCodeData = '';
        client.destroy();
        delete clients[token];
    });

    client.on('message', async (msg) => {
        const token = client.options.authStrategy.clientId;
        if (msg.body.startsWith('!gpt:')) {
            const userMessage = msg.body.slice(5).trim();
            try {
                const responseInit = await axios.post('https://dendenmushi.space/api/chatgpt/init', { token });
                const chatResponse = await axios.post('https://dendenmushi.space/api/chatgpt/chat', { token, message: userMessage });
                msg.reply(chatResponse.data.response);
            } catch (error) {
                console.error(`Error processing message: ${error.message}`);
            }
        } else {
            const userMessage = msg.body.trim();
            try {
                const { data: validationResponse } = await axios.post('https://chatmyway.com/api/validate/keywords', { token, message: userMessage });
                if (validationResponse.valid) {
                    msg.reply(validationResponse.response);
                }
            } catch (error) {
                console.error(`Error validating keywords: ${error.message}`);
            }
        }
    });

    client.initialize().catch((error) => {
        console.error(`Initialization error: ${error.message}`);
    });

    return { isLoggedIn: false, message: 'Client initialized' };
};

const generateQR = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];

    if (clientInfo) {
        if (clientInfo.qrAttempts >= 5) {
            return res.status(401).json({ message: 'Maximum QR attempts reached. Please reinitialize the client.' });
        }

        if (clientInfo.qrCodeData) {
            try {
                const qrCodeUrl = await qrcode.toDataURL(clientInfo.qrCodeData);
                res.status(200).json({ qrCode: qrCodeUrl });
            } catch (error) {
                next(error);
            }
        } else {
            res.status(404).json({ message: 'QR code not available' });
        }
    } else {
        res.status(401).json({ message: 'Client not initialized' });
    }
};

const sendMessage = async (req, res, next) => {
    const { token, numero, mensaje } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.sendMessage(`${numero}@c.us`, mensaje);
        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        next(error);
    }
};

const checkSession = (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (clientInfo) {
        res.status(200).json({ isLoggedIn: clientInfo.isLoggedIn });
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

const getChats = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chats = await clientInfo.client.getChats();
        res.status(200).json(chats);
    } catch (error) {
        next(error);
    }
};

const getContacts = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contacts = await clientInfo.client.getContacts();
        res.status(200).json(contacts);
    } catch (error) {
        next(error);
    }
};

const getChatById = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        res.status(200).json(chat);
    } catch (error) {
        next(error);
    }
};

const getChatMessages = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 50 });
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

const sendMedia = async (req, res, next) => {
    const { token, numero, mediaUrl, caption } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
        await clientInfo.client.sendMessage(`${numero}@c.us`, media, { caption });
        res.status(200).json({ message: 'Media sent successfully' });
    } catch (error) {
        next(error);
    }
};

const getProfilePicUrl = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const url = await clientInfo.client.getProfilePicUrl(`${numero}@c.us`);
        res.status(200).json({ url });
    } catch (error) {
        next(error);
    }
};

const getState = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(401).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const state = await clientInfo.client.getState();
        res.status(200).json({ state });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (clientInfo) {
        try {
            await clientInfo.client.logout();
            clientInfo.isLoggedIn = false;
            clientInfo.qrCodeData = '';
            delete clients[token];
            res.status(200).json({ message: 'Client logged out successfully' });
        } catch (error) {
            next(error);
        }
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

const sendMessageWithButtons = async (req, res, next) => {
    const { token, numero, mensaje, botones } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const buttonArray = botones.map(boton => ({
            buttonId: boton.id,
            buttonText: { displayText: boton.body },
            type: 1
        }));
        const buttonMessage = {
            contentText: mensaje,
            footerText: 'Footer',
            buttons: buttonArray,
            headerType: 1
        };
        await clientInfo.client.sendMessage(`${numero}@c.us`, buttonMessage);
        res.status(200).json({ message: 'Message with buttons sent successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    initializeClient, generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout, sendMessageWithButtons
};
