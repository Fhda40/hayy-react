import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';

function haversine(a, b, c, d) {
  const R = 6371;
  const x = Math.sin((c - a) * Math.PI / 360) ** 2 +
    Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) *
    Math.sin((d - b) * Math.PI / 360) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function confettiBurst() {
  const colors = ['#FF3B30','#34C759','#007AFF','#FF9500','#AF52DE','#FFD60A'];
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.42;
  for (let i = 0; i < 32; i++) {
    const p = document.createElement('div');
    const sz = 6 + Math.random() * 8;
    const ang = Math.random() * Math.PI * 2;
    const dst = 80 + Math.random() * 170;
    const tx = Math.cos(ang) * dst, ty = Math.sin(ang) * dst - 70;
    const dur = 650 + Math.random() * 450;
    Object.assign(p.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: 9999,
      width: sz + 'px', height: sz + 'px',
      background: colors[i % colors.length],
      borderRadius: i % 3 === 0 ? '2px' : '50%',
      left: cx + 'px', top: cy + 'px',
      transform: 'translate(-50%,-50%)',
      transition: `transform ${dur}ms cubic-bezier(.2,.8,.2,1), opacity ${dur}ms ease`,
      opacity: '1',
    });
    document.body.appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random()*360}deg)`;
      p.style.opacity = '0';
    }));
    setTimeout(() => p.remove(), dur + 100);
  }
}

export default function Coupon() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const store = state?.store;
  const userPos = state?.userPos;

  const [phase, setPhase] = useState('idle'); // idle | spinning | active | expired | used_today
  const [digits, setDigits] = useState(['—','—','—','—']);
  const [locked, setLocked] = useState([false,false,false,false]);
  const [timerSecs, setTimerSecs] = useState(180);
  const [couponId, setCouponId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const timerRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    checkUsedToday();
    fetchReviews();
    return () => clearInterval(timerRef.current);
  }, []);

  async function fetchReviews() {
    try {
      const q = query(
        collection(db, 'ratings'),
        where('business_id', '==', store.id),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  function relativeDate(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'منذ لحظات';
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
    if (diff < 172800) return 'منذ يوم';
    if (diff < 604800) return `منذ ${Math.floor(diff/86400)} أيام`;
    if (diff < 2592000) return `منذ ${Math.floor(diff/604800)} أسابيع`;
    return `منذ ${Math.floor(diff/2592000)} أشهر`;
  }

  async function checkUsedToday() {
    try {
      const uid = localStorage.getItem('h_uid') || 'guest';
      const today = new Date(); today.setHours(0,0,0,0);
      const q = query(collection(db,'coupons'), where('user_id','==',uid), where('business_id','==',store.id), where('status','==','used'));
      const snap = await getDocs(q);
      if (snap.docs.some(d => { const t = d.data().used_at?.toDate?.(); return t && t >= today; })) {
        setPhase('used_today');
      }
    } catch {}
  }

  async function generate() {
    if (phase === 'active' || phase === 'spinning') return;
    setPhase('spinning');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    codeRef.current = code;

    // Slot machine animation
    const digs = ['—','—','—','—'];
    setDigits([...digs]);
    setLocked([false,false,false,false]);

    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 160 + i * 190));
      const spins = 10 + i * 4;
      await new Promise(r => {
        let n = 0;
        const iv = setInterval(() => {
          digs[i] = String(Math.floor(Math.random() * 10));
          setDigits([...digs]);
          if (++n >= spins) {
            clearInterval(iv);
            digs[i] = code[i];
            setDigits([...digs]);
            setLocked(prev => { const x=[...prev]; x[i]=true; return x; });
            if (navigator.vibrate) navigator.vibrate(20);
            r();
          }
        }, 48);
      });
    }

    if (navigator.vibrate) navigator.vibrate([50,30,80]);
    confettiBurst();
    setPhase('active');
    setTimerSecs(180);
    startTimer();

    // Save to Firebase
    try {
      await signInAnonymously(auth).catch(()=>{});
      const uid = auth.currentUser?.uid || localStorage.getItem('h_uid') || 'guest';
      const ref = await addDoc(collection(db,'coupons'), {
        code, user_id: uid,
        business_id: store.id, business_name: store.name || '',
        created_at: serverTimestamp(),
        expires_at: new Date(Date.now() + 180000),
        status: 'pending',
      });
      setCouponId(ref.id);
    } catch {}
  }

  function startTimer() {
    clearInterval(timerRef.current);
    let secs = 180;
    timerRef.current = setInterval(async () => {
      secs--;
      setTimerSecs(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current);
        // Check if used
        if (couponId) {
          try {
            const snap = await getDocs(query(collection(db,'coupons'), where('__name__','==', couponId)));
            if (!snap.empty && snap.docs[0].data().status === 'used') {
              navigate('/rating', { state: { store, couponId } });
              return;
            }
          } catch {}
        }
        setPhase('expired');
      }
    }, 1000);
  }

  if (!store) return null;

  const m = Math.floor(timerSecs / 60), s = timerSecs % 60;
  const fillPct = (timerSecs / 180) * 100;
  const dist = userPos && store.lat && store.lng
    ? haversine(userPos.lat, userPos.lng, store.lat, store.lng)
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      {/* Back */}
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 12px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/stores')}>‹ العروض</button>
      </div>

      {/* Store header */}
      <div style={{ padding:'10px 20px 14px', textAlign:'center' }}>
        <div style={{ width:72, height:72, margin:'0 auto 10px', borderRadius:18, background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, overflow:'hidden' }}>
          {store.logo_url
            ? <img src={store.logo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={store.name} />
            : store.icon || '🏪'
          }
        </div>
        <div style={{ fontSize:20, fontWeight:700 }}>{store.name}</div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{store.type}</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, padding:'6px 14px', background:'#FFF3E0', borderRadius:20, fontSize:12, color:'#E65100', fontWeight:600 }}>
          <span>👀</span>
          <span>{Math.floor(Math.random()*20)+5} شخص يستخدم هذا العرض الآن</span>
        </div>
      </div>

      {/* Photos */}
      {store.photos?.length > 0 && (
        <div style={{ padding:'0 20px 10px', display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
          {store.photos.slice(0,5).map((u,i) => (
            <img key={i} src={u} style={{ width:72, height:72, flexShrink:0, objectFit:'cover', borderRadius:10 }} alt="" />
          ))}
        </div>
      )}

      {/* Reviews */}
      {(() => {
        const avgStars = reviews.length > 0
          ? reviews.reduce((s, r) => s + (r.stars || 0), 0) / reviews.length
          : 0;
        const comments = reviews.filter(r => r.comment && r.comment.trim()).slice(0, 5);
        return (
          <div style={{ margin:'0 16px 14px', background:'#fff', borderRadius:16, border:'1px solid var(--sep)', padding:'16px 18px' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:10 }}>التقييمات</div>
            {reviews.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text4)', fontSize:13, padding:'6px 0' }}>كن أول من يقيّم</div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ display:'flex', gap:2 }}>
                    {[1,2,3,4,5].map(v => (
                      <span key={v} style={{ fontSize:26, color: v <= Math.round(avgStars) ? '#FF9500' : '#E0E0E0' }}>★</span>
                    ))}
                  </div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#1D1D1F' }}>{avgStars.toFixed(1)}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>({reviews.length} تقييم)</div>
                </div>
                {comments.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {comments.map(r => (
                      <div key={r.id} style={{ borderTop:'1px solid var(--sep)', paddingTop:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <div style={{ display:'flex', gap:1 }}>
                            {[1,2,3,4,5].map(v => (
                              <span key={v} style={{ fontSize:13, color: v <= (r.stars || 0) ? '#FF9500' : '#E0E0E0' }}>★</span>
                            ))}
                          </div>
                          <span style={{ fontSize:11, color:'var(--text4)', marginRight:'auto' }}>{relativeDate(r.created_at)}</span>
                        </div>
                        <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{r.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Coupon Card */}
      <div style={{ margin:'0 16px', borderRadius:20, overflow:'hidden', border:'1px solid var(--sep)', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        {/* Top */}
        <div style={{ padding:'28px 24px 22px', textAlign:'center', borderBottom:'1px dashed var(--sep)', background:'#fff' }}>
          <div style={{ fontSize:14, color:'var(--text3)', marginBottom:4 }}>خصم</div>
          <div style={{ fontSize:72, fontWeight:900, letterSpacing:-2, color:'#1D1D1F', lineHeight:1 }}>{store.discount || 0}</div>
          <div style={{ fontSize:14, color:'var(--text3)', marginTop:4 }}>% • حصري لأهل شرورة 🏡</div>
        </div>

        {/* Bottom */}
        <div style={{ padding:'20px 24px', textAlign:'center', background:'#fff' }}>
          {phase === 'idle' && (
            <div style={{ padding:'8px 0' }}>
              <div style={{ fontSize:32, marginBottom:6 }}>🎁</div>
              <div style={{ fontSize:14, color:'var(--text3)' }}>اضغط لتوليد كودك الحصري</div>
            </div>
          )}

          {(phase === 'spinning' || phase === 'active') && (
            <div>
              <div style={{ fontSize:13, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>🎉 كودك جاهز!</div>
              {/* Digit boxes */}
              <div style={{ display:'flex', gap:10, justifyContent:'center', margin:'14px 0 8px', direction:'ltr' }}>
                {digits.map((d, i) => (
                  <div key={i} style={{
                    width:58, height:66, background: locked[i] ? '#1D1D1F' : 'var(--bg2)',
                    borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:34, fontWeight:900,
                    color: locked[i] ? '#fff' : 'var(--text)',
                    border: `2px solid ${locked[i] ? '#1D1D1F' : phase==='spinning' ? 'rgba(0,122,255,.45)' : 'var(--sep)'}`,
                    transition: 'background .25s, border-color .2s',
                  }}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Timer bar */}
              <div style={{ height:4, background:'var(--sep)', borderRadius:4, overflow:'hidden', margin:'10px 0 6px' }}>
                <div style={{ height:'100%', borderRadius:4, transition:'width 1s linear, background 1s', width: fillPct + '%', background: timerSecs <= 30 ? 'var(--red)' : 'var(--green)' }} />
              </div>
              <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
                ⏱ صالح لمدة <strong>{m}:{s < 10 ? '0' : ''}{s}</strong>
              </div>
            </div>
          )}

          {phase === 'expired' && (
            <div style={{ padding:10, background:'rgba(255,59,48,0.06)', borderRadius:10, marginTop:8 }}>
              <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>⏰ انتهت صلاحية الكود</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ height:14 }} />

      {/* Main Button */}
      <button
        className="btn-main"
        style={{ margin:'0 16px', background: phase==='active' ? '#34C759' : phase==='used_today' ? '#636366' : '' }}
        onClick={phase === 'expired' ? generate : phase === 'idle' ? generate : undefined}
        disabled={phase === 'spinning' || phase === 'active' || phase === 'used_today'}
      >
        {phase === 'idle' && '🎁 احصل على خصمك'}
        {phase === 'spinning' && '⏳ جاري التوليد...'}
        {phase === 'active' && '⏱ الكود نشط — توجّه للمحل الآن'}
        {phase === 'expired' && '🔄 توليد كود جديد'}
        {phase === 'used_today' && '✅ استخدمت هذا العرض اليوم'}
      </button>

      {/* Location button */}
      {phase === 'active' && store.lat && store.lng && (
        <div style={{ padding:'8px 16px 6px' }}>
          <a
            href={`https://maps.google.com/?q=${store.lat},${store.lng}`}
            target="_blank" rel="noreferrer"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'15px 20px', borderRadius:16,
              background:'linear-gradient(135deg,#0A2540,#1565C0)',
              color:'#fff', textDecoration:'none', boxShadow:'0 5px 18px rgba(10,37,64,.3)',
            }}
          >
            <span style={{ fontSize:24 }}>📍</span>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>الذهاب إلى المحل الآن</div>
              {dist && <div style={{ fontSize:12, opacity:.75, marginTop:1 }}>
                {dist < 1 ? `على بعد ${Math.round(dist*1000)} متر منك` : `على بعد ${dist.toFixed(1)} كم منك`}
              </div>}
            </div>
            <span style={{ fontSize:20, opacity:.7, marginRight:'auto' }}>←</span>
          </a>
        </div>
      )}

      <div style={{ textAlign:'center', padding:'4px 0 8px', fontSize:12, color:'var(--text4)' }}>
        مرة واحدة يومياً لكل محل
      </div>
      <div style={{ flex:1 }} />
      <div style={{ height:'calc(env(safe-area-inset-bottom,0px) + 16px)' }} />
    </div>
  );
}
