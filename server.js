const fastify = require('fastify')();
const crypto = require('crypto');
const admin = require('firebase-admin');

fastify.register(require('@fastify/url-data'));

// กำหนดค่าการเชื่อมต่อ Firebase
const serviceAccount = require('./url-s-59411-firebase-adminsdk-5pevd-2d869f8a03.json'); // เปลี่ยนเป็นพาทของไฟล์ serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://url-s-59411-default-rtdb.asia-southeast1.firebasedatabase.app/' // เปลี่ยนเป็น URL ของ Firebase ของคุณ
});

const db = admin.firestore(); // เรียกใช้งาน Firestore

const urlMap = {};

fastify.post('/api/shorten', async (req, res) => {
    const originalUrl = req.body.originalUrl;
    let shortId = req.body.shortId;

    if (!shortId) {
        shortId = generateRandomString(4); // สุ่มสตริงที่มีความยาว 6 ตัวอักษร
    } else if (urlMap[shortId]) {
        // ถ้า shortId ซ้ำกันใน urlMap ให้สร้างสตริงสุ่มใหม่แล้วลองใหม่
        let attempts = 0;
        while (attempts < 3) {
            const newShortId = generateRandomString(6);
            if (!urlMap[newShortId]) {
                shortId = newShortId;
                break;
            }
            attempts++;
        }
        if (attempts === 3) {
            return res.status(400).send({ error: 'Custom URL already exists' });
        }
    }

    const shortenedUrl = `https://url-s.web.app/${shortId}`;

    // เก็บข้อมูลใน Firestore
    const docRef = db.collection('shortened_urls').doc(shortId);
    await docRef.set({ originalUrl });

    urlMap[shortId] = originalUrl;

    res.status(201).send({ shortenedUrl });
});

fastify.get('/:key', async (req, res) => {
    const key = req.params.key;

    try {
        const docRef = db.collection('shortened_urls').doc(key);
        const doc = await docRef.get();

        if (doc.exists) {
            const originalUrl = doc.data().originalUrl;
            res.status(200).send({ url: originalUrl });
        } else {
            res.status(404).send({ error: 'URL not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred while fetching data' });
    }
});


const PORT = 3000;
fastify.listen(PORT, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is running on port ${PORT}`);
});

function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}
