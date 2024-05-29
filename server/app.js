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

// Configura CORS para permitir solo el dominio dendemushi.com.mx
const corsOptions = {
    origin: 'https://dendemushi.com.mx',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
