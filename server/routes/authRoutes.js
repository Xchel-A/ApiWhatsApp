const express = require('express');
const { registerUser, loginUser, logoutUser, getSessionData } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/get/session', getSessionData);

module.exports = router;
