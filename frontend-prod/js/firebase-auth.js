import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

const config = window.FIREBASE_CONFIG;
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];

if (!config || requiredConfig.some((key) => !config[key])) {
  window.FirebaseEmailAuth = {
    isSignInWithEmailLink: () => false,
    sendSignInLink: async () => {
      throw new Error('Firebase email sign-in is not configured. Add the Firebase web config first.');
    },
    completeSignIn: async () => {
      throw new Error('Firebase email sign-in is not configured. Add the Firebase web config first.');
    }
  };
} else {
  const auth = getAuth(initializeApp(config));

  window.FirebaseEmailAuth = {
    isSignInWithEmailLink: () => isSignInWithEmailLink(auth, window.location.href),
    async sendSignInLink(email, role) {
      const continueUrl = new URL('login.html', window.location.href);
      continueUrl.searchParams.set('role', role);
      await sendSignInLinkToEmail(auth, email, {
        url: continueUrl.toString(),
        handleCodeInApp: true
      });
    },
    async completeSignIn(email) {
      const credential = await signInWithEmailLink(auth, email, window.location.href);
      const idToken = await credential.user.getIdToken();
      await signOut(auth);
      return idToken;
    }
  };
}
