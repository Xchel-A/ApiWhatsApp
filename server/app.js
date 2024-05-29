const fs = require('fs');
const https = require('https');
const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
}));

// Servir archivos estáticos desde el directorio 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Cargar certificados SSL
const sslOptions = {
    key: fs.readFileSync('/etc/ssl/private/selfsigned.key'),
    cert: fs.readFileSync('/etc/ssl/private/selfsigned.crt')
};

// Crear servidor HTTPS
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
