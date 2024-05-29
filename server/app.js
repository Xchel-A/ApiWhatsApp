const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const SSL_PORT = 3443;

// Configura el uso de certificados SSL
const sslOptions = {
    key: fs.readFileSync('./ssl/selfsigned.key'),
    cert: fs.readFileSync('./ssl/selfsigned.crt')
};

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Crear un servidor HTTPS
https.createServer(sslOptions, app).listen(SSL_PORT, () => {
    console.log(`HTTPS Server running on port ${SSL_PORT}`);
});
