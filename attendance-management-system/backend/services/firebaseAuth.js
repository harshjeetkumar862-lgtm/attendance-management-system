const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function getFirebaseAdminAuth() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

const verifyFirebaseIdToken = (idToken) => getFirebaseAdminAuth().verifyIdToken(idToken);

module.exports = { verifyFirebaseIdToken };
