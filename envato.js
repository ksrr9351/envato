const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3000;

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

// Manual Proxy Route for all other GET requests
app.use('/stock-video', async (req, res) => {
    const targetURL = `https://ee.proseotools.us/stock-video${req.url}`;
    await fetchAndSendHTML(targetURL, req, res);
});

// Function to fetch HTML and update URLs using Cheerio
async function fetchAndSendHTML(targetURL, req, res) {
    try {
        const cookies = process.env.COOKIE; // Get cookie from the .env file
        const response = await axios.get(targetURL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Cookie: 'PHPSESSID=72e3cdb3399e8a9394461c7d46770bc2;',
            },
            withCredentials: true,
        });

        const $ = cheerio.load(response.data);

        // Check if CAPTCHA is present
        const captchaDetected = $('div.g-recaptcha').length > 0 || /captcha/i.test(response.data);
        if (captchaDetected) {
            return res.status(400).json({
                message: 'CAPTCHA challenge detected. Please solve the CAPTCHA manually.',
                captcha: true,
            });
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

// New route to fetch data from neue-download API
app.get('/data-api/modal/neue-download', async (req, res) => {
    const { itemId, languageCode, clientVersion, enrollments } = req.query;

    if (!itemId || !languageCode || !clientVersion || !enrollments) {
        return res.status(400).send('Missing required query parameters');
    }

    const targetURL = `https://ee.proseotools.us/data-api/modal/neue-download?type=neue-download&itemId=${itemId}&languageCode=${languageCode}&clientVersion=${clientVersion}&enrollments=${enrollments}`;

    try {
        const response = await axios.get(targetURL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
                Cookie: 'PHPSESSID=72e3cdb3399e8a9394461c7d46770bc2;',
                'Accept': 'application/json',
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching neue-download data:', error.message);
        res.status(500).send(`Failed to fetch neue-download data: ${error.message}`);
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
                Cookie: 'PHPSESSID=72e3cdb3399e8a9394461c7d46770bc2;',
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
