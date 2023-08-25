const fastify = require('fastify')();
const crypto = require('crypto');
const admin = require('firebase-admin');

fastify.register(require('@fastify/url-data'));
const serviceAccount = require('./url-s-59411-firebase-adminsdk-5pevd-2d869f8a03.json');

fastify.options('*', function (request, reply) {
    reply.send()
})

fastify.addHook('onSend', function (request, reply, payload, next) {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', '*')
    next()
})

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://url-s-59411-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const db = admin.firestore();
const urlMap = {};

fastify.get('/:key', async (req, res) => {
    const key = req.params.key;

    try {
        const docRef = db.collection('shortened_urls').doc(key);
        const doc = await docRef.get();

        if (doc.exists) {
            const originalUrl = doc.data().originalUrl;
            res.redirect(originalUrl);
        } else {
            res.status(404).send({ error: 'URL not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred while fetching data' });
    }
});

fastify.get('/api/shorten', async (req, res) => {
    try {
        const querySnapshot = await db.collection('shortened_urls').get();

        const data = [];
        querySnapshot.forEach((doc) => {
            const key = doc.id;
            const originalUrl = doc.data().originalUrl;
            const shortenedUrl = doc.data().shortenedUrl;
            data.push({ key, url: originalUrl, shortenedUrl: shortenedUrl});
        });

        res.status(200).send({ data });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred while fetching data' });
    }
});

fastify.get('/api/shorten/:key', async (req, res) => {
    const key = req.params.key;

    try {
        const docRef = db.collection('shortened_urls').doc(key);
        const doc = await docRef.get();

        if (doc.exists) {
            const originalUrl = doc.data().originalUrl;
            const shortenedUrl = doc.data().shortenedUrl;
            res.status(200).send({ originalUrl, shortenedUrl });
        } else {
            res.status(404).send({ error: 'URL not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred while fetching data' });
    }
});

fastify.post('/api/shorten', async (req, res) => {
    const originalUrl = req.body.originalUrl;
    let shortId = req.body.shortId;

    if (shortId === null) {
        shortId = generateRandomString(4);
    } else if (!shortId) {
        shortId = generateRandomString(4);
    } else if (urlMap[shortId]) {
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

    const docRef = db.collection('shortened_urls').doc(shortId);
    await docRef.set({ originalUrl, shortenedUrl });

    urlMap[shortId] = originalUrl;

    res.status(201).send({ shortenedUrl });
});

const PORT = 3000;
fastify.listen({ port: PORT }, (err) => {
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
