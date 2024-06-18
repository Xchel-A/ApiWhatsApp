const express = require('express');
const {
    initializeClient, generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById,
    getChatMessages, sendMedia, getProfilePicUrl,
    getState, logout, sendMessageWithButtons
} = require('../controllers/whatsappController');
const router = express.Router();

router.post('/initialize', async (req, res, next) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token no proporcionado' });
    }

    try {
        const result = await initializeClient(token);
        res.status(result.isLoggedIn ? 200 : result.message.includes('Invalid token') ? 401 : 500).json(result);
    } catch (error) {
        next(error);
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
router.post('/send-message-with-buttons', sendMessageWithButtons);
module.exports = router;
