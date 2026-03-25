const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Triggered when a coupon document is updated
exports.notifyMerchantOnCouponUsed = functions.firestore
  .document('coupons/{couponId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'used'
    if (before.status === after.status) return null;
    if (after.status !== 'used') return null;

    const merchantPhone = after.merchant_phone;
    const businessName = after.business_name || 'نشاطك';
    const code = after.code || '';

    if (!merchantPhone) return null;

    try {
      // Find merchant's FCM token
      const tokensSnap = await db.collection('fcm_tokens')
        .where('phone', '==', merchantPhone)
        .limit(1)
        .get();

      if (tokensSnap.empty) return null;

      const token = tokensSnap.docs[0].data().token;
      if (!token) return null;

      await messaging.send({
        token,
        notification: {
          title: '🎉 كوبون جديد!',
          body: `تم استخدام الكود ${code} في ${businessName}`,
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        webpush: {
          notification: {
            icon: 'https://res.cloudinary.com/dtwgl17iy/image/upload/w_192,h_192,c_fill,f_png/v1774160618/%D8%AD%D9%8E%D9%8A%D9%91_otbkdk.png',
            dir: 'rtl',
            lang: 'ar',
          },
        },
      });

      functions.logger.info(`Notification sent to merchant ${merchantPhone} for coupon ${code}`);
    } catch (err) {
      functions.logger.error('Error sending notification:', err);
    }

    return null;
  });
