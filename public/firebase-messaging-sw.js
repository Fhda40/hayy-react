importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAPkinYnCQr8dJPxuYLRFI5ZrC56hR-reg',
  authDomain: 'fbrg87.firebaseapp.com',
  projectId: 'fbrg87',
  storageBucket: 'fbrg87.firebasestorage.app',
  messagingSenderId: '811335912659',
  appId: '1:811335912659:web:a923cc11d16315dfd4d826',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'حيّ', {
    body: body || '',
    icon: 'https://res.cloudinary.com/dtwgl17iy/image/upload/w_192,h_192,c_fill,f_png/v1774160618/%D8%AD%D9%8E%D9%8A%D9%91_otbkdk.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: 'hayy-notification',
    renotify: true,
  });
});
