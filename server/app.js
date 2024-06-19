const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const https = require('https');
const cors = require('cors');
const { privateKey, certificate } = require('./utils/certificate');
const errorHandler = require('./middlewares/errorHandler');

const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();

// SSL credentials
const credentials = { key: privateKey, cert: certificate };

// CORS configuration
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, 'views')));

// Use WhatsApp routes
app.use('/api/whatsapp', whatsappRoutes);

// Error handling middleware
app.use(errorHandler);

// Redirect HTTP to HTTPS
const httpApp = express();
httpApp.use((req, res, next) => {
  if (req.secure) {
    return next();
  }
  res.redirect(`https://${req.headers.host}${req.url}`);
});

// Create HTTPS server
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
