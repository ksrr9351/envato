const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// Define cookies as an object
const cookies = {
  km_lv: '1736486017',
  km_ai: 'zyju2pHgODD922AR0%2FzgVz%2FSO%2FU%3D',
  TawkConnectionTime: '0',
  PHPSESSID: 'd8459c555301d692614e1b8eabb802fa',
  km_ni: 'softwares%40nuformsocial.com',
  // Other cookies...
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Cookie': Object.keys(cookies).map(key => `${key}=${cookies[key]}`).join('; ')
};

// CAPTCHA details
const captchaServiceApiKey = '10c_82f5b3c91e3d992902e7e9945d582a38';
const siteKey = '6LesuRgaAAAAAFxNmY2JeyHfIUnCKGqMxOBTiMyk';
const pageUrl = 'https://ee.proseotools.us/stock-video';

// Function to solve CAPTCHA using 10Captcha
async function solveCaptcha() {
  try {
    const captchaRequestUrl = `https://ocr.10captcha.com/in.php?key=${captchaServiceApiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}`;
    const { data: captchaRequestResponse } = await axios.get(captchaRequestUrl);

    if (!captchaRequestResponse.includes('OK|')) {
      throw new Error('Failed to request CAPTCHA solving');
    }

    const captchaRequestId = captchaRequestResponse.split('|')[1];

    const captchaResultUrl = `https://ocr.10captcha.com/res.php?key=${captchaServiceApiKey}&action=get&id=${captchaRequestId}`;
    let solvedCaptcha = null;

    for (let i = 0; i < 30; i++) {
      const { data: captchaResultResponse } = await axios.get(captchaResultUrl);
      if (captchaResultResponse.includes('OK|')) {
        solvedCaptcha = captchaResultResponse.split('|')[1];
        break;
      }

      if (captchaResultResponse === 'CAPCHA_NOT_READY') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      } else {
        throw new Error('Error solving CAPTCHA: ' + captchaResultResponse);
      }
    }

    if (!solvedCaptcha) {
      throw new Error('Failed to solve CAPTCHA in time');
    }

    return solvedCaptcha;

  } catch (error) {
    console.error('Error solving CAPTCHA:', error.message);
    throw error;
  }
}

// Helper function to fetch and send HTML with fixed asset URLs
async function fetchAndSendHTML(targetURL, req, res) {
  try {
    const response = await axios.post(targetURL, null, { headers });
    const $ = cheerio.load(response.data);

    // Detect CAPTCHA in the response
    const captchaDetected = $('div.g-recaptcha').length > 0 || /captcha/i.test(response.data);

    if (captchaDetected) {
      console.log('CAPTCHA detected. Solving CAPTCHA...');
      // Solve CAPTCHA
      const solvedCaptchaToken = await solveCaptcha();

      // Add the solved CAPTCHA token to the headers
      headers['g-recaptcha-response'] = solvedCaptchaToken;

      // Retry fetching the page with the solved CAPTCHA token
      const captchaBypassedResponse = await axios.post(targetURL, null, { headers });

      const $captchaBypassed = cheerio.load(captchaBypassedResponse.data);
      
      // Fix relative URLs for assets
      $('link[href], script[src], img[src]').each((_, element) => {
        const attr = element.tagName === 'link' ? 'href' : 'src';
        const url = $(element).attr(attr);

        if (url && url.startsWith('/') && !url.startsWith('http')) {
          $(element).attr(attr, `https://ee.proseotools.us${url}`);
        }
      });

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send($.html());
    } else {
      // No CAPTCHA detected, just fix the URLs
      $('link[href], script[src], img[src]').each((_, element) => {
        const attr = element.tagName === 'link' ? 'href' : 'src';
        const url = $(element).attr(attr);

        if (url && url.startsWith('/') && !url.startsWith('http')) {
          $(element).attr(attr, `https://ee.proseotools.us${url}`);
        }
      });

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send($.html());
    }

  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).send(`Failed to fetch content from Semrush: ${error.message}`);
  }
}

// Use POST for handling form submission
app.use('/stock-video', async (req, res) => {
  const targetURL = `https://ee.proseotools.us/stock-video${req.url}`;
  await fetchAndSendHTML(targetURL, req, res);
});

// Redirect from the form action to the desired path (POST request)
app.post('/manage', (req, res) => {
  res.redirect('/stock-video');
});

// Serve the initial HTML form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
