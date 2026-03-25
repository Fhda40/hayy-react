import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, getDocs, runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { sha256 } from '../../hooks/useSha256';

export default function MerchantRegister() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phone } = state || {};
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function register() {
    if (pass.length < 6) { setError('6 أحرف على الأقل'); return; }
    if (pass !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    setError(''); setLoading(true);
    try {
      const hashed = await sha256(pass, 'hayy_salt_2026');
      // Sign in anonymously to get a Firebase UID for Firestore security rules
      const { user } = await signInAnonymously(auth);
      const uid = user.uid;
      // Use a transaction to safely assign founder numbers without race conditions
      const counterRef = doc(db, 'meta', 'merchant_counter');
      let ref, isF, fNum;
      try {
        await runTransaction(db, async (tx) => {
          const counterSnap = await tx.get(counterRef);
          const count = counterSnap.exists() ? (counterSnap.data().count || 0) : 0;
          isF = count < 30;
          fNum = isF ? count + 1 : null;
          ref = doc(collection(db, 'merchants'));
          tx.set(ref, {
            phone, password: hashed, uid,
            is_founder: isF, founder_number: fNum,
            founder_since: isF ? new Date().toISOString() : null,
            free_trial_ends: isF ? new Date(Date.now() + 90 * 864e5).toISOString() : null,
            created_at: serverTimestamp(),
          });
          tx.set(counterRef, { count: count + 1 }, { merge: true });
        });
      } catch {
        // Fallback if meta collection not accessible
        const all = await getDocs(collection(db, 'merchants'));
        isF = all.size < 30;
        fNum = isF ? all.size + 1 : null;
        ref = await addDoc(collection(db, 'merchants'), {
          phone, password: hashed, uid,
          is_founder: isF, founder_number: fNum,
          founder_since: isF ? new Date().toISOString() : null,
          free_trial_ends: isF ? new Date(Date.now() + 90 * 864e5).toISOString() : null,
          created_at: serverTimestamp(),
        });
      }
      localStorage.setItem('m_id', ref.id);
      localStorage.setItem('m_phone', phone);
      navigate('/merchant/dash', { state: { mid: ref.id, phone, data: { is_founder: isF, founder_number: fNum, free_trial_ends: isF ? new Date(Date.now() + 90 * 864e5).toISOString() : null } } });
    } catch (e) { setError('حدث خطأ، حاول مجدداً'); }
    setLoading(false);
  }

  const btnStyle = { display:'block', width:'100%', padding:17, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' };

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/merchant/phone')}>‹ رجوع</button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 20px 48px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
          <div style={{ fontSize:24, fontWeight:700 }}>حساب جديد</div>
        </div>
        <div style={{ background:'var(--bg2)', borderRadius:14, overflow:'hidden', marginBottom:12 }}>
          <div style={{ position:'relative', borderBottom:'1px solid var(--sep)' }}>
            <input type={showP ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="كلمة المرور (6+)" className="field" style={{ borderRadius:0, paddingLeft:44 }} />
            <button onClick={() => setShowP(v=>!v)} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:20, cursor:'pointer' }}>{showP?'🙈':'👁️'}</button>
          </div>
          <div style={{ position:'relative' }}>
            <input type={showC ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" className="field" style={{ borderRadius:0, paddingLeft:44 }} />
            <button onClick={() => setShowC(v=>!v)} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:20, cursor:'pointer' }}>{showC?'🙈':'👁️'}</button>
          </div>
        </div>
        {error && <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10, padding:10, background:'rgba(255,59,48,0.06)', borderRadius:10 }}>{error}</div>}
        <button onClick={register} disabled={loading} style={{ ...btnStyle, opacity: loading ? .6 : 1 }}>
          {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب ←'}
        </button>
      </div>
    </div>
  );
}
