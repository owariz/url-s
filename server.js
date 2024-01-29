const fastify = require("fastify")();
const crypto = require("crypto");
const admin = require("firebase-admin");

fastify.register(require("@fastify/url-data"));
const serviceAccount = require("./url-s-59411-firebase-adminsdk-5pevd-2d869f8a03.json");

fastify.options("*", function (request, reply) {
  reply.send();
});

fastify.addHook("onSend", function (request, reply, payload, next) {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Headers", "*");
  next();
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://url-s-59411-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = admin.firestore();
const urlMap = {};

const MAX_UNUSED_URL_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 วันในหน่วยมิลลิวินาที
const currentTime = new Date().getTime();

fastify.get("/api/shorten", async (req, res) => {
  try {
    const querySnapshot = await db.collection("shortened_urls").get();

    const data = [];
    querySnapshot.forEach((doc) => {
      const key = doc.id;
      const originalURL = doc.data().originalURL;
      const shortenedUrl = doc.data().shortenedUrl;
      data.push({ key, url: originalURL, shortenedUrl: shortenedUrl });
    });

    res.status(200).json({ msg: "NOTHING HERE" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while fetching data" });
  }
});

fastify.get("/api/shorten/:key", async (req, res) => {
  const key = req.params.key;

  try {
    const docRef = db.collection("shortened_urls").doc(key);
    const doc = await docRef.get();

    if (doc.exists) {
      const originalURL = doc.data().originalURL;
      const shortenedUrl = doc.data().shortenedUrl;
      await docRef.update({
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(200).send({ originalURL, shortenedUrl });
    } else {
      res.status(404).send({ error: "URL not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while fetching data" });
  }
});

fastify.post("/api/shorten", async (req, res) => {
  try {
    const originalURL = req.body.originalURL;
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
        return res.status(400).send({ error: "Custom URL already exists" });
      }
    }

    const shortenedUrl = `https://url-s.web.app/${shortId}`;

    const docRef = db.collection("shortened_urls").doc(shortId);
    await docRef.set({ originalURL, shortenedUrl });

    urlMap[shortId] = originalURL;

    res.status(201).send({ shortenedUrl });
  } catch (err) {
    res.status(400).send({ msg: "Ahhhh!!!" });
  }
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
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomString = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}

(async () => {
  const querySnapshot = await db.collection("shortened_urls").get();

  querySnapshot.forEach(async (doc) => {
    const urlData = doc.data();
    if (urlData.lastUsed) {
      const lastUsedTime = urlData.lastUsed.toMillis();
      if (currentTime - lastUsedTime > MAX_UNUSED_URL_DURATION) {
        try {
          await doc.ref.delete();
          console.log(`Deleted unused URL: ${doc.id}`);
          // ลบข้อมูลแคชเมื่อ URL ถูกลบ
          cache.del(doc.id);
        } catch (deleteError) {
          console.error(`Error deleting URL: ${doc.id}`, deleteError);
        }
      }
    }
  });
})();
