const { Client, LocalAuth, MessageMedia, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const clients = {};

const initializeClient = async (token) => {
    if (clients[token]) {
        console.log(`Client for token ${token} is already initialized.`);
        return { isLoggedIn: true, message: 'Client already initialized' };
    }

    try {
        const validationResponse = await axios.post('https://chatmyway.com/api/validate/token', { token });
        if (!validationResponse.data.valid) {
            console.error('Invalid token', token);
            return { isLoggedIn: false, message: 'Invalid token' };
        }
    } catch (error) {
        console.error('Error validating token', token, error.message);
        return { isLoggedIn: false, message: 'Error validating token' };
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: token }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-gpu'],
        },
        webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
    });

    clients[token] = {
        client,
        qrCodeData: '',
        qrAttempts: 0,
        isLoggedIn: false
    };

    client.on('qr', (qr) => {
        console.log(`QR RECEIVED for token ${token}`, qr);
        clients[token].qrCodeData = qr;
        clients[token].qrAttempts += 1;

        if (clients[token].qrAttempts >= 5) {
            console.log(`Maximum QR attempts reached for token ${token}, closing client.`);
            client.destroy();
            delete clients[token];
        }
    });

    client.on('ready', () => {
        console.log(`Client for token ${token} is ready!`);
        clients[token].isLoggedIn = true;
        clients[token].qrCodeData = '';
        clients[token].qrAttempts = 0;
    });

    client.on('authenticated', () => {
        console.log(`Client for token ${token} is authenticated!`);
    });

    client.on('auth_failure', (msg) => {
        console.error(`Authentication failure for token ${token}`, msg);
        clients[token].isLoggedIn = false;
    });

    client.on('disconnected', (reason) => {
        console.log(`Client for token ${token} was logged out:`, reason);
        clients[token].isLoggedIn = false;
        clients[token].qrCodeData = '';
        client.destroy();
        delete clients[token];
    });

    client.on('message', async (msg) => {
        console.log(msg.body);

        if (msg.id.remote.endsWith('@g.us') || msg.hasMedia) {
            console.log('El mensaje es de un grupo o de media');
            return;
        }

        const token = client.options.authStrategy.clientId;

        if (msg.body && msg.body.startsWith('!gpt:')) {
            console.log('El mensaje tiene contenido y comienza con !gpt:');

            const userMessage = msg.body.slice(5).trim();

            try {
                const responseInit = await axios.post('https://dendenmushi.space/api/chatgpt/init', { token }, { timeout: 200000 });
                console.log(responseInit);

                const chatResponse = await axios.post('https://dendenmushi.space/api/chatgpt/chat', { token, message: userMessage }, { timeout: 300000 });
                const replyMessage = chatResponse.data.response;
                console.log(chatResponse);

                msg.reply(replyMessage);
            } catch (error) {
                console.error(`Error processing message for token ${token}:`, error.message);
            }
        } else {
            console.log('El mensaje no comienza con !gpt:, validando palabras clave del usuario.');

            const userMessage = msg.body.trim();

            try {
                const validationResponse = await axios.post('https://chatmyway.com/api/validate/keywords', { token, message: userMessage }, { timeout: 30000 });

                if (validationResponse.data.valid) {
                    msg.reply(validationResponse.data.response);
                } else {
                    console.log('No se encontraron palabras clave coincidentes.');
                }
            } catch (error) {
                console.error(`Error validating keywords for token ${token}:`, error.message);
            }
        }
    });

    client.initialize().catch((error) => {
        console.error(`Initialization error for token ${token}:`, error);
        console.error('Error details:', error.message, error.stack);
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
                console.error('Error generating QR code:', error);
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
        res.status(200).json({ message: 'Mensaje enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending message:', error);
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
        console.error('Error getting chats:', error);
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
        console.error('Error getting contacts:', error);
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
        console.error('Error getting chat by ID:', error);
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
        console.error('Error getting chat messages:', error);
        next(error);
    }
};

const sendMedia = async (req, res) => {
    const { token, numero, mediaUrl, caption } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true }); // Agrega unsafeMime: true
        await clientInfo.client.sendMessage(`${numero}@c.us`, media, { caption });
        res.status(200).json({ message: 'Media enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending media:', error);
        res.status(500).json({ message: 'Error al enviar el media', error });
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
        console.error('Error getting profile picture URL:', error);
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
        console.error('Error getting client state:', error);
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
            res.status(200).json({ message: 'Client logged out successfully.' });
        } catch (error) {
            console.error('Error logging out:', error);
            next(error);
        }
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};
const sendMessageWithButtons = async (req, res) => {
    const { token, numero, mensaje, botones } = req.body;
    const clientInfo = clients[token];

    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }

    try {
        // Crear los botones
        const buttonArray = botones.map(boton => ({
            id: boton.id,
            body: boton.body
        }));

        // Crear el mensaje con botones
        const buttonMessage = new Buttons(mensaje, buttonArray, 'Title', 'Footer');

        // Enviar el mensaje con botones
        await clientInfo.client.sendMessage(`${numero}@c.us`, buttonMessage);
        res.status(200).json({ message: 'Mensaje con botones enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending message with buttons:', error);
        res.status(500).json({ message: 'Error al enviar el mensaje con botones', error });
    }
};


module.exports = { 
    initializeClient, generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout, sendMessageWithButtons
};
