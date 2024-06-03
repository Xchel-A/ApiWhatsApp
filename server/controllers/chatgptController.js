const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');

puppeteer.use(StealthPlugin());

let sessions = {};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initPuppeteer(token) {
  if (sessions[token]) {
    console.log(`Sesión con token ${token} ya está abierta.`);
    return { session: true, message: 'Sesión ya inicializada', token };
  }

  exec('Xvfb :99 -screen 0 1280x1024x16 &', (error) => {
    if (error) {
      console.error(`Error al iniciar Xvfb: ${error.message}`);
      return;
    }
    console.log('Xvfb iniciado');
  });

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--display=:99']
  });
  const page = await browser.newPage();
  await page.goto('https://chat.openai.com/', { waitUntil: 'networkidle2' });

  const checkTextarea = async () => {
    try {
      await page.waitForSelector('textarea', { timeout: 10000 });
      console.log('Textarea encontrado');
      return true;
    } catch (error) {
      console.error('No se encontró el campo de entrada de texto');
      return false;
    }
  };

  const retryOnError = async (attempts) => {
    let isTextareaFound = await checkTextarea();
    while (!isTextareaFound && attempts > 0) {
      console.log(`Reintentando... Intentos restantes: ${attempts}`);
      await page.reload({ waitUntil: 'networkidle2' });
      isTextareaFound = await checkTextarea();
      attempts--;
    }
    return isTextareaFound;
  };

  const maxAttempts = 3;
  const isTextareaFound = await retryOnError(maxAttempts);
  if (!isTextareaFound) {
    console.error('Fallo la inicialización: no se encontró el campo de entrada de texto después de varios intentos');
    throw new Error('Fallo la inicialización: no se encontró el campo de entrada de texto después de varios intentos');
  }

  sessions[token] = { browser, page, lastActivity: Date.now() };
  return { session: false, message: 'Sesión inicializada', token };
}

async function sendMessageAndGetResponse(token, message) {
  const session = sessions[token];
  if (!session) {
    throw new Error('Sesión no encontrada o expirada.');
  }

  const { page } = session;
  await page.type('textarea', message);
  await page.keyboard.press('Enter');
  

  await page.waitForSelector(`[data-message-author-role="user"]:last-child`);
  await wait(20000); // Esperar 20 segundos
  const newResponse = await page.evaluate(async () => {
    const selector = '.markdown.prose.w-full.break-words';
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let responseText = '';
    let newMessageGenerated = false;
    let retries = 0;
    let lastMessageId = '';

    while (!newMessageGenerated && retries < 160) {
      const responseMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
      const lastMessage = responseMessages[responseMessages.length - 1];
      console.log(responseMessages);

      if (lastMessage) {
        const currentMessageId = lastMessage.getAttribute('data-message-id');
        if (currentMessageId !== lastMessageId) {
          const element = lastMessage.querySelector(selector);
          if (element) {
            responseText = element.innerText;
            newMessageGenerated = true;
            lastMessageId = currentMessageId;
          }
        }
      }

      await sleep(10000);
      retries++;
    }

    if (!newMessageGenerated) {
      throw new Error("No se pudo obtener una nueva respuesta de ChatGPT en el tiempo esperado.");
    }

    return responseText;
  });

  session.lastActivity = Date.now();

  // Verificar si la respuesta contiene el mensaje de actividad inusual
  if (newResponse.includes("Unusual activity has been detected from your device. Try again later.")) {
    closeSession(token);
    throw new Error("Hubo un error, vuelve a intentarlo.");
  }

  return newResponse;
}

function closeSession(token) {
  const session = sessions[token];
  if (session) {
    session.browser.close();
    delete sessions[token];
    return { message: `Sesión con token ${token} cerrada` };
  } else {
    return { error: 'Sesión no encontrada' };
  }
}

function closeAllSessions() {
  for (const [token, session] of Object.entries(sessions)) {
    session.browser.close();
    delete sessions[token];
  }
  return { message: 'Todas las sesiones han sido cerradas' };
}

function checkInactiveSessions() {
  const now = Date.now();
  for (const [token, session] of Object.entries(sessions)) {
    if (now - session.lastActivity > 2.5 * 60 * 1000) {
      session.browser.close();
      delete sessions[token];
      console.log(`Sesión con token ${token} cerrada por inactividad.`);
    }
  }
}

setInterval(checkInactiveSessions, 60 * 1000);

module.exports = {
  initPuppeteer,
  sendMessageAndGetResponse,
  closeSession,
  closeAllSessions,
};
