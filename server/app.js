const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Lee los certificados SSL
const privateKey = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Configura CORS para permitir solo los dominios dendemushi.com.mx y whatsapi.dendenmushi.com.mx
const allowedOrigins = ['https://dendemushi.com.mx', 'https://whatsapi.dendenmushi.com.mx', 'https://tuservidorphp.com'];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions)); // Utiliza las opciones de CORS ajustadas

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, 'views')));

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Crea el servidor HTTPS
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});
