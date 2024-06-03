const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const cors = require('cors');

const whatsappRoutes = require('./routes/whatsappRoutes');
const chatgptRoutes = require('./routes/chatgptRoutes');

const app = express();

// Lee los certificados SSL
const privateKey = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Configura CORS para permitir todas las solicitudes
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, 'views')));

// Usar las rutas de WhatsApp y Puppeteer
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/puppeteer', chatgptRoutes);

// Redirigir tráfico HTTP a HTTPS
const httpApp = express();
httpApp.use((req, res, next) => {
  if (req.secure) {
    return next();
  }
  res.redirect(`https://${req.headers.host}${req.url}`);
});

// Crea el servidor HTTPS
const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(httpApp);

const HTTPS_PORT = 443;
const HTTP_PORT = 80;

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT} and redirecting to HTTPS`);
});
