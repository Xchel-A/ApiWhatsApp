const axios = require('axios');
const session = require('express-session');

const registerUser = async (req, res) => {
    const { Nombres, Apellidos, Correo, Contrasena } = req.body;
    try {
        const response = await axios.post('https://myzone.malware.com.mx/api/auth/register', {
            Nombres,
            Apellidos,
            Correo,
            Contrasena
        });
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(error.response ? error.response.status : 500).json({ message: error.response ? error.response.data.message : 'Error en el servidor' });
    }
};

const loginUser = async (req, res) => {
    const { Correo, Contrasena } = req.body;
    try {
        const response = await axios.post('https://myzone.malware.com.mx/api/auth/login', {
            Correo,
            Contrasena
        });

        const userData = response.data.data;
        req.session.user = userData;
        res.status(200).json({ message: 'Inicio de sesión exitoso.', data: userData });
    } catch (error) {
        console.error(error);
        res.status(error.response ? error.response.status : 500).json({ message: error.response ? error.response.data.message : 'Error en el servidor' });
    }
};

const logoutUser = async (req, res) => {
    try {
        const response = await axios.post('https://myzone.malware.com.mx/api/auth/logout');
        req.session.destroy();
        res.status(200).json({ message: 'Cierre de sesión exitoso.' });
    } catch (error) {
        console.error(error);
        res.status(error.response ? error.response.status : 500).json({ message: error.response ? error.response.data.message : 'Error en el servidor' });
    }
};

const getSessionData = async (req, res) => {
    try {
        const response = await axios.post('https://myzone.malware.com.mx/api/auth/get/session');
        const sessionData = response.data.data;
        console.log(response);
        if (sessionData) {
            req.session.user = sessionData;
            res.status(200).json({ status: 200, data: sessionData });
        } else {
            res.status(401).json({ status: 401, message: 'No hay sesión activa.' });
        }
    } catch (error) {
        console.error(error);
        res.status(error.response ? error.response.status : 500).json({ message: error.response ? error.response.data.message : 'Error en el servidor' });
    }
};

module.exports = { registerUser, loginUser, logoutUser, getSessionData };
