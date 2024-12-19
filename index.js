/*const express = require('express');
const path = require('path');
const ytSearch = require('yt-search');
const QRCode = require('qrcode');
const gifted = require('gifted-dls');
const axios = require('axios');
const ytdl = require('ytdl-core');
const app = express();
const port = process.env.PORT || 8080;

// ارائه فایل index.html به‌عنوان صفحه پیش‌فرض
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FONT TEXT API STYLE
const fontStyles = {
    Bold: text => text.toUpperCase(),
    Italic: text => text.split('').map(c => c + '̶').join(''),
    Fancy: text => text.split('').map(c => '✦' + c + '✦').join('')
};

// FONT TEXT API
app.get('/api/maker/font-txt', async (req, res) => {
    const text = req.query.text;
    if (!text) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No text provided'
        });
    }

    const convertedFonts = {};

    // اضافه کردن فونت‌های پیش‌فرض
    Object.keys(fontStyles).forEach(fontName => {
        convertedFonts[fontName] = fontStyles[fontName](text);
    });

    // اضافه کردن فونت‌های ASCII با استفاده از figlet
    try {
        const figlet = require('figlet');
        const fonts = await new Promise((resolve, reject) => {
            figlet.fonts((err, fontsList) => {
                if (err) reject(err);
                else resolve(fontsList);
            });
        });

        fonts.slice(0, 50).forEach(fontName => {
            try {
                convertedFonts[fontName] = figlet.textSync(text, { font: fontName });
            } catch (err) {
                console.log(`Error with font ${fontName}: ${err.message}`);
            }
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error loading fonts',
            error: err.message
        });
    }

    // ارسال نتیجه
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        status: true,
        creator: 'Nothing-Ben',
        result: convertedFonts
    }, null, 3)); // مرتب کردن JSON با فاصله 4
});

// SEARCH YOUTUBE API
app.get('/api/downloader/ytsearch', async (req, res) => {
    const query = req.query.text;
    if (!query) {
        return res.status(400).json({ status: false, message: 'No search query provided' });
    }

    try {
        const results = await ytSearch(query);
        const videos = results.videos
            .sort((a, b) => b.views - a.views)
            .slice(0, 3)
            .map(video => ({
                type: "video",
                videoId: video.videoId,
                url: video.url,
                title: video.title,
                thumbnail: video.thumbnail,
                timestamp: video.duration.timestamp || "0:00",
                views: video.views,
                author: video.author.name
            }));

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: videos
        }, null, 3)); // مرتب کردن JSON با فاصله 4
    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error fetching YouTube search API',
            error: err.message
        });
    }
});
// YT to MP4 Downloader API
app.get('/api/downloader/ytmp4', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No YouTube video URL provided'
        });
    }

    try {
        // ارسال درخواست به API
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/ytdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data.response;

        // بررسی داده‌های API
        if (!data || !data.mp4) {
            return res.status(500).json({
                status: false,
                creator: 'Nothing-Ben',
                result: 'Error fetching MP4 download URL'
            });
        }

        // کوتاه کردن لینک MP4
        const tinyMp4UrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(data.mp4)}`);
        const mp4DownloadUrl = tinyMp4UrlResponse.data || data.mp4;

        // ساختار JSON خروجی
        const video = {
            type: "video",
            quality: "480p", // کیفیت پیش‌فرض
            title: data.title || 'No Title Available',
            description: data.description || 'No Description Available',
            duration: data.duration || 'Unknown',
            views: data.views || 'Unknown',
            channel: {
                name: data.name || 'Unknown',
                url: data.channel || 'No Channel URL Available'
            },
            url: videoUrl,
            thumbnail: data.thumbnail || 'No Thumbnail Available',
            download_url: mp4DownloadUrl // لینک کوتاه‌شده
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [video]
        }, null, 3));

    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error processing request',
            error: err.message
        });
    }
});
// YT to MP3 Downloader API
app.get('/api/downloader/ytmp3', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No YouTube video URL provided'
        });
    }

    try {
        // ارسال درخواست به API
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/ytdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data.response;

        // بررسی داده‌های API
        if (!data || !data.mp3) {
            return res.status(500).json({
                status: false,
                creator: 'Nothing-Ben',
                result: 'Error fetching MP3 download URL'
            });
        }

        // استفاده از TinyURL برای کوتاه‌کردن لینک
        const tinyUrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(data.mp3)}`);
        const tinyUrl = tinyUrlResponse.data;

        // ساختار JSON خروجی
        const video = {
            type: "audio",
            quality: "320kbps",
            title: data.title || 'No Title Available',
            duration: data.duration || 'Unknown',
            thumbnail: data.thumbnail || 'No Thumbnail Available',
            download_url: tinyUrl || data.mp3
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [video]  // ارسال یک آرایه که شامل یک ویدیو است
        }, null, 3)); // مرتب کردن JSON با فاصله 3

    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error processing your request',
            error: err.message
        });
    }
});
// FBDL Video Downloader API
app.get('/api/downloader/fbdl', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No Facebook video URL provided'
        });
    }

    try {
        // ارسال درخواست به API فیسبوک
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/fbdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data;

        if (!data.status || !data.links || data.links.length === 0) {
            return res.status(500).json({
                status: false,
                creator: 'Nothing-Ben',
                result: 'Error fetching Facebook video details'
            });
        }

        // کوتاه کردن لینک‌ها با TinyURL
        const tinyUrls = await Promise.all(data.links.map(async (link) => {
            const tinyUrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(link.url)}`);
            return {
                quality: link.quality,
                download_url: tinyUrlResponse.data || link.url
            };
        }));

        // ساختار JSON خروجی
        const video = {
            title: data.title || 'No Title Available',
            download_url: tinyUrls
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [video]
        }, null, 3));

    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error processing request',
            error: err.message
        });
    }
});
// Instagram Downloader API
app.get('/api/downloader/ingdl', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No Instagram video URL provided'
        });
    }

    try {
        // ارسال درخواست به API Instagram
        const response = await axios.get(`https://bk9.fun/download/instagram?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data;

        if (!data.status || !data.BK9 || data.BK9.length === 0) {
            return res.status(500).json({
                status: false,
                creator: 'Nothing-Ben',
                result: 'Error fetching Instagram video details'
            });
        }

        // پیدا کردن لینک thumbnail (jpg) و لینک mp4
        const thumbnailLink = data.BK9.find((item) => item.type === 'jpg')?.url || null;
        const mp4Link = data.BK9.find((item) => item.type === 'mp4')?.url || null;

        if (!thumbnailLink || !mp4Link) {
            return res.status(500).json({
                status: false,
                creator: 'Nothing-Ben',
                result: 'Thumbnail or MP4 link not available'
            });
        }

        // کوتاه کردن لینک thumbnail و mp4 با TinyURL
        const shortThumbnailLink = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(thumbnailLink)}`);
        const shortMp4Link = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(mp4Link)}`);

        // ساختار JSON خروجی
        const result = {
            thumbnail: shortThumbnailLink.data || thumbnailLink,
            download_url: shortMp4Link.data || mp4Link
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: result
        }, null, 3));

    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error processing request',
            error: err.message
        });
    }
});
// QR CODE API
app.get('/api/maker/qrcode', async (req, res) => {
    const text = req.query.text;
    if (!text) {
        return res.status(400).json({ status: false, message: 'No text provided' });
    }

    try {
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
        const tinyUrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(apiUrl)}`);

        if (tinyUrlResponse.data) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                status: true,
                creator: 'Nothing-Ben',
                result: {
                    type: "qrcode",
                    download_url: tinyUrlResponse.data
                }
            }, null, 3)); // مرتب کردن JSON با فاصله 4
        } else {
            throw new Error('TinyURL API response error');
        }
    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error generating QR code',
            error: err.message
        });
    }
});

// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
*/
const express = require('express');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

const timeLimit = 7 * 24 * 60 * 60 * 1000; // مدت زمان یک هفته (میلی‌ثانیه)
const apiKeyFile = path.join(__dirname, 'apikeyall.json'); // مسیر فایل کلیدها

// کلید پیش‌فرض
const defaultKey = {
    "nothing-api": { limit: 100000000, used: 0, lastReset: Date.now() }
};

// بارگذاری کلیدها از فایل
const loadApiKeys = () => {
    if (!fs.existsSync(apiKeyFile)) {
        fs.writeFileSync(apiKeyFile, JSON.stringify(defaultKey, null, 2)); // ایجاد فایل در صورت عدم وجود
    }
    return JSON.parse(fs.readFileSync(apiKeyFile));
};

// ذخیره کلیدها در فایل
const saveApiKeys = (apiKeys) => {
    fs.writeFileSync(apiKeyFile, JSON.stringify(apiKeys, null, 2));
};

let apiKeys = loadApiKeys();

// تابع بررسی یا ایجاد وضعیت برای کاربر
const checkUserLimit = (apikey, ip) => {
    if (!apiKeys[apikey].users) apiKeys[apikey].users = {};
    if (!apiKeys[apikey].users[ip]) {
        apiKeys[apikey].users[ip] = { used: 0, lastUsed: Date.now() };
    }

    // بازنشانی درخواست‌ها اگر بیشتر از یک هفته گذشته باشد
    if (apikey !== "nothing-api" && Date.now() - apiKeys[apikey].users[ip].lastUsed > timeLimit) {
        apiKeys[apikey].users[ip].used = 0;
        apiKeys[apikey].users[ip].lastUsed = Date.now();
    }

    return apiKeys[apikey].users[ip];
};

// مسیر بررسی وضعیت API
app.get('/api/checker', (req, res) => {
    const apikey = req.query.apikey || "nothing-api"; // استفاده از کلید پیش‌فرض
    const ip = req.ip;

    if (!apiKeys[apikey]) {
        return res.status(401).json({ status: false, message: 'Invalid or missing API key.' });
    }

    const keyData = apiKeys[apikey];
    const userStatus = checkUserLimit(apikey, ip);

    const remaining = keyData.limit - userStatus.used;
    const timeLeft = Math.max(0, timeLimit - (Date.now() - userStatus.lastUsed));

    res.json({
        status: true,
        apikey,
        limit: keyData.limit,
        used: userStatus.used,
        remaining,
        resetIn: `${Math.ceil(timeLeft / (60 * 1000))} minutes`
    });
});

// مسیر ایجاد کلید جدید
app.get('/api/create-apikey', (req, res) => {
    const newKey = req.query.key;
    if (!newKey || apiKeys[newKey]) {
        return res.status(400).json({ status: false, message: 'Invalid or duplicate key.' });
    }

    apiKeys[newKey] = { limit: 200, used: 0, lastReset: Date.now(), users: {} };
    saveApiKeys(apiKeys);

    res.json({ status: true, message: 'New API key created.', newKey, limit: 200 });
});
// مسیر برای دانلود فایل index.js
app.get('/api/getsession2', (req, res) => {
    const filePath = path.join(__dirname, 'apikeyall.json');
    res.download(filePath, 'apikeyall.json', (err) => {
        if (err) {
            res.status(500).json({ status: false, message: 'Error downloading file.', error: err.message });
        }
    });
});
// مسیر جستجو در یوتیوب
app.get('/api/downloader/ytsearch', async (req, res) => {
    const apikey = req.query.apikey || "nothing-api"; // استفاده از کلید پیش‌فرض
    const query = req.query.text;
    const ip = req.ip;

    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({ status: false, message: 'Invalid or missing API key.' });
    }

    const keyData = apiKeys[apikey];
    const userStatus = checkUserLimit(apikey, ip);

    if (userStatus.used >= keyData.limit) {
        return res.status(403).json({ status: false, message: 'Limit exceeded for this key.' });
    }

    if (!query) {
        return res.status(400).json({ status: false, message: 'No search query provided.' });
    }

    userStatus.used += 1;
    saveApiKeys(apiKeys); // ذخیره وضعیت کلیدها

    try {
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 3).map(video => ({
            videoId: video.videoId,
            url: video.url,
            title: video.title,
            thumbnail: video.thumbnail,
            views: video.views
        }));
        res.json({ status: true, result: videos });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Error fetching videos.', error: err.message });
    }
});

// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
