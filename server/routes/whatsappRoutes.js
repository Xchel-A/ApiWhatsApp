const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    initializeClient, generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById,
    getChatMessages, sendMedia, getProfilePicUrl,
    getState, logout, sendMessageWithButtons
} = require('../controllers/whatsappController');

const router = express.Router();

router.post('/initialize', [
    body('token').not().isEmpty().withMessage('Token is required')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    initializeClient(req.body.token).then(result => {
        res.status(result.isLoggedIn ? 200 : result.message.includes('Invalid token') ? 401 : 500).json(result);
    }).catch(next);
});

router.post('/generate-qr', [
    body('token').not().isEmpty().withMessage('Token is required')
], generateQR);

router.post('/send-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mensaje').not().isEmpty().withMessage('Message is required')
], sendMessage);

router.post('/check-session', [
    body('token').not().isEmpty().withMessage('Token is required')
], checkSession);

router.post('/get-chats', [
    body('token').not().isEmpty().withMessage('Token is required')
], getChats);

router.post('/get-contacts', [
    body('token').not().isEmpty().withMessage('Token is required')
], getContacts);

router.post('/get-chat-by-id', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatById);

router.post('/get-chat-messages', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatMessages);

router.post('/send-media', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mediaUrl').not().isEmpty().withMessage('Media URL is required')
], sendMedia);

router.post('/get-profile-pic-url', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getProfilePicUrl);

router.post('/get-state', [
    body('token').not().isEmpty().withMessage('Token is required')
], getState);

router.post('/logout', [
    body('token').not().isEmpty().withMessage('Token is required')
], logout);

router.post('/send-message-with-buttons', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mensaje').not().isEmpty().withMessage('Message is required'),
    body('botones').isArray().withMessage('Buttons must be an array')
], sendMessageWithButtons);

module.exports = router;
