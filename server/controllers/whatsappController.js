const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const clients = {};

const initializeClient = (userId) => {
    if (!clients[userId]) {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: userId }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-gpu'],
            },
            webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
        });

        clients[userId] = {
            client,
            qrCodeData: '',
            isLoggedIn: false
        };

        client.on('qr', (qr) => {
            console.log(`QR RECEIVED for user ${userId}`, qr);
            clients[userId].qrCodeData = qr;
        });

        client.on('ready', () => {
            console.log(`Client for user ${userId} is ready!`);
            clients[userId].isLoggedIn = true;
            clients[userId].qrCodeData = '';
        });

        client.on('authenticated', () => {
            console.log(`Client for user ${userId} is authenticated!`);
        });

        client.on('auth_failure', (msg) => {
            console.error(`Authentication failure for user ${userId}`, msg);
            clients[userId].isLoggedIn = false;
        });

        client.on('disconnected', (reason) => {
            console.log(`Client for user ${userId} was logged out:`, reason);
            clients[userId].isLoggedIn = false;
            clients[userId].qrCodeData = '';
            client.destroy();  // Ensure client instance is destroyed
            delete clients[userId];  // Remove client from the clients object
        });

        client.on('message', async msg => {
            // Validar si el mensaje proviene de un grupo
            console.log(msg);
            // if (msg.isGroupMsg) {
            //     return;  // No responder a mensajes de grupo
            // }
        
            // if (msg.body) {
            //     const userId = client.options.authStrategy.clientId;
        
            //     try {
            //         // Inicializar sesión de ChatGPT
            //         await axiosInstance.post('https://dendenmushi.space:3001/init', { token: userId });
        
            //         // Enviar el mensaje recibido por el cliente a ChatGPT
            //         const chatResponse = await axiosInstance.post('https://dendenmushi.space:3001/chat', { token: userId, message: msg.body });
            //         const replyMessage = chatResponse.data.response;
        
            //         // Responder al cliente con el mensaje recibido de ChatGPT
            //         msg.reply(replyMessage);
            //     } catch (error) {
            //         console.error(`Error processing message for user ${userId}:`, error.message);
            //         msg.reply('Lo siento, hubo un error al procesar tu mensaje.');
            //     }
            // }
        });
        

      
        client.initialize().catch((error) => {
            console.error(`Initialization error for user ${userId}:`, error);
            // Aquí se puede agregar más detalle del error
            console.error('Error details:', error.message, error.stack);
        });
    }
};

const generateQR = async (req, res) => {
    const { userId } = req.body;
    const clientInfo = clients[userId];
    if (clientInfo && clientInfo.qrCodeData) {
        try {
            const qrCodeUrl = await qrcode.toDataURL(clientInfo.qrCodeData);
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
    const { userId, numero, mensaje } = req.body;
    const clientInfo = clients[userId];
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
    const { userId } = req.body;
    const clientInfo = clients[userId];
    if (clientInfo) {
        res.status(200).json({ isLoggedIn: clientInfo.isLoggedIn });
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

const getChats = async (req, res) => {
    const { userId } = req.body;
    const clientInfo = clients[userId];
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
    const { userId } = req.body;
    const clientInfo = clients[userId];
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
    const { userId, chatId } = req.body;
    const clientInfo = clients[userId];
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
    const { userId, chatId } = req.body;
    const clientInfo = clients[userId];
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
    const { userId, numero, mediaUrl, caption } = req.body;
    const clientInfo = clients[userId];
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
    const { userId, numero } = req.body;
    const clientInfo = clients[userId];
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
    const { userId } = req.body;
    const clientInfo = clients[userId];
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
    const { userId } = req.body;
    const clientInfo = clients[userId];
    if (clientInfo) {
        try {
            await clientInfo.client.logout();
            clientInfo.isLoggedIn = false;
            clientInfo.qrCodeData = '';
            delete clients[userId];
            res.status(200).json({ message: 'Client logged out successfully.' });
        } catch (error) {
            console.error('Error logging out:', error);
            res.status(500).json({ message: 'Error logging out', error });
        }
    } else {
        res.status(400).json({ message: 'Client not initialized' });
    }
};

module.exports = { 
    initializeClient, generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout 
};
