const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const port = 3000;

// Middleware for parsing POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());  // Parse JSON bodies as well

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;'
};

// CAPTCHA details
const captchaServiceApiKey = '10c_82f5b3c91e3d992902e7e9945d582a38';
const siteKey = '6LesuRgaAAAAAFxNmY2JeyHfIUnCKGqMxOBTiMyk';
const pageUrl = 'https://ee.proseotools.us/';

// Function to solve CAPTCHA using 10Captcha
async function solveCaptcha() {
  try {
    // Step 1: Submit CAPTCHA solving request to 10Captcha
    const captchaRequestUrl = `https://ocr.10captcha.com/in.php?key=${captchaServiceApiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}`;
    console.log('Requesting CAPTCHA solving...');
    const { data: captchaRequestResponse } = await axios.get(captchaRequestUrl);

    if (!captchaRequestResponse.includes('OK|')) {
      throw new Error('Failed to request CAPTCHA solving');
    }

    const captchaRequestId = captchaRequestResponse.split('|')[1];
    console.log('Captcha Request ID:', captchaRequestId);

    // Step 2: Poll for the solved CAPTCHA token
    const captchaResultUrl = `https://ocr.10captcha.com/res.php?key=${captchaServiceApiKey}&action=get&id=${captchaRequestId}`;
    let solvedCaptcha = null;

    // Increased polling interval (10 seconds) and retry attempts (50 times)
    const pollingInterval = 10000; // 10 seconds
    const maxRetries = 100; // Increase retries

    for (let i = 0; i < maxRetries; i++) {
      const { data: captchaResultResponse } = await axios.get(captchaResultUrl);
      console.log('Captcha Result Response:', captchaResultResponse);

      if (captchaResultResponse.includes('OK|')) {
        solvedCaptcha = captchaResultResponse.split('|')[1];
        console.log('Solved Captcha Token:', solvedCaptcha);
        break;
      }

      if (captchaResultResponse === 'CAPCHA_NOT_READY') {
        console.log('Captcha not ready, retrying...');
        await new Promise(resolve => setTimeout(resolve, pollingInterval)); // Wait before retrying
      } else {
        console.error('Error solving CAPTCHA:', captchaResultResponse);
        throw new Error('Error solving CAPTCHA: ' + captchaResultResponse);
      }
    }

    if (!solvedCaptcha) {
      console.log('Failed to solve CAPTCHA after retries');
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
    res.status(500).send(`Failed to fetch content: ${error.message}`);
  }
}

app.use('/stock-video', async (req, res) => {
    const targetURL = `https://ee.proseotools.us/stock-video${req.url}`;

    try {
        const cookies = process.env.COOKIE;  // Get cookie from the .env file

        // Make the request to the target URL with the session cookie
        const response = await axios.get(targetURL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;'
            },
            withCredentials: true,
            maxRedirects: 0, // Prevent following redirects automatically
        });

        // Call the helper function to fetch HTML content and fix asset URLs
         await fetchAndSendHTML(targetURL, req, res);

    } catch (error) {
        if (error.response && error.response.status === 302 && error.response.headers.location.includes('/user/login.php')) {
            // If the response is a redirect to the login page, cookie is expired
            return res.status(401).send('Cookies have expired. Please renew them.');
        } else {
            console.error('Error fetching data:', error.message);
            res.status(500).send(`Failed to fetch content: ${error.message}`);
        }
    }
});

// New route to fetch JSON data with .json extension
app.get('/elements-api/infrastructure_availability.json', async (req, res) => {
  try {
    const jsonResponse = await axios.get('https://ee.proseotools.us/elements-api/infrastructure_availability.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    res.json(jsonResponse.data); // Send the JSON data back to the client
  } catch (error) {
    console.error('Error fetching JSON data:', error.message);
    res.status(500).send(`Failed to fetch JSON data: ${error.message}`);
  }
});

app.get('/data-api/modal/neue-download', async (req, res) => {
  const { itemId, languageCode, clientVersion, enrollments } = req.query;

  if (!itemId || !languageCode || !clientVersion || !enrollments) {
    return res.status(400).send("Missing required query parameters");
  }

  const targetURL = `https://ee.proseotools.us/data-api/modal/neue-download?type=neue-download&itemId=${itemId}&languageCode=${languageCode}&clientVersion=${clientVersion}&enrollments=${enrollments}`;

  try {
    const cookies = process.env.COOKIE;  // Get cookie from the .env file
    const apiResponse = await axios.get(targetURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;',
      },
      withCredentials: true,
    });

    res.json(apiResponse.data);  // Send the JSON response back to the client
  } catch (error) {
    console.error('Error fetching data from neue-download:', error.message);
    res.status(500).send(`Failed to fetch data from neue-download API: ${error.message}`);
  }
});

// New route to handle POST requests for download_and_license.json
app.post('/elements-api/items/:itemId/download_and_license.json', async (req, res) => {
  const { itemId } = req.params;

  try {
    // Extract CSRF tokens from the incoming request headers
    const csrfToken1 = req.headers['x-csrf-token'];
    const csrfToken2 = req.headers['x-csrf-token-2'];

    // Check if both CSRF tokens are present
    if (!csrfToken1 || !csrfToken2) {
      throw new Error('CSRF tokens not found in request headers');
    }

    // Get cookies from environment (already configured as per your existing code)
    const cookies = process.env.COOKIE;  // Get cookie from the .env file

    // Construct the target URL for the API call
    const targetURL = `https://ee.proseotools.us/elements-api/items/${itemId}/download_and_license.json`;

    // Making the POST request to the target API (with CSRF tokens from the request headers)
    const apiResponse = await axios.post(targetURL, req.body, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;',  // Ensure your session is valid
        'Content-Type': 'application/json',  // Ensure content type is set to JSON
        'x-csrf-token': csrfToken1,  // Use the CSRF token from the request header
        'x-csrf-token-2': csrfToken2,  // Use the second CSRF token from the request header
        'Referer': 'http://localhost:3000/stock-video',  // Add referer if necessary
        'Origin': 'http://localhost:3000'  // Ensure the origin is set correctly
      },
      withCredentials: true,
    }).catch(error => {
      // Log the full response for debugging
      console.error('API Request failed:', error.response ? error.response.data : error.message);
      throw error;  // Rethrow the error after logging it
    });

    // Send the response data back to the client
    res.json(apiResponse.data);
  } catch (error) {
    console.error('Error fetching download and license data:', error.message);

    // If the item is not found or another error occurs, return 404
    if (error.response && error.response.status === 404) {
      res.status(404).send('Item not found or invalid request.');
    } else {
      res.status(500).send(`Failed to fetch data: ${error.message}`);
    }
  }
});

// New route to handle POST requests to search-events-api
app.post('/search-events-api', async (req, res) => {
  try {
    const requestBody = req.body;  // Capture the POST data sent from the client
    const apiResponse = await axios.post('https://ee.proseotools.us/search-events-api/', requestBody, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',  // Make sure the content type is set for JSON
        // Optionally, you can add other headers here if needed
      },
    });

    res.json(apiResponse.data); // Send back the response from the external API to the client
  } catch (error) {
    console.error('Error posting to search-events-api:', error.message);
    res.status(500).send(`Failed to fetch content from search-events-api: ${error.message}`);
  }
});

// New route to handle the GET request for /_autosuggest with dynamic query parameters
app.get('/_autosuggest', async (req, res) => {
  const keyword = req.query.keyword;  // Extract the keyword query parameter from the request

  if (!keyword) {
    return res.status(400).send("Missing required 'keyword' query parameter.");
  }

  // Prepare the query parameters (without adding any extra ones like itemType unless necessary)
  const queryParams = new URLSearchParams(req.query).toString();  // This will include all query params from the request

  const targetURL = `https://ee.proseotools.us/_autosuggest?${queryParams}`;

  try {
    const response = await axios.get(targetURL, {
      headers: {
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      },
    });

    // Send back the JSON response from the external API
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from autosuggest API:', error.message);
    res.status(500).send(`Failed to fetch data from autosuggest API: ${error.message}`);
  }
});

app.get('/elements-api/items/:itemId.json', async (req, res) => {
  const { itemId } = req.params;  // Extract the itemId from the URL
  const language = req.query.language || 'en';  // Default language to 'en' if not provided

  // Construct the target URL for the external API
  const targetURL = `https://ee.proseotools.us/elements-api/items/${itemId}.json?language=${language}`;

  try {

    // Extract CSRF tokens from the incoming request headers
    const csrfToken3 = req.headers['x-csrf-token'];
    const csrfToken4 = req.headers['x-csrf-token-2'];

    // Check if both CSRF tokens are present
    if (!csrfToken3 || !csrfToken4) {
      throw new Error('CSRF tokens not found in request headers');
    }

    const response = await axios.get(targetURL, {
      headers: {
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'x-csrf-token': csrfToken3,  // Use the CSRF token from the request header
        'x-csrf-token-2': csrfToken4,  // Use the second CSRF token from the request header
      },
    });

    // Send the response data back to the client
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from elements-api:', error.message);
    res.status(500).send(`Failed to fetch data from elements-api: ${error.message}`);
  }
});

app.get('/data-api/page/item-detail-neue', async (req, res) => {
  const { path, languageCode, clientVersion, enrollments } = req.query;  // Extract query parameters

  // Construct the target URL for the external API
  const targetURL = `https://ee.proseotools.us/data-api/page/item-detail-neue?path=${encodeURIComponent(path)}&languageCode=${languageCode}&clientVersion=${clientVersion}&enrollments=${encodeURIComponent(enrollments)}`;

  try {
    const response = await axios.get(targetURL, {
      headers: {
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        Cookie: 'PHPSESSID=123f1ed0da2e5f8febb814ea54ed189d;',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      },
    });

    // Send the response data back to the client
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from data-api:', error.message);
    res.status(500).send(`Failed to fetch data from data-api: ${error.message}`);
  }
});

// Redirect from the form action to the desired path (POST request)
app.post('/manage', (req, res) => {
  res.redirect('/stock-video');
});

// Serve the index.html file for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
