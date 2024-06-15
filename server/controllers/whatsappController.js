const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
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
        // Validar token enviando token
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
        qrAttempts: 0, // Contador de intentos de generación de QR
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
        clients[token].qrAttempts = 0; // Reiniciar contador al iniciar sesión
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
        client.destroy();  // Ensure client instance is destroyed
        delete clients[token];  // Remove client from the clients object
    });

    client.on('message', async (msg) => {
        // Validar si el mensaje proviene de un grupo o si contiene medios
        console.log(msg.body);

        if (msg.id.remote.endsWith('@g.us') || msg.hasMedia) {
            console.log('El mensaje es de un grupo o de media');
            return;  // No responder a mensajes de grupo ni a mensajes con medios
        }

        const token = client.options.authStrategy.clientId;

        // Verificar si el mensaje comienza con !gpt:
        if (msg.body && msg.body.startsWith('!gpt:')) {
            console.log('El mensaje tiene contenido y comienza con !gpt:');

            // Extraer el contenido después de !gpt:
            const userMessage = msg.body.slice(5).trim();

            try {
                // Inicializar sesión de ChatGPT con un timeout de 30 segundos
                const responseInit = await axios.post('https://dendenmushi.space/api/chatgpt/init', { token }, { timeout: 200000 });
                console.log(responseInit);

                // Enviar el mensaje recibido por el cliente a ChatGPT con un timeout de 30 segundos
                const chatResponse = await axios.post('https://dendenmushi.space/api/chatgpt/chat', { token, message: userMessage }, { timeout: 300000 });
                const replyMessage = chatResponse.data.response;
                console.log(chatResponse);

                // Responder al cliente con el mensaje recibido de ChatGPT
                msg.reply(replyMessage);
            } catch (error) {
                console.error(`Error processing message for token ${token}:`, error.message);
                //msg.reply('Lo siento, hubo un error al procesar tu mensaje.');
            }
        } else {
            console.log('El mensaje no comienza con !gpt:, validando palabras clave del usuario.');

            // Extraer el contenido del mensaje completo
            const userMessage = msg.body.trim();

            try {
                // Validar palabras clave del cliente
                const validationResponse = await axios.post('https://chatmyway.com/api/validate/keywords', { token, message: userMessage }, { timeout: 30000 });

                if (validationResponse.data.valid) {
                    // Responder al cliente con la respuesta encontrada
                    msg.reply(validationResponse.data.response);
                } else {
                    console.log('No se encontraron palabras clave coincidentes.');
                }
            } catch (error) {
                console.error(`Error validating keywords for token ${token}:`, error.message);
                //msg.reply('Lo siento, hubo un error al validar tu mensaje.');
            }
        }
    });

    client.initialize().catch((error) => {
        console.error(`Initialization error for token ${token}:`, error);
        // Aquí se puede agregar más detalle del error
        console.error('Error details:', error.message, error.stack);
    });

    return { isLoggedIn: false, message: 'Client initialized' };
};

const generateQR = async (req, res) => {
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
                res.status(500).json({ message: 'Error generating QR code', error: error.message });
            }
        } else {
            res.status(404).json({ message: 'QR code not available' });
        }
    } else {
        res.status(401).json({ message: 'Client not initialized' });
    }
};

const sendMessage = async (req, res) => {
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
        res.status(500).json({ message: 'Error al enviar el mensaje', error });
    }
};

const checkSession = (req, res) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (clientInfo) {
        res.status(200).json({ isLoggedIn: clientInfo.isLoggedIn });
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

const getChats = async (req, res) => {
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
        res.status(500).json({ message: 'Error getting chats', error });
    }
};

const getContacts = async (req, res) => {
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
        res.status(500).json({ message: 'Error getting contacts', error });
    }
};

const getChatById = async (req, res) => {
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
        res.status(500).json({ message: 'Error getting chat by ID', error });
    }
};

const getChatMessages = async (req, res) => {
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
        res.status(500).json({ message: 'Error getting chat messages', error });
    }
};

const sendMedia = async (req, res) => {
    const { token, numero, mediaUrl, caption } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = await MessageMedia.fromUrl(mediaUrl);
        await clientInfo.client.sendMessage(`${numero}@c.us`, media, { caption });
        res.status(200).json({ message: 'Media enviado exitosamente.' });
    } catch (error) {
        console.error('Error sending media:', error);
        res.status(500).json({ message: 'Error al enviar el media', error });
    }
};

const getProfilePicUrl = async (req, res) => {
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
        res.status(500).json({ message: 'Error getting profile picture URL', error });
    }
};

const getState = async (req, res) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const state = await clientInfo.client.getState();
        res.status(200).json({ state });
    } catch (error) {
        console.error('Error getting client state:', error);
        res.status(500).json({ message: 'Error getting client state', error });
    }
};

const logout = async (req, res) => {
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
            res.status(500).json({ message: 'Error logging out', error });
        }
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

const shutdownAllClients = async () => {
    for (const token in clients) {
        if (clients.hasOwnProperty(token)) {
            try {
                await clients[token].client.destroy();
                console.log(`Client for token ${token} has been destroyed.`);
            } catch (error) {
                console.error(`Error destroying client for token ${token}:`, error);
            }
        }
    }

    // Eliminar todos los clientes del objeto
    for (const token in clients) {
        if (clients.hasOwnProperty(token)) {
            delete clients[token];
        }
    }

    // Eliminar las carpetas de datos de autenticación y caché
    const authPath = path.join(__dirname, '.wwebjs_auth'); // Ruta por defecto
    const cachePath = path.join(__dirname, '.wwebjs_cache'); // Ruta de caché si se usa

    if (fs.existsSync(authPath)) {
        fs.rm(authPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error deleting auth folder:', err);
            } else {
                console.log('Auth folder has been deleted.');
            }
        });
    } else {
        console.log('Auth folder does not exist.');
    }

    if (fs.existsSync(cachePath)) {
        fs.rm(cachePath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error deleting cache folder:', err);
            } else {
                console.log('Cache folder has been deleted.');
            }
        });
    } else {
        console.log('Cache folder does not exist.');
    }

    console.log('All clients have been shut down and checked for auth and cache folders deletion.');
};

module.exports = { 
    initializeClient, generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout, shutdownAllClients
};
