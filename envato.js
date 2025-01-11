const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS'],  // Allow preflight (OPTIONS) requests
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'], // Allow custom headers
    credentials: true
}));

// Middleware for parsing POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());  // Parse JSON bodies as well

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
        const cookies = process.env.COOKIE;  // Get cookie from the .env file
        const response = await axios.get(targetURL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Cookie: 'amember_nr=c16a1c8d0249cdca7aa20fee053971ba; _gid=GA1.2.16665271.1736483966; _token=69867cf030dcc3ff461bea055b988460; mutiny.user.token=f032a51e-b4af-439d-b916-1f83d74149d9; kvcd=1736486017349; km_ai=zyju2pHgODD922AR0%2FzgVz%2FSO%2FU%3D; km_lv=1736486017; _gcl_au=1.1.786931672.1736486020; km_ni=softwares%40nuformsocial.com; mp_0f47aae0dbedc03b9054b3be104ea557_mixpanel=%7B%22distinct_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22%24device_id%22%3A%20%221944ea1dd30f69-0b309cd56d6e6b-26011851-144000-1944ea1dd31f69%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fub.proseotools.us%2F%22%2C%22%24initial_referring_domain%22%3A%20%22ub.proseotools.us%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22user_backend_ID%22%3A%20%2227ba28a4-ac70-4641-b7e3-2166841d7b74%22%7D; PHPSESSID=657402bd4acafebb8b717125c02ad384; _ga_HHWB9TFDN8=GS1.1.1736582376.7.1.1736582399.0.0.0; _ga=GA1.1.1097930918.1736261663; original_landing_page_url=https://ee.proseotools.us/; twk_idm_key=XrOyhKWPZqSss7D6C6YX_; TawkConnectionTime=0; _dd_s=rum=0&expire=1736587469611; _ga_WWQGS71330=GS1.1.1736582424.1.1.1736586569.0.0.0'
            },
        });

        const $ = cheerio.load(response.data);

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
                'Cookie': 'amember_nr=c16a1c8d0249cdca7aa20fee053971ba; _gid=GA1.2.16665271.1736483966; _token=69867cf030dcc3ff461bea055b988460; mutiny.user.token=f032a51e-b4af-439d-b916-1f83d74149d9; kvcd=1736486017349; km_ai=zyju2pHgODD922AR0%2FzgVz%2FSO%2FU%3D; km_lv=1736486017; _gcl_au=1.1.786931672.1736486020; km_ni=softwares%40nuformsocial.com; mp_0f47aae0dbedc03b9054b3be104ea557_mixpanel=%7B%22distinct_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22%24device_id%22%3A%20%221944ea1dd30f69-0b309cd56d6e6b-26011851-144000-1944ea1dd31f69%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fub.proseotools.us%2F%22%2C%22%24initial_referring_domain%22%3A%20%22ub.proseotools.us%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22user_backend_ID%22%3A%20%2227ba28a4-ac70-4641-b7e3-2166841d7b74%22%7D; PHPSESSID=657402bd4acafebb8b717125c02ad384; _ga_HHWB9TFDN8=GS1.1.1736582376.7.1.1736582399.0.0.0; _ga=GA1.1.1097930918.1736261663; original_landing_page_url=https://ee.proseotools.us/; twk_idm_key=XrOyhKWPZqSss7D6C6YX_; TawkConnectionTime=0; _dd_s=rum=0&expire=1736587469611; _ga_WWQGS71330=GS1.1.1736582424.1.1.1736586569.0.0.0',
                'If-None-Match': 'W/"ef2-4cczprVrK4JPv5uA6WpdwYZkUGU"',
                'Referer': 'https://ee.proseotools.us/stock-video',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-csrf-token-2': 'NWgzw4rDlQzDpAHDuW3DtVTCoBdrFsKkMwXCvFXDrTUedCMuw45ow4dhwoTCp8O4V8KrwpUywrnCkBxswq9gwoQMOMKNw4XDosKDZGZ2w4tWwocZw4nCkQ_DlMKwwo8',  // Ensure you include the CSRF token here
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
        const cookies = process.env.COOKIE;  // Get cookie from the .env file
        // Construct the target URL for the API call
        const targetURL = `https://ee.proseotools.us/elements-api/items/${itemId}/download_and_license.json`;

        

        // Making the POST request to the target API (if needed)
        const apiResponse = await axios.post(targetURL, req.body, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Cookie': 'amember_nr=c16a1c8d0249cdca7aa20fee053971ba; _gid=GA1.2.16665271.1736483966; _token=69867cf030dcc3ff461bea055b988460; mutiny.user.token=f032a51e-b4af-439d-b916-1f83d74149d9; kvcd=1736486017349; km_ai=zyju2pHgODD922AR0%2FzgVz%2FSO%2FU%3D; km_lv=1736486017; _gcl_au=1.1.786931672.1736486020; km_ni=softwares%40nuformsocial.com; mp_0f47aae0dbedc03b9054b3be104ea557_mixpanel=%7B%22distinct_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22%24device_id%22%3A%20%221944ea1dd30f69-0b309cd56d6e6b-26011851-144000-1944ea1dd31f69%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fub.proseotools.us%2F%22%2C%22%24initial_referring_domain%22%3A%20%22ub.proseotools.us%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22softwares%40nuformsocial.com%22%2C%22user_backend_ID%22%3A%20%2227ba28a4-ac70-4641-b7e3-2166841d7b74%22%7D; PHPSESSID=657402bd4acafebb8b717125c02ad384; _ga_HHWB9TFDN8=GS1.1.1736582376.7.1.1736582399.0.0.0; _ga=GA1.1.1097930918.1736261663; original_landing_page_url=https://ee.proseotools.us/; twk_idm_key=XrOyhKWPZqSss7D6C6YX_; TawkConnectionTime=0; _dd_s=rum=0&expire=1736587469611; _ga_WWQGS71330=GS1.1.1736582424.1.1.1736586569.0.0.0',
                'Content-Type': 'application/json', // Make sure the content type is set for JSON
                'x-csrf-token': 'YfbKo3aqukKgBtCAhWGTv3_0h8VpT0nRVH4lMCLERoP5pUR9-z9POCpZga3uKejYrUKEBaaZbF7-htSxkRVnZw',
                'x-csrf-token-2': 'w7VxwqrDtMKhXz3CoUxiw7oXwqzDk2QVw4LDnTdHWUdtd0zCu8KdOnXDlS_DqmfDocOOwpXDoWFgMMKpY8KgI8KIw4g3wo7CowzCscKfasOcwpM_wr_CgXplEsOGw77DoQ'
            }
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



// Redirect from the form action to the desired path
app.post('/manage', (req, res) => {
    res.redirect('/stock-video');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
