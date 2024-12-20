const express = require('express');
const QRCode = require('qrcode');
const gifted = require('gifted-dls');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const figlet = require('figlet');  // برای استفاده از فونت‌های مختلف
const fg = require('api-dylux'); //
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;
const timeLimit = 7 * 24 * 60 * 60 * 1000; // مدت زمان یک هفته (میلی‌ثانیه)
const apiKeyFile = path.join(__dirname, 'apikeyall.json'); // مسیر فایل کلیدها

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
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
const checkUserLimit = (apikey) => {
    const apiKeyData = apiKeys[apikey];
    
    // اگر زمان بازنشانی گذشته باشد، مقدار `used` صفر می‌شود
    if (Date.now() - apiKeyData.lastReset > timeLimit) {
        apiKeyData.used = 0;
        apiKeyData.lastReset = Date.now();
    }

    return apiKeyData;
};

// مسیر بررسی وضعیت API
app.get('/api/checker', (req, res) => {
    const apikey = req.query.apikey;

    if (!apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            result: 'Invalid or missing API key.'
        });
    }

    const keyData = apiKeys[apikey];
    const remaining = keyData.limit - keyData.used;

    res.json({
        status: true,
        apikey,
        limit: keyData.limit,
        used: keyData.used,
        remaining,
        resetIn: '7 days'
    });
});
// مسیر ایجاد کلید جدید
// مسیر ایجاد کلید API جدید
app.get('/api/create-apikey', (req, res) => {
    const newKey = req.query.key;
    if (!newKey || apiKeys[newKey]) {
        return res.status(400).json({
            status: false,
            result: 'Invalid or duplicate key.'
        });
    }

    apiKeys[newKey] = { limit: 200, used: 0, lastReset: Date.now(), users: {} };
    saveApiKeys(apiKeys);

    res.json({
        status: true,
        result: 'New API key created.',
        newKey,
        limit: 200
    });
});

// مسیر تغییر محدودیت کلید API
app.get('/api/apikeychange/upto', (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست
    const newLimit = parseInt(req.query.limit); // دریافت محدودیت جدید از درخواست

    // بررسی مقدار ورودی
    if (!apikey || !apiKeys[apikey]) {
        return res.status(400).json({
            status: false,
            result: 'Invalid or missing API key.'
        });
    }

    if (!newLimit || isNaN(newLimit) || newLimit <= 0) {
        return res.status(400).json({
            status: false,
            result: 'Invalid limit value.'
        });
    }

    // به‌روزرسانی محدودیت کلید API
    apiKeys[apikey].limit = newLimit;
    saveApiKeys(apiKeys); // ذخیره تغییرات در فایل

    res.json({
        status: true,
        result: 'API key limit updated successfully.',
        apikey: apikey,
        newLimit: newLimit
    });
});
//DISABLE APIKEY
app.get('/api/apikeychange/disable', (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست

    // بررسی صحت کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(400).json(JSON.stringify({
            status: false,
            result: 'Invalid or missing API key.'
        }));
    }

    // غیرفعال کردن کلید API
    apiKeys[apikey].active = false;
    saveApiKeys(apiKeys); // ذخیره تغییرات در فایل

    res.json(JSON.stringify({
        status: true,
        result: `API key ${apikey} has been disabled.`,
        apikey
    }));
});

// فعال کردن مجدد کلید API
app.get('/api/apikeychange/enable', (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست

    // بررسی صحت کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(400).json(JSON.stringify({
            status: false,
            result: 'Invalid or missing API key.'
        }));
    }

    // فعال کردن مجدد کلید API
    apiKeys[apikey].active = true;
    saveApiKeys(apiKeys); // ذخیره تغییرات در فایل

    res.json(JSON.stringify({
        status: true,
        result: `API key ${apikey} has been enabled.`,
        apikey
    }));
});
// حذف کلید API
app.get('/api/apikeychange/delete', (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست

    // بررسی صحت کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(400).json(JSON.stringify({
            status: false,
            result: 'Invalid or missing API key.'
        }));
    }

    // حذف کلید API از سیستم
    delete apiKeys[apikey];
    saveApiKeys(apiKeys); // ذخیره تغییرات در فایل

    res.json(JSON.stringify({
        status: true,
        result: `API key ${apikey} has been deleted.`,
        apikey
    }));
});

// ریست کردن آمار کلید API
app.get('/api/apikeychange/reset', (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست

    // بررسی صحت کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(400).json(JSON.stringify({
            status: false,
            result: 'Invalid or missing API key.'
        }));
    }

    // ریست کردن آمار کلید API
    apiKeys[apikey].used = 0;
    apiKeys[apikey].lastReset = Date.now(); // زمان آخرین ریست را به‌روز می‌کند
    saveApiKeys(apiKeys); // ذخیره تغییرات در فایل

    res.json(JSON.stringify({
        status: true,
        result: `API key ${apikey} has been reset.`,
        apikey
    }));
});

// دانلود فایل apikeyall.json
app.get('/api/getsession2', (req, res) => {
    const filePath = path.join(__dirname, 'apikeyall.json'); // تعیین مسیر فایل
    res.download(filePath, 'apikeyall.json', (err) => {
        if (err) {
            res.status(500).json(JSON.stringify({
                status: false,
                result: 'Error downloading file.',
                error: err.result
            }));
        }
    });
});
// DOC API
app.get('/docs', (req, res) => {
    res.redirect('https://nothing-api-4n7g.onrender.com');
});
app.get('/doc', (req, res) => {
    res.redirect('https://nothing-api-4n7g.onrender.com');
});
// مسیر برای دریافت تمام API keyها
app.get('/api/checkallapikey/check', (req, res) => {
    try {
        // خواندن فایل و دریافت کلیدها
        const apiKeysData = JSON.parse(fs.readFileSync(apiKeyFile));

        // قالب‌بندی اطلاعات
        const allKeys = Object.entries(apiKeysData).map(([key, value]) => ({
            apikey: key,
            limit: value.limit,
            used: value.used,
            remaining: value.limit - value.used,
            lastReset: new Date(value.lastReset).toLocaleString()
        }));

        // ارسال پاسخ به صورت مرتب شده
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: allKeys
        }, null, 4)); // مرتب کردن JSON با فاصله 4
    } catch (err) {
        res.status(500).json({
            status: false,
            result: 'Error reading API keys file.',
            error: err.message
        });
    }
});
//YT DL
app.get('/api/downloader/yt', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست
    const videoUrl = req.query.url; // دریافت URL ویدیو از درخواست

    // بررسی وجود کلید API در لیست
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت‌های کاربر

    // بررسی استفاده از محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی عدم ارسال URL ویدیو
    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            message: 'No YouTube video URL provided.'
        });
    }

    // افزایش مقدار `used` برای کلید و ذخیره‌سازی
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // استفاده از کتابخانه api-dylux برای دانلود ویدیو
        const data = await fg.ytv(videoUrl);

        if (!data || !data.title || !data.link) {
            return res.status(500).json({
                status: false,
                message: 'Error fetching YouTube video details.'
            });
        }

        // ساختار JSON خروجی
        const video = {
            type: "video",
            apikey: apikey, // کلید API
            title: data.title || 'No Title Available',
            download_url: data.link
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Your-Name',
            result: [video]
        }, null, 4)); // مرتب کردن JSON با فاصله 4

    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error processing request.',
            error: err.message
        });
    }
});
//FBDL
app.get('/api/downloader/fbdl', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API از درخواست
    const videoUrl = req.query.url; // دریافت URL ویدیو از درخواست

    // بررسی وجود کلید API در لیست
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت‌های کاربر

    // بررسی استفاده از محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی عدم ارسال URL ویدیو
    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            message: 'No Facebook video URL provided.'
        });
    }

    // افزایش مقدار `used` برای کلید و ذخیره‌سازی
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به API فیسبوک
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/fbdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data;

        if (!data.status || !data.links || data.links.length === 0) {
            return res.status(500).json({
                status: false,
                message: 'Error fetching Facebook video details.'
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
            type: "video",
            apikey: apikey, // کلید API
            title: data.title || 'No Title Available',
            download_url: tinyUrls
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [video]
        }, null, 4)); // مرتب کردن JSON با فاصله 4

    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error processing request.',
            error: err.message
        });
    }
});
//TINYURL CODE
app.get('/api/tools/tinyurl', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const url = req.query.url; // URL اصلی

    // بررسی کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت کاربر

    // بررسی محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی ارسال URL
    if (!url) {
        return res.status(400).json({
            status: false,
            message: 'No URL provided.'
        });
    }

    // افزایش مقدار مصرف کلید
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به TinyURL
        const tinyUrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const tinyUrl = tinyUrlResponse.data;

        // ساختار JSON خروجی
        const result = {
            type: "tinyurl",
            apikey: apikey,
            tiny_url: tinyUrl,
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [result]
        }, null, 4)); // JSON مرتب با فاصله 4
    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error creating TinyURL.',
            error: err.message
        });
    }
});
//SHORT URL
app.get('/api/tools/shorturl', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const url = req.query.url; // URL اصلی

    // بررسی کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت کاربر

    // بررسی محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی ارسال URL
    if (!url) {
        return res.status(400).json({
            status: false,
            message: 'No URL provided.'
        });
    }

    // افزایش مقدار مصرف کلید
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به ShortURL
        const response = await axios.post('https://www.shorturl.at/shortener.php', null, {
            params: { url: url }
        });
        const shortUrl = response.data || 'Shortening failed';

        // ساختار JSON خروجی
        const result = {
            type: "shorturl",
            apikey: apikey,
            short_url: shortUrl,
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: [result]
        }, null, 4)); // JSON مرتب با فاصله 4
    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error creating ShortURL.',
            error: err.message
        });
    }
});
//INGDL
app.get('/api/downloader/ingdl', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const videoUrl = req.query.url; // دریافت URL ویدیو

    // بررسی کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت‌های کاربر

    // بررسی استفاده از محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی عدم ارسال URL
    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            message: 'No Instagram video URL provided.'
        });
    }

    // افزایش مقدار `used` و ذخیره‌سازی
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به API اینستاگرام
        const response = await axios.get(`https://bk9.fun/download/instagram?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data;

        if (!data.status || !data.BK9 || data.BK9.length === 0) {
            return res.status(500).json({
                status: false,
                message: 'Error fetching Instagram video details.'
            });
        }

        // پیدا کردن لینک thumbnail (jpg) و لینک mp4
        const thumbnailLink = data.BK9.find((item) => item.type === 'jpg')?.url || null;
        const mp4Link = data.BK9.find((item) => item.type === 'mp4')?.url || null;

        if (!thumbnailLink || !mp4Link) {
            return res.status(500).json({
                status: false,
                message: 'Thumbnail or MP4 link not available.'
            });
        }

        // کوتاه کردن لینک‌ها با TinyURL
        const shortThumbnailLink = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(thumbnailLink)}`);
        const shortMp4Link = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(mp4Link)}`);

        // ساختار JSON خروجی
        const result = {
            type: "video",
            apikey: apikey, // کلید API
            thumbnail: shortThumbnailLink.data || thumbnailLink,
            download_url: shortMp4Link.data || mp4Link
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: result
        }, null, 4)); // مرتب کردن JSON با فاصله 4

    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error processing request.',
            error: err.message
        });
    }
});
//YTMP4 YOUTUBE
app.get('/api/downloader/ytmp4', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const videoUrl = req.query.url; // دریافت URL ویدیو

    // بررسی کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت مصرف کاربر

    // بررسی محدودیت مصرف
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی ارسال URL
    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            message: 'No YouTube video URL provided.'
        });
    }

    // افزایش مقدار `used` برای کاربر
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به API
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/ytdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data.response;

        // بررسی داده‌های API
        if (!data || !data.mp4) {
            return res.status(500).json({
                status: false,
                message: 'Error fetching MP4 download URL.'
            });
        }

        // کوتاه کردن لینک MP4
        const tinyMp4UrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(data.mp4)}`);
        const mp4DownloadUrl = tinyMp4UrlResponse.data || data.mp4;

        // ساختار JSON خروجی
        const video = {
            type: "video",
            apikey: apikey, // کلید API
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
            result: [video] // ارسال یک آرایه که شامل اطلاعات ویدیو است
        }, null, 4)); // مرتب کردن JSON با فاصله 4

    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error processing your request.',
            error: err.message
        });
    }
});
//YTMP3 YOUTUBE
app.get('/api/downloader/ytmp3', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const videoUrl = req.query.url; // دریافت URL ویدیو

    // بررسی کلید API
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            message: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey); // بررسی محدودیت مصرف کاربر

    // بررسی محدودیت مصرف
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            message: 'API key usage limit exceeded.'
        });
    }

    // بررسی ارسال URL
    if (!videoUrl) {
        return res.status(400).json({
            status: false,
            message: 'No YouTube video URL provided.'
        });
    }

    // افزایش مقدار `used` برای کاربر
    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        // ارسال درخواست به API
        const response = await axios.get(`https://api-pink-venom.vercel.app/api/ytdl?url=${encodeURIComponent(videoUrl)}`);
        const data = response.data.response;

        // بررسی داده‌های API
        if (!data || !data.mp3) {
            return res.status(500).json({
                status: false,
                message: 'Error fetching MP3 download URL.'
            });
        }

        // استفاده از TinyURL برای کوتاه‌کردن لینک
        const tinyUrlResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(data.mp3)}`);
        const tinyUrl = tinyUrlResponse.data;

        // ساختار JSON خروجی
        const video = {
            type: "audio",
            apikey: apikey, // کلید API
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
            result: [video] // ارسال یک آرایه که شامل جزئیات MP3 است
        }, null, 4)); // مرتب کردن JSON با فاصله 4

    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error processing your request.',
            error: err.message
        });
    }
});
/// SEARCH YOUTUBE API with API key validation and user limit check
app.get('/api/downloader/ytsearch', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const query = req.query.text; // دریافت متن جستجو

    // بررسی کلید API و محدودیت‌های آن
    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey);

    // بررسی استفاده از محدودیت
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Limit exceeded for this key.'
        });
    }

    // بررسی عدم ارسال query
    if (!query) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No search query provided.'
        });
    }

    // افزایش مقدار `used` و ذخیره‌سازی
    keyData.used += 1;
    saveApiKeys(apiKeys); // ذخیره وضعیت کلیدها

    try {
        // جستجوی ویدیوها در یوتیوب
        const results = await ytSearch(query);
        const videos = results.videos
            .sort((a, b) => b.views - a.views) // مرتب‌سازی بر اساس تعداد بازدید
            .slice(0, 9) // انتخاب 3 نتیجه اول
            .map(video => ({
                type: "video",
                apikey: apikey, // کلید API
                videoId: video.videoId,
                url: video.url,
                title: video.title,
                description: video.description || "", // توضیحات ویدیو
                image: video.thumbnail, // لینک تصویر بندانگشتی
                thumbnail: video.thumbnail, // لینک تصویر بندانگشتی
                seconds: video.duration.seconds || 0, // مدت زمان بر حسب ثانیه
                timestamp: video.duration.timestamp || "0:00", // مدت زمان در قالب hh:mm:ss
                duration: video.duration, // شیء مدت زمان
                ago: video.ago, // تاریخ انتشار (مثلاً "1 year ago")
                views: video.views, // تعداد بازدید
                author: {
                    name: video.author.name, // نام کانال
                    url: video.author.url // لینک کانال
                }
            }));

        // ارسال JSON مرتب‌شده
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            status: true,
            creator: 'Nothing-Ben',
            result: videos
        }, null, 4)); // JSON با فاصله 4
    } catch (err) {
        res.status(500).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Error fetching YouTube search API',
            error: err.message
        });
    }
});
// فرض کنید اینجا مجموعه‌ای از فونت‌ها را داریم
const fonts = [
    'Standard', 'Slant', '3x5', 'Big', 'Banner', 'Block', 'Doom', 'Lean', 'Mirror', 'Small',
    'Thinkertoy', 'Star Wars', 'Twisted', 'Term', 'Big Money-ne', 'Script', 'Slant', 'Ghost',
    'Shadow', 'Isometric1', 'Isometric2', 'Isometric3', 'Speed', 'ANSI_Shadow', 'Big Chief',
    'Caligraphy', 'DOS_Rebel', 'Unicode', 'Bubble', 'Cyberlarge', 'Double', 'Bigfig', 'Small',
    'Alphabet', 'Poison', 'Wavy', 'DotMatrix', 'Runic', 'Larry3D', 'Sub-Zero', 'Elite', 'ASCII',
    'Double-Short', 'Tiny', 'Straight', 'King', 'Fancy', 'Swanky', 'Blocky', 'Killer', 'Letter',
    'Sharp', 'Star Wars', 'Future'
];

// تبدیل متن به فونت‌های مختلف با استفاده از figlet
function convertTextToFonts(text) {
    const result = {};
    fonts.forEach(font => {
        figlet.text(text, { font: font }, (err, transformedText) => {
            if (err) {
                result[font] = 'Error';
            } else {
                result[font] = transformedText;
            }
        });
    });
    return result;
}

app.get('/api/tools/font-txt', (req, res) => {
    const apikey = req.query.apikey;
    const text = req.query.text;

    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey);

    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'Limit exceeded for this key.'
        });
    }

    if (!text) {
        return res.status(400).json({
            status: false,
            creator: 'Nothing-Ben',
            result: 'No text provided.'
        });
    }

    keyData.used += 1;
    saveApiKeys(apiKeys);

    const fontsOutput = convertTextToFonts(text);

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        status: true,
        creator: 'Nothing-Ben',
        result: {
            type: "font",
            apikey: apikey,
            fonts: fontsOutput
        }
    }, null, 4));
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
//QR CODE MAKER
app.get('/api/tools/qrcode', async (req, res) => {
    const apikey = req.query.apikey; // دریافت کلید API
    const text = req.query.text; // متن برای تولید QR Code

    if (!apikey || !apiKeys[apikey]) {
        return res.status(401).json({
            status: false,
            result: 'Invalid or missing API key.'
        });
    }

    const keyData = checkUserLimit(apikey);
    if (keyData.used >= keyData.limit) {
        return res.status(403).json({
            status: false,
            result: 'API key usage limit exceeded.'
        });
    }

    if (!text) {
        return res.status(400).json({
            status: false,
            result: 'No text provided.'
        });
    }

    keyData.used += 1;
    saveApiKeys(apiKeys);

    try {
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
        
        // درخواست تصویر QR Code
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // ارسال تصویر
        res.setHeader('Content-Type', 'image/png');
        res.send(response.data);
    } catch (err) {
        res.status(500).json({
            status: false,
            message: 'Error generating QR code.',
            error: err.message
        });
    }
});
// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
