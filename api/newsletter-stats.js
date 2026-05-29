import { getAdminDb } from './_lib/firebaseAdmin.js';
import { sendJson } from './_lib/http.js';

const COLLECTION_NAME = String(process.env.NEWSLETTER_COLLECTION || 'newsletterSubscribers').trim();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { success: false, code: 'newsletter-stats/method-not-allowed' });
  }

  try {
    const db = getAdminDb();
    const collectionRef = db.collection(COLLECTION_NAME);
    let subscribers = 0;

    try {
      const countSnapshot = await collectionRef.count().get();
      subscribers = Number(countSnapshot?.data()?.count || 0);
    } catch {
      const snapshot = await collectionRef.get();
      subscribers = snapshot.size;
    }

    return sendJson(res, 200, {
      success: true,
      subscribers: Math.max(0, Math.floor(Number(subscribers) || 0))
    });
  } catch (error) {
    console.error('newsletter-stats/read-error', error);
    return sendJson(res, 500, {
      success: false,
      code: 'newsletter-stats/read-failed',
      message: "Impossible de recuperer le nombre d'abonnes."
    });
  }
}
