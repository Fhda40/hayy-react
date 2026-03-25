import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyAPkinYnCQr8dJPxuYLRFI5ZrC56hR-reg',
  authDomain: 'fbrg87.firebaseapp.com',
  projectId: 'fbrg87',
  storageBucket: 'fbrg87.firebasestorage.app',
  messagingSenderId: '811335912659',
  appId: '1:811335912659:web:a923cc11d16315dfd4d826',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
const fns         = getFunctions(app, 'us-central1');

export const callAskAssistant          = httpsCallable(fns, 'askAssistant');
export const callGenerateDescription   = httpsCallable(fns, 'generateStoreDescription');

export default app;
