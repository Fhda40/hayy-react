import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import app from '../firebase';

const VAPID = 'eWDJZ90Iqm4sFBPCIy3Ayc79O42hgxIj_i3QUfxzPSs';

export async function initPush(phone) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    const messaging = getMessaging(app);
    const sw = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: sw });

    if (token) {
      const uid = auth.currentUser?.uid || localStorage.getItem('h_uid');
      if (uid) {
        await setDoc(doc(db, 'fcm_tokens', uid), {
          token, phone, updated_at: serverTimestamp(),
        }, { merge: true });
      }
    }
  } catch {}
}
