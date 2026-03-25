import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../firebase';

export default function MerchantPhone() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function check() {
    if (phone.length < 9) { setError('أدخل رقماً صحيحاً'); return; }
    setError(''); setLoading(true);
    const full = '+966' + phone;
    try {
      await signInAnonymously(auth).catch(() => {});
      const snap = await getDocs(query(collection(db,'merchants'), where('phone','==',full)));
      if (!snap.empty) {
        navigate('/merchant/login', { state: { phone: full, mid: snap.docs[0].id } });
      } else {
        navigate('/merchant/register', { state: { phone: full } });
      }
    } catch { navigate('/merchant/register', { state: { phone: full } }); }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/merchant')}>‹ رجوع</button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 20px 48px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📱</div>
          <div style={{ fontSize:24, fontWeight:700 }}>رقم الجوال</div>
        </div>
        <div style={{ background:'var(--bg2)', borderRadius:14, overflow:'hidden', display:'flex', alignItems:'center', direction:'ltr', height:58, marginBottom:12 }}>
          <div style={{ padding:'0 14px', borderLeft:'1px solid var(--sep)', fontSize:15, fontWeight:600, color:'var(--text3)', height:'100%', display:'flex', alignItems:'center' }}>🇸🇦 +966</div>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,9))} onKeyDown={e => e.key==='Enter' && check()} placeholder="5X XXX XXXX"
            style={{ flex:1, border:'none', background:'none', padding:'0 14px', fontSize:18, fontWeight:600, fontFamily:"'Tajawal',sans-serif", color:'var(--text)', outline:'none', direction:'ltr', height:'100%' }} />
        </div>
        {error && <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10 }}>{error}</div>}
        <button onClick={check} disabled={loading}
          style={{ display:'block', width:'100%', padding:17, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? '⏳...' : 'متابعة ←'}
        </button>
      </div>
    </div>
  );
}
