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

app.use(express.static(path.join(__dirname, 'views')));

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});