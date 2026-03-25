import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { sha256 } from '../../hooks/useSha256';

export default function MerchantLogin() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phone, mid } = state || {};
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true); setError(false);
    try {
      const hashed = await sha256(pass, 'hayy_salt_2026');
      const snap = await getDocs(query(collection(db,'merchants'), where('phone','==',phone), where('password','==',hashed)));
      if (!snap.empty) {
        // Sign in anonymously using the stored uid if available (preserves Firestore rules access)
        const storedUid = snap.docs[0].data().uid;
        await signInAnonymously(auth);
        // Only update last_login, never overwrite uid (would break Firestore rules)
        await setDoc(doc(db,'merchants',snap.docs[0].id), { last_login: serverTimestamp() }, { merge: true }).catch(() => {});
        localStorage.setItem('m_id', snap.docs[0].id);
        localStorage.setItem('m_phone', phone);
        if (storedUid) localStorage.setItem('m_uid', storedUid);
        navigate('/merchant/dash', { state: { mid: snap.docs[0].id, phone, data: snap.docs[0].data() } });
      } else setError(true);
    } catch { setError(true); }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/merchant/phone')}>‹ رجوع</button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 20px 48px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👋</div>
          <div style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>أهلاً بعودتك!</div>
          <div style={{ fontSize:15, color:'var(--text3)' }}>{phone}</div>
        </div>
        <div style={{ position:'relative', marginBottom:12 }}>
          <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} placeholder="كلمة المرور" className="field" style={{ paddingLeft:44 }} />
          <button onClick={() => setShow(v => !v)} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:20, cursor:'pointer' }}>{show ? '🙈' : '👁️'}</button>
        </div>
        {error && <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10, padding:10, background:'rgba(255,59,48,0.06)', borderRadius:10 }}>❌ كلمة المرور غير صحيحة</div>}
        <button onClick={login} disabled={loading}
          style={{ display:'block', width:'100%', padding:17, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? '⏳...' : 'دخول ←'}
        </button>
      </div>
    </div>
  );
}
