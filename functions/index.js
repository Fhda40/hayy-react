const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ─────────────────────────────────────────────────────────────────
// Claude client — للتقرير الأسبوعي فقط
// ─────────────────────────────────────────────────────────────────
function getAI() {
  const key = process.env.ANTHROPIC_API_KEY || functions.config().anthropic?.key;
  if (!key) throw new functions.https.HttpsError('failed-precondition', 'ANTHROPIC_API_KEY غير مضبوط');
  return new Anthropic.default({ apiKey: key });
}

// ─────────────────────────────────────────────────────────────────
// Gemini client — للمساعد وتوليد الوصف
// ─────────────────────────────────────────────────────────────────
function getGemini() {
  const key = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
  if (!key) throw new functions.https.HttpsError('failed-precondition', 'GEMINI_API_KEY غير مضبوط');
  return new GoogleGenerativeAI(key);
}

// ─────────────────────────────────────────────────────────────────
// 1. إشعار التاجر عند استخدام الكوبون
// ─────────────────────────────────────────────────────────────────
exports.notifyMerchantOnCouponUsed = functions.firestore
  .document('coupons/{couponId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (before.status === after.status) return null;
    if (after.status !== 'used') return null;

    const merchantPhone = after.merchant_phone;
    const businessName  = after.business_name || 'نشاطك';
    const code          = after.code || '';
    if (!merchantPhone) return null;

    try {
      const tokensSnap = await db.collection('fcm_tokens')
        .where('phone', '==', merchantPhone).limit(1).get();
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
            dir: 'rtl', lang: 'ar',
          },
        },
      });
      functions.logger.info(`Notification sent to ${merchantPhone} for coupon ${code}`);
    } catch (err) {
      functions.logger.error('Error sending notification:', err);
    }
    return null;
  });

// ─────────────────────────────────────────────────────────────────
// 2. مساعد حيّ للعملاء — Gemini
// ─────────────────────────────────────────────────────────────────
exports.askAssistant = functions.https.onCall(async (data) => {
  const { message, stores = [], history = [] } = data;
  if (!message) throw new functions.https.HttpsError('invalid-argument', 'message مطلوب');

  const storeList = stores
    .map(s => `• ${s.name} (${s.type}) — خصم ${s.discount || 0}%${s.area ? ` — ${s.area}` : ''}`)
    .join('\n');

  const systemInstruction = `أنت مساعد ذكي لتطبيق "حيّ" في شرورة، منصة خصومات حصرية لأهل الحي.

المحلات المتاحة الآن:
${storeList || 'لا توجد بيانات'}

قواعدك:
- تكلم بالعربية دائماً، بأسلوب ودود وقصير
- اقترح فقط من المحلات المذكورة أعلاه
- اذكر نسبة الخصم دائماً عند الاقتراح
- إذا سأل عن محل غير موجود، اعتذر بلطف واقترح بديلاً
- ردودك بين جملة وثلاث جمل كحد أقصى`;

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction });

  const geminiHistory = history.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(message);

  return { reply: result.response.text() };
});

// ─────────────────────────────────────────────────────────────────
// 3. توليد وصف تسويقي للتاجر — Gemini
// ─────────────────────────────────────────────────────────────────
exports.generateStoreDescription = functions.https.onCall(async (data) => {
  const { storeName, storeType, discount } = data;
  if (!storeName) throw new functions.https.HttpsError('invalid-argument', 'storeName مطلوب');

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent(`اكتب وصفاً تسويقياً جذاباً ومختصراً (جملة واحدة أو جملتين) لنشاط تجاري في شرورة:
الاسم: ${storeName}
النوع: ${storeType || 'نشاط تجاري'}
الخصم: ${discount || 10}%

الوصف يجب أن: يكون بالعربية، يذكر الخصم، يناسب أهل شرورة، وجذاب للعملاء.
أعطِ فقط النص، بدون مقدمات.`);
    return { description: result.response.text().trim() };
  } catch (err) {
    functions.logger.error('generateStoreDescription error:', err);
    throw new functions.https.HttpsError('internal', 'تعذر توليد الوصف، حاول مجدداً');
  }
});

// ─────────────────────────────────────────────────────────────────
// 4. مدير المشروع الأسبوعي — يعمل كل اثنين الساعة 8 صباحاً
// ─────────────────────────────────────────────────────────────────
exports.weeklyProjectReport = functions.pubsub
  .schedule('every monday 08:00')
  .timeZone('Asia/Riyadh')
  .onRun(async () => {
    const ai = getAI();
    const week = new Date(Date.now() - 7 * 86400000);

    const [merchantsSnap, couponsSnap, complaintsSnap, ratingsSnap] = await Promise.all([
      db.collection('merchants').get(),
      db.collection('coupons').get(),
      db.collection('complaints').get(),
      db.collection('ratings').get(),
    ]);

    const merchants  = merchantsSnap.docs.map(d => d.data());
    const coupons    = couponsSnap.docs.map(d => d.data());
    const complaints = complaintsSnap.docs.map(d => d.data());
    const ratings    = ratingsSnap.docs.map(d => d.data());

    const weekCoupons    = coupons.filter(c => c.created_at?.toDate?.() >= week);
    const usedCoupons    = weekCoupons.filter(c => c.status === 'used');
    const expiredCoupons = weekCoupons.filter(c => c.status === 'expired');
    const openComplaints = complaints.filter(c => c.status === 'open');
    const newMerchants   = merchants.filter(m => m.created_at?.toDate?.() >= week);

    const storeRatings = {};
    ratings.forEach(r => {
      if (!storeRatings[r.business_name]) storeRatings[r.business_name] = [];
      if (r.stars) storeRatings[r.business_name].push(r.stars);
    });
    const lowRatedStores = Object.entries(storeRatings)
      .map(([name, stars]) => ({ name, avg: stars.reduce((a, b) => a + b, 0) / stars.length }))
      .filter(s => s.avg < 3)
      .map(s => `${s.name} (${s.avg.toFixed(1)}★)`);

    const topStores = Object.entries(
      usedCoupons.reduce((acc, c) => {
        acc[c.business_name] = (acc[c.business_name] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n}: ${c}`);

    const stats = {
      merchants:  { total: merchants.length, active: merchants.filter(m => m.active !== false).length, new_this_week: newMerchants.length },
      coupons:    { generated: weekCoupons.length, used: usedCoupons.length, expired: expiredCoupons.length, usage_rate: weekCoupons.length ? Math.round(usedCoupons.length / weekCoupons.length * 100) + '%' : '0%' },
      complaints: { open: openComplaints.length, resolved_this_week: complaints.filter(c => c.resolved_at?.toDate?.() >= week).length },
      ratings:    { total: ratings.length, avg_platform: ratings.length ? (ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length).toFixed(1) : '—' },
      top_stores: topStores,
      low_rated_stores: lowRatedStores,
    };

    let analysis = '';
    try {
      const response = await ai.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `أنت مدير مشروع محترف لتطبيق "حيّ"، منصة خصومات لسكان شرورة.
حلّل هذه الإحصائيات الأسبوعية وأعطِ تقريراً احترافياً موجزاً بالعربية:

${JSON.stringify(stats, null, 2)}

التقرير يجب أن يحتوي بالترتيب على:
**1. ملخص الأداء** — جملتان عن الأرقام الأبرز
**2. نقاط القوة** — ما يسير بشكل جيد
**3. نقاط تحتاج اهتماماً** — مشاكل أو مخاوف واضحة
**4. توصيات الأسبوع القادم** — 3 إجراءات محددة وقابلة للتنفيذ

الأسلوب: احترافي، مباشر، قابل للتنفيذ.`,
        }],
      });
      analysis = response.content.find(b => b.type === 'text')?.text || '';
    } catch (err) {
      functions.logger.error('weeklyProjectReport AI error:', err);
      analysis = 'تعذر توليد التحليل الذكي.';
    }

    await db.collection('reports').add({
      type: 'weekly',
      stats,
      analysis,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      week_start: week.toISOString(),
      read: false,
    });

    try {
      const adminTokens = await db.collection('fcm_tokens').where('role', '==', 'admin').limit(1).get();
      if (!adminTokens.empty) {
        await messaging.send({
          token: adminTokens.docs[0].data().token,
          notification: {
            title: '📊 التقرير الأسبوعي جاهز',
            body: `${stats.coupons.used} كوبون مستخدم • معدل ${stats.coupons.usage_rate} • ${stats.complaints.open} شكوى مفتوحة`,
          },
          webpush: { notification: { dir: 'rtl', lang: 'ar' } },
        });
      }
    } catch (e) {
      functions.logger.warn('Could not send admin notification:', e.message);
    }

    functions.logger.info('Weekly report generated', stats);
    return null;
  });
