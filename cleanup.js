const admin = require('firebase-admin');
const serviceAccount = require('./url-s-59411-firebase-adminsdk-5pevd-2d869f8a03.json');
const cache = require('./cache'); // เรียกใช้งานโมดูลแคช

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://url-s-59411-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const db = admin.firestore();

const MAX_UNUSED_URL_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 วันในหน่วยมิลลิวินาที

const currentTime = new Date().getTime();

(async () => {
  const querySnapshot = await db.collection('shortened_urls').get();

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
