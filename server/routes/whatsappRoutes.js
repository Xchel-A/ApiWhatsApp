const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// Configura CORS para permitir solo el dominio dendemushi.com.mx
const corsOptions = {
    origin: 'https://dendemushi.com.mx',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Aquí irían tus rutas y demás configuraciones
const {
    generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById,
    getChatMessages, sendMedia, getProfilePicUrl,
    getState, logout, initializeClient
} = require('./controllers/whatsappController');

const router = express.Router();

router.post('/initialize', (req, res) => {
    const { userId } = req.body;
    initializeClient(userId);
    res.status(200).json({ message: 'Client initialized' });
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

app.use('/api', router);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
