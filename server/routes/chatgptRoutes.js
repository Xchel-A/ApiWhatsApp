const express = require('express');
const router = express.Router();
const chatgptController = require('../controllers/chatgptController'); // Asegúrate de que este nombre coincida exactamente

router.post('/init', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado' });
  }

  try {
    const result = await chatgptController.initPuppeteer(token);
    res.json(result);
  } catch (error) {
    console.error(`Error al inicializar la sesión: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  const { token, message } = req.body;
  if (!token || !message) {
    return res.status(400).json({ error: 'Token o mensaje no proporcionado' });
  }

  try {
    const response = await chatgptController.sendMessageAndGetResponse(token, message);
    res.json({ response });
  } catch (error) {
    console.error(`Error al enviar el mensaje: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.post('/close-session', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado' });
  }

  try {
    const result = chatgptController.closeSession(token);
    res.status(result.error ? 404 : 200).json(result);
  } catch (error) {
    console.error(`Error al cerrar la sesión: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.post('/close-all-sessions', (req, res) => {
  try {
    const result = chatgptController.closeAllSessions();
    res.json(result);
  } catch (error) {
    console.error(`Error al cerrar todas las sesiones: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
