import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { sha256 } from '../hooks/useSha256';
import { toast } from '../components/Toast';

export default function Forgot() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phone } = state || {};

  const [step, setStep] = useState('email'); // email | newpass
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verifyEmail() {
    setLoading(true); setError('');
    try {
      const q = query(collection(db,'users'), where('phone','==',phone), where('email','==',email));
      const snap = await getDocs(q);
      if (!snap.empty) { setUserId(snap.docs[0].id); setStep('newpass'); }
      else setError('الإيميل غير مطابق');
    } catch { setError('حدث خطأ — حاول مجدداً'); }
    setLoading(false);
  }

  async function savePass() {
    if (newPass.length < 6) { setError('6 أحرف على الأقل'); return; }
    if (newPass !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    setLoading(true); setError('');
    try {
      const hashed = await sha256(newPass);
      await setDoc(doc(db,'users',userId), { password: hashed }, { merge: true });
      toast('✅ تم تغيير كلمة المرور بنجاح');
      navigate('/login', { state: { phone } });
    } catch { setError('حدث خطأ — حاول مجدداً'); }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate(-1)}>‹ رجوع</button>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 20px 48px' }}>
        {step === 'email' ? (
          <>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔑</div>
              <div style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>إعادة تعيين</div>
              <div style={{ fontSize:15, color:'var(--text3)' }}>أدخل الإيميل المسجّل</div>
            </div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="الإيميل المسجّل" className="field"
              style={{ marginBottom:12, direction:'ltr', textAlign:'left' }} />
            {error && <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10, padding:10, background:'rgba(255,59,48,0.06)', borderRadius:10 }}>{error}</div>}
            <button className="btn-main" onClick={verifyEmail} disabled={loading}>
              {loading ? '⏳...' : 'تحقق ←'}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
              <div style={{ fontSize:24, fontWeight:700 }}>كلمة مرور جديدة</div>
            </div>
            <div style={{ background:'var(--bg2)', borderRadius:14, overflow:'hidden', marginBottom:12 }}>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="كلمة المرور الجديدة" className="field"
                style={{ borderRadius:0, borderBottom:'1px solid var(--sep)' }} />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="تأكيد كلمة المرور" className="field" style={{ borderRadius:0 }} />
            </div>
            {error && <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10, padding:10, background:'rgba(255,59,48,0.06)', borderRadius:10 }}>{error}</div>}
            <button className="btn-main" onClick={savePass} disabled={loading}>
              {loading ? '⏳...' : 'حفظ ←'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
