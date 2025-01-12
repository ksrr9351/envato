const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3000;

// CAPTCHA details
const captchaServiceApiKey = '10c_82f5b3c91e3d992902e7e9945d582a38';
const siteKey = '6LesuRgaAAAAAFxNmY2JeyHfIUnCKGqMxOBTiMyk';
const pageUrl = 'https://ee.proseotools.us/stock-video';

// Middleware to log request headers
app.use((req, res, next) => {
    console.log('Request Headers:', req.headers);
    next();
});

// Middleware for parsing POST and JSON requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve the index.html file for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to solve CAPTCHA using 10Captcha
async function solveCaptcha() {
    try {
        // Step 1: Submit CAPTCHA solving request to 10Captcha
        const captchaRequestUrl = `https://ocr.10captcha.com/in.php?key=${captchaServiceApiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}`;
        const { data: captchaRequestResponse } = await axios.get(captchaRequestUrl);

        if (!captchaRequestResponse.includes('OK|')) {
            throw new Error('Failed to request CAPTCHA solving');
        }

        const captchaRequestId = captchaRequestResponse.split('|')[1];

        // Step 2: Poll for the solved CAPTCHA token
        const captchaResultUrl = `https://ocr.10captcha.com/res.php?key=${captchaServiceApiKey}&action=get&id=${captchaRequestId}`;
        let solvedCaptcha = null;

        for (let i = 0; i < 30; i++) { // Poll for up to 30 seconds
            const { data: captchaResultResponse } = await axios.get(captchaResultUrl);
            if (captchaResultResponse.includes('OK|')) {
                solvedCaptcha = captchaResultResponse.split('|')[1];
                break;
            }

            if (captchaResultResponse === 'CAPCHA_NOT_READY') {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
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

// Manual Proxy Route for all other GET requests
app.use('/stock-video', async (req, res) => {
    const targetURL = `https://ee.proseotools.us/stock-video${req.url}`;
    await fetchAndSendHTML(targetURL, req, res);
});

// Function to fetch HTML, handle CAPTCHA, and update URLs using Cheerio
async function fetchAndSendHTML(targetURL, req, res) {
    try {
        const cookies = process.env.COOKIE; // Get cookie from the .env file
        const response = await axios.get(targetURL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Cookie: 'PHPSESSID=d8459c555301d692614e1b8eabb802fa;',
            },
            withCredentials: true,
        });

        const $ = cheerio.load(response.data);

        // Check if CAPTCHA is present
        const captchaDetected = $('div.g-recaptcha').length > 0 || /captcha/i.test(response.data);
        if (captchaDetected) {
            console.log('CAPTCHA detected. Solving CAPTCHA...');

            // Solve CAPTCHA
            const solvedCaptchaToken = await solveCaptcha();

            // Resend the request with the solved CAPTCHA token
            const captchaBypassedResponse = await axios.post(
                targetURL,
                { 'g-recaptcha-response': solvedCaptchaToken },
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        Cookie: 'PHPSESSID=d8459c555301d692614e1b8eabb802fa;',
                    },
                }
            );

            return res.status(200).send(captchaBypassedResponse.data);
        }

        $('link[href], script[src], img[src]').each((_, element) => {
            const attr = element.tagName === 'link' ? 'href' : 'src';
            const url = $(element).attr(attr);

            if (url && url.startsWith('/') && !url.startsWith('http')) {
                $(element).attr(attr, `https://ee.proseotools.us${url}`);
            }
        });

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send($.html());
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send(`Failed to fetch content from Semrush: ${error.message}`);
    }
}

// New route to fetch JSON data
app.get('/elements-api/infrastructure_availability.json', async (req, res) => {
    try {
        const jsonResponse = await axios.get('https://ee.proseotools.us/elements-api/infrastructure_availability.json', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
        });
        res.json(jsonResponse.data);
    } catch (error) {
        console.error('Error fetching JSON data:', error.message);
        res.status(500).send(`Failed to fetch JSON data: ${error.message}`);
    }
});

// Route for POST requests to download_and_license.json
app.post('/elements-api/items/:itemId/download_and_license.json', async (req, res) => {
    const { itemId } = req.params;

    try {
        const targetURL = `https://ee.proseotools.us/elements-api/items/${itemId}/download_and_license.json`;

        const response = await axios.post(targetURL, req.body, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Cookie: 'PHPSESSID=d8459c555301d692614e1b8eabb802fa;',
                'Content-Type': 'application/json',
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching download and license data:', error.message);
        res.status(500).send(`Failed to fetch download and license data: ${error.message}`);
    }
});

// Redirect from the form action to the desired path
app.post('/manage', (req, res) => {
    res.redirect('/stock-video');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
