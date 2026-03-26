import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, setDoc, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, callGenerateDescription } from '../../firebase';
import { signInAnonymously } from 'firebase/auth';

const CL = 'https://api.cloudinary.com/v1_1/dtwgl17iy/image/upload';
const UP = 'hayy_uploads';
const EMOJIS = ['☕','🍽️','💊','🛒','✂️','🍕','🧴','📱','🏪','🌿','🍰','💈'];
const TYPES = ['☕ مقاهي ومشروبات','🍽️ مطاعم ومأكولات','💊 صيدليات','🛒 بقالات','✂️ حلاقة وتجميل','👗 ملابس وأزياء','📱 إلكترونيات','🏪 أخرى'];

async function uploadImg(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) throw new Error('نوع الملف غير مدعوم — يُقبل: jpg, png, webp');
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الملف يتجاوز 5MB');
  const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', UP);
  const res = await (await fetch(CL, { method:'POST', body:fd })).json();
  if (!res.secure_url) throw new Error('فشل الرفع، حاول مجدداً');
  return res.secure_url;
}

export default function MerchantDash() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { mid: initMid, phone: initPhone, data: initData } = state || {};

  const mid = initMid || localStorage.getItem('m_id');
  const phone = initPhone || localStorage.getItem('m_phone');

  const [tab, setTab] = useState('profile');
  const [emoji, setEmoji] = useState('🏪');
  const [logoUrl, setLogoUrl] = useState('');
  const [photos, setPhotos] = useState(['','','']);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [discount, setDiscount] = useState(10);
  const [desc, setDesc] = useState('');
  const [area, setArea] = useState('');
  const [crNumber, setCrNumber] = useState('');

  // Stats
  const [stats, setStats] = useState({ total:0, today:0, week:0, rating:'—' });

  // Verify
  const [vCode, setVCode] = useState(['','','','']);
  const [vrResult, setVrResult] = useState(null); // null | {ok, icon, title, sub}

  // Founder
  const [founder, setFounder] = useState(null);

  // UI states
  const [saving, setSaving]         = useState(false);
  const [genDesc, setGenDesc]       = useState(false);
  const [logoStatus, setLogoStatus] = useState('');
  const [photosStatus, setPhotosStatus] = useState('');
  const [locStatus, setLocStatus] = useState('');

  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    if (initData) loadDash(initData);
    else if (mid && phone) {
      getDocs(query(collection(db,'merchants'), where('phone','==',phone)))
        .then(s => { if (!s.empty) loadDash(s.docs[0].data()); })
        .catch(() => {});
    }
  }, []);

  function loadDash(d) {
    if (d.store_name) setName(d.store_name);
    if (d.store_type) setType(d.store_type);
    if (d.discount) setDiscount(d.discount);
    if (d.icon) setEmoji(d.icon);
    if (d.description) setDesc(d.description);
    if (d.area) setArea(d.area);
    if (d.logo_url) setLogoUrl(d.logo_url);
    if (d.photos) setPhotos([...d.photos,'',''].slice(0,3));
    if (d.lat) setLat(d.lat);
    if (d.lng) setLng(d.lng);
    if (d.cr_number) setCrNumber(d.cr_number);
    if (d.is_founder) {
      const days = d.free_trial_ends ? Math.max(0, Math.ceil((new Date(d.free_trial_ends) - Date.now()) / 864e5)) : 0;
      setFounder({ num: d.founder_number, days });
    }
  }

  async function loadStats() {
    try {
      const snap = await getDocs(query(collection(db,'coupons'), where('merchant_phone','==',phone)));
      let total=0, today=0, week=0; const now = new Date();
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'used') {
          total++;
          const ts = data.used_at?.toDate?.() || new Date(0);
          if (now - ts < 864e5) today++;
          if (now - ts < 6048e5) week++;
        }
      });
      const rs = await getDocs(query(collection(db,'ratings'), where('business_name','==',name)));
      let rt=0, rc=0;
      rs.forEach(d => { if (d.data().stars) { rt += d.data().stars; rc++; } });
      setStats({ total, today, week, rating: rc ? (rt/rc).toFixed(1) + '★' : '—' });
    } catch {}
  }

  async function doVerify() {
    const code = vCode.join('').trim();
    if (code.length < 4) { setVrResult({ ok:false, icon:'❌', title:'أدخل الكود كاملاً', sub:'' }); return; }
    setVrResult(null);
    try {
      const now = new Date();
      const snap = await getDocs(query(collection(db,'coupons'), where('code','==',code), where('status','==','pending')));
      if (snap.empty) {
        const u = await getDocs(query(collection(db,'coupons'), where('code','==',code), where('status','==','used')));
        setVrResult(u.empty
          ? { ok:false, icon:'❌', title:'كود غير موجود', sub:'تأكد من الأرقام' }
          : { ok:false, icon:'⚠️', title:'كود مستخدم مسبقاً', sub:'تم استخدامه من قبل' });
      } else {
        const c = snap.docs[0];
        const exp = c.data().expires_at?.toDate ? c.data().expires_at.toDate() : new Date(c.data().expires_at);
        if (exp < now) {
          await setDoc(doc(db,'coupons',c.id), { status:'expired' }, { merge:true });
          setVrResult({ ok:false, icon:'⏱️', title:'الكود منتهي!', sub:'اطلب كوداً جديداً' });
        } else {
          await setDoc(doc(db,'coupons',c.id), { status:'used', used_at:serverTimestamp(), merchant_phone:phone }, { merge:true });
          setVrResult({ ok:true, icon:'✅', title:'كود صالح!', sub:'تم تطبيق الخصم ✨' });
          setVCode(['','','','']);
        }
      }
    } catch { setVrResult({ ok:false, icon:'❌', title:'خطأ', sub:'حاول مجدداً' }); }
  }

  async function save() {
    if (!name) { alert('أدخل اسم النشاط'); return; }
    setSaving(true);
    const info = { store_name:name, store_type:type.replace(/^.\s/,''), discount, icon:emoji, description:desc, area, cr_number:crNumber, logo_url:logoUrl, photos:photos.filter(u=>u), active:true, lat, lng, updated_at:serverTimestamp() };
    try {
      await signInAnonymously(auth);
      await setDoc(doc(db,'merchants',mid), info, { merge:true });
      const bq = await getDocs(query(collection(db,'businesses'), where('phone','==',phone)));
      const biz = { name, type:type.replace(/^.\s/,''), discount, icon:emoji, description:desc, area, phone, logo_url:logoUrl, photos:photos.filter(u=>u), active:true, lat, lng, updated_at:serverTimestamp() };
      if (!bq.empty) await setDoc(doc(db,'businesses',bq.docs[0].id), biz, { merge:true });
      else await addDoc(collection(db,'businesses'), { ...biz, created_at:serverTimestamp() });
    } catch (e) { alert('خطأ: ' + (e?.code || e?.message || e)); }
    setSaving(false);
  }

  const btnBlue = { display:'block', width:'100%', padding:17, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 14px) 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:28 }}>{emoji}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>{name || 'نشاطك'}</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>لوحة التحكم</div>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('m_id'); localStorage.removeItem('m_phone'); navigate('/merchant'); }}
          style={{ background:'var(--bg2)', border:'none', borderRadius:20, padding:'7px 14px', fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", color:'var(--text3)', cursor:'pointer' }}>
          خروج
        </button>
      </div>

      {/* Founder badge */}
      {founder && (
        <div style={{ padding:'14px 16px 0' }}>
          <div style={{ background:'linear-gradient(135deg,#0A2540,#1A4A7A)', borderRadius:16, padding:'18px 20px', color:'#fff', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:36 }}>🎖️</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:2 }}>عضو مؤسس في حيّ</div>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>مؤسس رقم {founder.num} من أصل 30</div>
              <div style={{ fontSize:12, fontWeight:700, background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'4px 10px', display:'inline-block' }}>
                {founder.days > 0 ? `⏳ ${founder.days} يوم متبقي` : 'انتهت الفترة'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding:'12px 16px 0', display:'flex', gap:8 }}>
        {[['profile','✏️ النشاط'],['stats','📊 إحصائيات'],['verify','✅ كود']].map(([id,label]) => (
          <button key={id} onClick={() => { setTab(id); if (id==='stats') loadStats(); }}
            style={{ flex:1, padding:10, border:'none', borderRadius:12, fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', background: tab===id ? '#1D1D1F' : 'var(--bg2)', color: tab===id ? '#fff' : 'var(--text3)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div style={{ padding:'0 16px 32px' }}>
          {/* Preview card */}
          <div style={{ margin:'14px 0', background:'linear-gradient(135deg,#0A2540,#2D7DD2)', borderRadius:18, padding:22, textAlign:'center', color:'#fff' }}>
            {logoUrl
              ? <img src={logoUrl} style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', margin:'0 auto 10px', display:'block' }} alt="" />
              : <div style={{ fontSize:40, marginBottom:10 }}>{emoji}</div>}
            <div style={{ fontSize:18, fontWeight:900, marginBottom:4 }}>{name || 'اسم النشاط'}</div>
            <div style={{ fontSize:13, opacity:.8, marginBottom:10 }}>{type.replace(/^.\s/,'')}</div>
            <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'5px 18px', fontSize:14, fontWeight:700 }}>خصم {discount}%</span>
          </div>

          {/* Info card */}
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid var(--sep)', padding:20, marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>🏪 معلومات النشاط</div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>اسم النشاط</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="field" placeholder="مثال: كافيه الورد" style={{ marginBottom:12 }} />
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>نوع النشاط</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ background:'var(--bg2)', border:'none', borderRadius:12, padding:'15px 16px', fontSize:16, fontFamily:"'Tajawal',sans-serif", color:'var(--text)', width:'100%', outline:'none', direction:'rtl', marginBottom:12 }}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>أيقونة</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, marginBottom:14 }}>
              {EMOJIS.map(e => (
                <div key={e} onClick={() => setEmoji(e)}
                  style={{ fontSize:24, padding:8, borderRadius:10, background:'var(--bg2)', border:`2px solid ${emoji===e ? '#1D1D1F' : 'transparent'}`, cursor:'pointer', textAlign:'center' }}>
                  {e}
                </div>
              ))}
            </div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>نسبة الخصم: <span style={{ color:'#0A2540', fontWeight:700 }}>{discount}%</span></label>
            <input type="range" min={5} max={50} step={5} value={discount} onChange={e => setDiscount(Number(e.target.value))} style={{ width:'100%', accentColor:'#1D1D1F', marginTop:8 }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text4)', margin:'4px 0 14px' }}><span>5%</span><span>25%</span><span>50%</span></div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>وصف العرض</label>
            <div style={{ position:'relative', marginBottom:12 }}>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="field" placeholder="مثال: خصم على جميع المشروبات" style={{ marginBottom:0, paddingLeft:110 }} />
              <button
                onClick={async () => {
                  if (!name) { alert('أدخل اسم النشاط أولاً'); return; }
                  setGenDesc(true);
                  try {
                    const { data } = await callGenerateDescription({ storeName: name, storeType: type.replace(/^.\s/,''), discount });
                    setDesc(data.description);
                  } catch { alert('تعذر التوليد، حاول مجدداً'); }
                  setGenDesc(false);
                }}
                disabled={genDesc}
                style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', background:'linear-gradient(135deg,#0A2540,#1565C0)', color:'#fff', border:'none', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', whiteSpace:'nowrap', opacity: genDesc ? .6 : 1 }}
              >
                {genDesc ? '⏳' : '🤖 توليد'}
              </button>
            </div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>رقم السجل التجاري</label>
            <input type="text" inputMode="numeric" value={crNumber} onChange={e => setCrNumber(e.target.value.replace(/\D/g,'').slice(0,10))} className="field" placeholder="10 أرقام" maxLength={10} />
            {crNumber && crNumber.length !== 10 && (
              <div style={{ fontSize:12, color:'var(--red)', marginTop:4 }}>السجل التجاري يجب أن يكون 10 أرقام</div>
            )}
          </div>

          {/* Location card */}
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid var(--sep)', padding:20, marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>📍 الموقع</div>
            <input type="text" value={area} onChange={e => setArea(e.target.value)} className="field" placeholder="الحي" style={{ marginBottom:12 }} />
            <button onClick={() => {
              setLocStatus('⏳ جاري التحديد...');
              navigator.geolocation.getCurrentPosition(p => {
                setLat(p.coords.latitude); setLng(p.coords.longitude);
                setLocStatus('✅ تم تحديد الموقع');
              }, () => setLocStatus('❌ تعذر تحديد الموقع'), { enableHighAccuracy:true });
            }} style={btnBlue}>📍 تحديد موقعي الحالي</button>
            {locStatus && <div style={{ marginTop:8, textAlign:'center', fontSize:13, color:'var(--text3)' }}>{locStatus}</div>}
          </div>

          {/* Photos card */}
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid var(--sep)', padding:20, marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>📸 الصور</div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>الشعار</label>
            <div onClick={() => document.getElementById('logo-inp').click()}
              style={{ border:'2px dashed var(--sep)', borderRadius:14, padding:24, textAlign:'center', cursor:'pointer', background:'var(--bg2)', marginBottom:12 }}>
              {logoUrl
                ? <img src={logoUrl} style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', margin:'0 auto', display:'block' }} alt="" />
                : <><div style={{ fontSize:32 }}>🖼️</div><div style={{ fontSize:14, color:'var(--text3)' }}>اضغط لرفع الشعار</div></>}
            </div>
            <input type="file" id="logo-inp" accept="image/*" style={{ display:'none' }} onChange={async e => {
              const f = e.target.files[0]; if (!f) return;
              setLogoStatus('⏳ جاري الرفع...');
              try { setLogoUrl(await uploadImg(f)); setLogoStatus('✅ تم'); }
              catch (err) { setLogoStatus('❌ ' + (err.message || 'فشل الرفع')); }
            }} />
            {logoStatus && <div style={{ fontSize:13, textAlign:'center', color:'var(--text3)', marginBottom:14 }}>{logoStatus}</div>}

            <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>صور النشاط (حتى 3)</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:8 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ position:'relative', aspectRatio:'1' }}>
                  <div onClick={() => document.getElementById('ph-inp-'+i).click()}
                    style={{ width:'100%', height:'100%', border:'2px dashed var(--sep)', borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', background:'var(--bg2)' }}>
                    {photos[i]
                      ? <img src={photos[i]} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                      : <><span style={{ fontSize:26 }}>📷</span><span style={{ fontSize:11, color:'var(--text4)' }}>صورة {i+1}</span></>}
                  </div>
                  {photos[i] && (
                    <button onClick={e => { e.stopPropagation(); setPhotos(p => { const x=[...p]; x[i]=''; return x; }); }}
                      style={{ position:'absolute', top:4, left:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                      ×
                    </button>
                  )}
                  <input type="file" id={'ph-inp-'+i} accept="image/*" style={{ display:'none' }} onChange={async e => {
                    const f = e.target.files[0]; if (!f) return;
                    setPhotosStatus('⏳ جاري الرفع...');
                    try { const url = await uploadImg(f); setPhotos(p => { const x=[...p]; x[i]=url; return x; }); setPhotosStatus('✅ تم'); }
                    catch (err) { setPhotosStatus('❌ ' + (err.message || 'فشل الرفع')); }
                  }} />
                </div>
              ))}
            </div>
            {photosStatus && <div style={{ fontSize:12, textAlign:'center', color:'var(--text3)' }}>{photosStatus}</div>}
          </div>

          <button onClick={save} disabled={saving} style={{ ...btnBlue, opacity: saving ? .6 : 1 }}>
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ معلومات النشاط'}
          </button>
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'stats' && (
        <div style={{ padding:'14px 16px 32px' }}>
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid var(--sep)', padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>📊 إحصائياتك</div>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              {[['st-total', stats.total, 'إجمالي الكوبونات'], ['st-today', stats.today, 'اليوم']].map(([,v,l]) => (
                <div key={l} style={{ background:'var(--bg2)', borderRadius:14, padding:16, textAlign:'center', flex:1 }}>
                  <div style={{ fontSize:28, fontWeight:900 }}>{v}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {[['st-week', stats.week, 'هذا الأسبوع'], ['st-rating', stats.rating, 'التقييم']].map(([,v,l]) => (
                <div key={l} style={{ background:'var(--bg2)', borderRadius:14, padding:16, textAlign:'center', flex:1 }}>
                  <div style={{ fontSize:28, fontWeight:900 }}>{v}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── VERIFY TAB ── */}
      {tab === 'verify' && (
        <div style={{ padding:'14px 16px 32px' }}>
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid var(--sep)', padding:20 }}>
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{ fontSize:44, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>تحقق من كود العميل</div>
            </div>
            <div style={{ display:'flex', gap:10, direction:'ltr', justifyContent:'center', marginBottom:20 }}>
              {[0,1,2,3].map(i => (
                <input key={i} id={'v-'+i} type="text" inputMode="numeric" maxLength={1} value={vCode[i]}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/,'').slice(-1);
                    setVCode(c => { const x=[...c]; x[i]=val; return x; });
                    if (val && i < 3) document.getElementById('v-'+(i+1))?.focus();
                  }}
                  onKeyDown={e => { if (e.key==='Backspace' && !vCode[i] && i > 0) { document.getElementById('v-'+(i-1))?.focus(); setVCode(c => { const x=[...c]; x[i-1]=''; return x; }); } }}
                  style={{ width:64, height:72, borderRadius:14, border:`2px solid ${vCode[i] ? '#0A2540' : 'var(--sep)'}`, background:'var(--bg2)', fontSize:28, fontWeight:800, textAlign:'center', fontFamily:"'Tajawal',sans-serif", outline:'none' }}
                />
              ))}
            </div>
            <button onClick={doVerify} style={{ ...btnBlue }}>✅ تحقق من الكود</button>
            {vrResult && (
              <div style={{ marginTop:14, borderRadius:14, padding:18, textAlign:'center', background: vrResult.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.06)', border: `1px solid ${vrResult.ok ? 'rgba(52,199,89,0.3)' : 'rgba(255,59,48,0.2)'}` }}>
                <div style={{ fontSize:32, marginBottom:8 }}>{vrResult.icon}</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{vrResult.title}</div>
                <div style={{ fontSize:13, color:'var(--text3)' }}>{vrResult.sub}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
