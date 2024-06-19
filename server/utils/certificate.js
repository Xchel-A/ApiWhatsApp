const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/dendenmushi.space/fullchain.pem', 'utf8');

module.exports = { privateKey, certificate };
