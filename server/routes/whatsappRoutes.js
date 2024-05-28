const express = require('express');
const { 
    generateQR, sendMessage, checkSession, 
    getChats, getContacts, getChatById, 
    getChatMessages, sendMedia, getProfilePicUrl, 
    getState, logout 
} = require('../controllers/whatsappController');
const router = express.Router();

router.get('/generate-qr', generateQR);
router.post('/send-message', sendMessage);
router.get('/check-session', checkSession);
router.get('/get-chats', getChats);
router.get('/get-contacts', getContacts);
router.get('/get-chat/:chatId', getChatById);
router.get('/get-chat-messages/:chatId', getChatMessages);
router.post('/send-media', sendMedia);
router.get('/get-profile-pic/:numero', getProfilePicUrl);
router.get('/get-state', getState);
router.post('/logout', logout);

module.exports = router;
