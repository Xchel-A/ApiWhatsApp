const { Client, LocalAuth, MessageMedia, Buttons, Location, Contact, GroupChat } = require('whatsapp-web.js');
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
        }
        
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

// Obtiene el nivel de batería del dispositivo conectado
const getBatteryLevel = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const batteryLevel = await clientInfo.client.getBatteryLevel();
        res.status(200).json({ batteryLevel });
    } catch (error) {
        next(error);
    }
};

// Bloquea un contacto
const blockContact = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.blockContact(`${numero}@c.us`);
        res.status(200).json({ message: 'Contact blocked successfully' });
    } catch (error) {
        next(error);
    }
};

// Desbloquea un contacto
const unblockContact = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.unblockContact(`${numero}@c.us`);
        res.status(200).json({ message: 'Contact unblocked successfully' });
    } catch (error) {
        next(error);
    }
};

// Obtiene el estado (about) de un contacto
const getContactStatus = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        const status = await contact.getAbout();
        res.status(200).json({ status });
    } catch (error) {
        next(error);
    }
};


// Cambia el estado del perfil del cliente
const setStatus = async (req, res, next) => {
    const { token, status } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.setStatus(status);
        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Obtiene el estado del cliente (en línea, desconectado, etc.)
const getClientState = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const state = await clientInfo.client.getState();
        res.status(200).json({ state });
    } catch (error) {
        next(error);
    }
};

// Agrega un participante a un grupo
const addParticipant = async (req, res, next) => {
    const { token, groupId, participantId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.addParticipant(groupId, participantId);
        res.status(200).json({ message: 'Participant added successfully' });
    } catch (error) {
        next(error);
    }
};

// Elimina un participante de un grupo
const removeParticipant = async (req, res, next) => {
    const { token, groupId, participantId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.removeParticipant(groupId, participantId);
        res.status(200).json({ message: 'Participant removed successfully' });
    } catch (error) {
        next(error);
    }
};

// Promueve a un participante a administrador de un grupo
const promoteParticipant = async (req, res, next) => {
    const { token, groupId, participantId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.promoteParticipant(groupId, participantId);
        res.status(200).json({ message: 'Participant promoted successfully' });
    } catch (error) {
        next(error);
    }
};
// Degrada a un administrador a participante en un grupo
const demoteParticipant = async (req, res, next) => {
    const { token, groupId, participantId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.demoteParticipant(groupId, participantId);
        res.status(200).json({ message: 'Participant demoted successfully' });
    } catch (error) {
        next(error);
    }
};

// Crea un nuevo grupo con los participantes especificados
const createGroup = async (req, res, next) => {
    const { token, groupName, participants } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const response = await clientInfo.client.createGroup(groupName, participants);
        res.status(200).json({ groupId: response.gid._serialized, participants: response.participants });
    } catch (error) {
        next(error);
    }
};
// Obtiene información sobre un enlace de invitación a un grupo
const getInviteInfo = async (req, res, next) => {
    const { token, inviteCode } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const inviteInfo = await clientInfo.client.getInviteInfo(inviteCode);
        res.status(200).json(inviteInfo);
    } catch (error) {
        next(error);
    }
};

// Acepta una invitación a un grupo
const acceptInvite = async (req, res, next) => {
    const { token, inviteCode } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.acceptInvite(inviteCode);
        res.status(200).json({ message: 'Invite accepted successfully' });
    } catch (error) {
        next(error);
    }
};

// Archiva un chat
const archiveChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.archive();
        res.status(200).json({ message: 'Chat archived successfully' });
    } catch (error) {
        next(error);
    }
};
// Desarchiva un chat
const unarchiveChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.unarchive();
        res.status(200).json({ message: 'Chat unarchived successfully' });
    } catch (error) {
        next(error);
    }
};
// Silencia un chat por una duración específica
const muteChat = async (req, res, next) => {
    const { token, chatId, duration } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.mute(duration);
        res.status(200).json({ message: 'Chat muted successfully' });
    } catch (error) {
        next(error);
    }
};
// Desactiva el silencio de un chat
const unmuteChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.unmute();
        res.status(200).json({ message: 'Chat unmuted successfully' });
    } catch (error) {
        next(error);
    }
};
// Elimina un mensaje específico
const deleteMessage = async (req, res, next) => {
    const { token, messageId, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        await message.delete();
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// Marca un mensaje como leído
const markMessageAsRead = async (req, res, next) => {
    const { token, messageId, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        await message.read();
        res.status(200).json({ message: 'Message marked as read successfully' });
    } catch (error) {
        next(error);
    }
};
// Responde a un mensaje específico
const replyToMessage = async (req, res, next) => {
    const { token, messageId, chatId, replyMessage } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        await message.reply(replyMessage);
        res.status(200).json({ message: 'Replied to message successfully' });
    } catch (error) {
        next(error);
    }
};

// Obtiene los grupos en común con un contacto
const getCommonGroups = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        const commonGroups = await contact.getCommonGroups();
        res.status(200).json(commonGroups);
    } catch (error) {
        next(error);
    }
};

// Marca un chat como leído
const markChatAsRead = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.sendSeen();
        res.status(200).json({ message: 'Chat marked as read successfully' });
    } catch (error) {
        next(error);
    }
};
// Descarga el contenido multimedia de un mensaje
const downloadMedia = async (req, res, next) => {
    const { token, messageId, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        const media = await message.downloadMedia();
        res.status(200).json(media);
    } catch (error) {
        next(error);
    }
};
// Obtiene la información de un mensaje
const getMessageInfo = async (req, res, next) => {
    const { token, messageId, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        res.status(200).json(message);
    } catch (error) {
        next(error);
    }
};
// Obtiene la URL del código QR actual
const getCurrentQRCode = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];

    if (clientInfo) {
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

// Obtiene la lista de administradores de un grupo
const getGroupAdmins = async (req, res, next) => {
    const { token, groupId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        const admins = group.participants.filter(participant => participant.isAdmin);
        res.status(200).json(admins);
    } catch (error) {
        next(error);
    }
};

// Cambia el nombre de un grupo
const changeGroupName = async (req, res, next) => {
    const { token, groupId, newName } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        await group.setSubject(newName);
        res.status(200).json({ message: 'Group name changed successfully' });
    } catch (error) {
        next(error);
    }
};
// Cambia la descripción de un grupo
const changeGroupDescription = async (req, res, next) => {
    const { token, groupId, newDescription } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        await group.setDescription(newDescription);
        res.status(200).json({ message: 'Group description changed successfully' });
    } catch (error) {
        next(error);
    }
};

// Obtiene la lista de participantes de un grupo
const getGroupParticipants = async (req, res, next) => {
    const { token, groupId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        const participants = group.participants.map(participant => participant.id._serialized);
        res.status(200).json(participants);
    } catch (error) {
        next(error);
    }
};
// Envía una ubicación
const sendLocation = async (req, res, next) => {
    const { token, numero, latitude, longitude, description } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const location = new Location(latitude, longitude, description);
        await clientInfo.client.sendMessage(`${numero}@c.us`, location);
        res.status(200).json({ message: 'Location sent successfully' });
    } catch (error) {
        next(error);
    }
};

// Cambia la imagen de perfil del cliente
const changeProfilePic = async (req, res, next) => {
    const { token, imageUrl } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = await MessageMedia.fromUrl(imageUrl);
        await clientInfo.client.setProfilePic(media);
        res.status(200).json({ message: 'Profile picture updated successfully' });
    } catch (error) {
        next(error);
    }
};
// Fija un mensaje en un chat
const pinMessage = async (req, res, next) => {
    const { token, chatId, messageId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        await message.pin();
        res.status(200).json({ message: 'Message pinned successfully' });
    } catch (error) {
        next(error);
    }
};
// Desfija un mensaje en un chat
const unpinMessage = async (req, res, next) => {
    const { token, chatId, messageId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const message = await chat.fetchMessageById(messageId);
        await message.unpin();
        res.status(200).json({ message: 'Message unpinned successfully' });
    } catch (error) {
        next(error);
    }
};
// Obtiene la última vista de un contacto
const getLastSeen = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        const lastSeen = await contact.getLastSeen();
        res.status(200).json({ lastSeen });
    } catch (error) {
        next(error);
    }
};
// Cambia el nombre de un contacto
const changeContactName = async (req, res, next) => {
    const { token, numero, newName } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        await contact.setName(newName);
        res.status(200).json({ message: 'Contact name changed successfully' });
    } catch (error) {
        next(error);
    }
};

// Envía un archivo desde la ruta local
const sendFile = async (req, res, next) => {
    const { token, numero, filePath, caption } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const media = MessageMedia.fromFilePath(filePath);
        await clientInfo.client.sendMessage(`${numero}@c.us`, media, { caption });
        res.status(200).json({ message: 'File sent successfully' });
    } catch (error) {
        next(error);
    }
};
// Obtiene la foto de perfil de un grupo
const getGroupProfilePic = async (req, res, next) => {
    const { token, groupId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const url = await clientInfo.client.getProfilePicUrl(groupId);
        res.status(200).json({ url });
    } catch (error) {
        next(error);
    }
};
// Obtiene los mensajes destacados de un chat
const getStarredMessages = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const messages = await chat.getStarredMessages();
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};
// Obtiene la lista de grupos a los que pertenece un contacto
const getContactGroups = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        const groups = await contact.getGroups();
        res.status(200).json(groups);
    } catch (error) {
        next(error);
    }
};
// Obtiene la foto de perfil de un contacto
const getContactProfilePic = async (req, res, next) => {
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
// Fija un chat en la parte superior
const pinChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.pin();
        res.status(200).json({ message: 'Chat pinned successfully' });
    } catch (error) {
        next(error);
    }
};
// Desfija un chat de la parte superior
const unpinChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.unpin();
        res.status(200).json({ message: 'Chat unpinned successfully' });
    } catch (error) {
        next(error);
    }
};
// Elimina un chat
const deleteChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.delete();
        res.status(200).json({ message: 'Chat deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// Silencia notificaciones de un contacto
const muteContact = async (req, res, next) => {
    const { token, numero, duration } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(`${numero}@c.us`);
        await chat.mute(duration);
        res.status(200).json({ message: 'Contact muted successfully' });
    } catch (error) {
        next(error);
    }
};
// Obtiene los mensajes de una conversación
const getMessagesFromConversation = async (req, res, next) => {
    const { token, chatId, limit } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit });
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

// Obtiene la lista de mensajes no leídos
const getUnreadMessages = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chats = await clientInfo.client.getChats();
        const unreadMessages = [];
        for (const chat of chats) {
            const messages = await chat.fetchMessages({ limit: 50 });
            const unread = messages.filter(message => !message.isRead);
            unreadMessages.push(...unread);
        }
        res.status(200).json(unreadMessages);
    } catch (error) {
        next(error);
    }
};

// Obtiene los mensajes destacados de un contacto específico
const getStarredMessagesFromContact = async (req, res, next) => {
    const { token, numero } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(`${numero}@c.us`);
        const messages = await contact.getStarredMessages();
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

const getLabels = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const labels = await clientInfo.client.getLabels();
        res.status(200).json(labels);
    } catch (error) {
        next(error);
    }
};
const getLabelById = async (req, res, next) => {
    const { token, labelId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const label = await clientInfo.client.getLabelById(labelId);
        res.status(200).json(label);
    } catch (error) {
        next(error);
    }
};
const getBusinessProfile = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const profile = await clientInfo.client.getBusinessProfile();
        res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};
const getLabelsByChatId = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const labels = await chat.getLabels();
        res.status(200).json(labels);
    } catch (error) {
        next(error);
    }
};
const removeLabelFromChat = async (req, res, next) => {
    const { token, chatId, labelId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.removeLabel(labelId);
        res.status(200).json({ message: 'Label removed from chat successfully' });
    } catch (error) {
        next(error);
    }
};
const sendMessageToGroup = async (req, res, next) => {
    const { token, groupId, mensaje } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.sendMessage(`${groupId}@g.us`, mensaje);
        res.status(200).json({ message: 'Message sent to group successfully' });
    } catch (error) {
        next(error);
    }
};
const sendContactCard = async (req, res, next) => {
    const { token, numero, contactId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const contact = await clientInfo.client.getContactById(contactId);
        await clientInfo.client.sendMessage(`${numero}@c.us`, contact);
        res.status(200).json({ message: 'Contact card sent successfully' });
    } catch (error) {
        next(error);
    }
};
const clearChat = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        await chat.clearMessages();
        res.status(200).json({ message: 'Chat cleared successfully' });
    } catch (error) {
        next(error);
    }
};
const changeGroupSettings = async (req, res, next) => {
    const { token, groupId, settings } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        await group.updateSettings(settings);
        res.status(200).json({ message: 'Group settings updated successfully' });
    } catch (error) {
        next(error);
    }
};
const sendListMessage = async (req, res, next) => {
    const { token, numero, message, sections } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const listMessage = {
            body: message,
            sections: sections,
            buttonText: 'Select',
            footer: 'Footer text',
        };
        await clientInfo.client.sendMessage(`${numero}@c.us`, listMessage);
        res.status(200).json({ message: 'List message sent successfully' });
    } catch (error) {
        next(error);
    }
};
const sendTemplateMessage = async (req, res, next) => {
    const { token, numero, templateId, variables } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const templateMessage = {
            name: templateId,
            language: {
                code: 'en_US',
                policy: 'deterministic'
            },
            components: [
                {
                    type: 'body',
                    parameters: variables.map(variable => ({ type: 'text', text: variable }))
                }
            ]
        };
        await clientInfo.client.sendMessage(`${numero}@c.us`, templateMessage);
        res.status(200).json({ message: 'Template message sent successfully' });
    } catch (error) {
        next(error);
    }
};
const getBlockedContacts = async (req, res, next) => {
    const { token } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const blockedContacts = await clientInfo.client.getBlockedContacts();
        res.status(200).json(blockedContacts);
    } catch (error) {
        next(error);
    }
};
const setGroupAnnouncement = async (req, res, next) => {
    const { token, groupId, announcement } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const group = await clientInfo.client.getChatById(groupId);
        await group.setAnnouncement(announcement);
        res.status(200).json({ message: 'Group announcement setting updated successfully' });
    } catch (error) {
        next(error);
    }
};

const getChatLabels = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const labels = await chat.getLabels();
        res.status(200).json(labels);
    } catch (error) {
        next(error);
    }
};
const getMuteStatus = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const isMuted = await chat.isMuted();
        res.status(200).json({ isMuted });
    } catch (error) {
        next(error);
    }
};

const getChatMuteDuration = async (req, res, next) => {
    const { token, chatId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const chat = await clientInfo.client.getChatById(chatId);
        const muteDuration = await chat.getMuteDuration();
        res.status(200).json({ muteDuration });
    } catch (error) {
        next(error);
    }
};
const updateProfileName = async (req, res, next) => {
    const { token, name } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        await clientInfo.client.setProfileName(name);
        res.status(200).json({ message: 'Profile name updated successfully' });
    } catch (error) {
        next(error);
    }
};
const createBroadcastList = async (req, res, next) => {
    const { token, recipients, name } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const broadcastList = await clientInfo.client.createBroadcastList(recipients, name);
        res.status(200).json({ broadcastList });
    } catch (error) {
        next(error);
    }
};
const getGroupMetadata = async (req, res, next) => {
    const { token, groupId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const metadata = await clientInfo.client.getGroupMetadata(groupId);
        res.status(200).json(metadata);
    } catch (error) {
        next(error);
    }
};
const sendReaction = async (req, res, next) => {
    const { token, messageId, emoji } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const message = await clientInfo.client.getMessageById(messageId);
        await message.react(emoji);
        res.status(200).json({ message: 'Reaction sent successfully' });
    } catch (error) {
        next(error);
    }
};
const removeReaction = async (req, res, next) => {
    const { token, messageId } = req.body;
    const clientInfo = clients[token];
    if (!clientInfo || !clientInfo.isLoggedIn) {
        return res.status(400).json({ message: 'WhatsApp client not logged in' });
    }
    try {
        const message = await clientInfo.client.getMessageById(messageId);
        await message.removeReaction();
        res.status(200).json({ message: 'Reaction removed successfully' });
    } catch (error) {
        next(error);
    }
};


module.exports = { 
    initializeClient, generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById, getChatMessages,
    sendMedia, getProfilePicUrl, getState, logout,
    sendMessageWithButtons, getBatteryLevel, blockContact,
    unblockContact, getContactStatus, setStatus, getClientState,
    addParticipant, removeParticipant, promoteParticipant,
    demoteParticipant, createGroup, getInviteInfo, acceptInvite,
    archiveChat, unarchiveChat, muteChat, unmuteChat,
    deleteMessage, markMessageAsRead, replyToMessage,
    getCommonGroups, markChatAsRead, downloadMedia,
    getMessageInfo, getCurrentQRCode, getGroupAdmins,
    changeGroupName, changeGroupDescription, getGroupParticipants,
    sendLocation, changeProfilePic, pinMessage, unpinMessage,
    getLastSeen, changeContactName, sendFile, getGroupProfilePic,
    getStarredMessages, getContactGroups, getContactProfilePic,
    pinChat, unpinChat, deleteChat, muteContact,
    getMessagesFromConversation, getUnreadMessages, getStarredMessagesFromContact,
    getLabels, getLabelById, getBusinessProfile,
    getLabelsByChatId, removeLabelFromChat, sendMessageToGroup,
    sendContactCard, clearChat, changeGroupSettings,
    sendListMessage, getBlockedContacts, setGroupAnnouncement,
    getChatLabels, getMuteStatus, sendTemplateMessage,
    getChatMuteDuration, updateProfileName, createBroadcastList,
    getGroupMetadata, sendReaction, removeReaction
};

