const express = require('express');
const {
    initializeClient, generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById,
    getChatMessages, sendMedia, getProfilePicUrl,
    getState, logout, shutdownAllClients
} = require('../controllers/whatsappController');
const router = express.Router();

router.post('/initialize', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId no proporcionado' });
    }

    try {
        const result = await initializeClient(userId);

        // Manejar las respuestas según el resultado de la función initializeClient
        if (result.isLoggedIn) {
            return res.status(200).json(result);
        } else if (result.message === 'Invalid token') {
            return res.status(401).json(result);
        } else if (result.message === 'Error validating token') {
            return res.status(401).json(result);
        } else if (result.message === 'Client initialization failed') {
            return res.status(500).json(result);
        } else {
            return res.status(200).json(result);
        }
    } catch (error) {
        console.error(`Error al inicializar la sesión: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});


const SHUTDOWN_TOKEN = 'e97a45416001a775518dfa13125cd33a';

router.post('/shutdown/all', async (req, res) => {
    const { token } = req.body;

    if (token !== SHUTDOWN_TOKEN) {
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }

    try {
        await shutdownAllClients();
        res.status(200).json({ message: 'All clients have been shut down successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error shutting down clients', error });
    }
});


router.post('/generate-qr', generateQR);
router.post('/send-message', sendMessage);
router.post('/check-session', checkSession);
router.post('/get-chats', getChats);
router.post('/get-contacts', getContacts);
router.post('/get-chat-by-id', getChatById);
router.post('/get-chat-messages', getChatMessages);
router.post('/send-media', sendMedia);
router.post('/get-profile-pic-url', getProfilePicUrl);
router.post('/get-state', getState);
router.post('/logout', logout);


module.exports = router;
