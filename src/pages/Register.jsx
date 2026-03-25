import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { sha256 } from '../hooks/useSha256';
import { useAuth } from '../context/AuthContext';

function getStrength(pass) {
  if (!pass) return null;
  let s = 0;
  if (pass.length >= 6) s++;
  if (pass.length >= 10) s++;
  if (/[A-Z]|[a-z]/.test(pass)) s++;
  if (/[0-9]/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  if (s <= 2) return { label: '⚠️ ضعيفة', color: 'var(--red)' };
  if (s === 3) return { label: '🔶 متوسطة', color: '#FF9500' };
  return { label: '✅ قوية', color: 'var(--green)' };
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { phone } = location.state || {};

  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(pass);

  async function handleRegister() {
    if (pass.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return; }
    if (pass !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
    setError('');
    setLoading(true);
    try {
      const { user } = await signInAnonymously(auth);
      const hashed = await sha256(pass);
      await setDoc(doc(db, 'users', user.uid), {
        phone, password: hashed, name, email,
        created_at: serverTimestamp(),
      });
      login({ phone, uid: user.uid, name });
      navigate('/stores');
    } catch (e) {
      setError(e?.message || 'حدث خطأ — حاول مجدداً');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/phone')}>‹ رجوع</button>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 20px 48px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>مرحباً بك!</div>
          <div style={{ fontSize: 15, color: 'var(--text3)' }}>أنشئ كلمة مرور لحسابك</div>
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          {/* كلمة المرور */}
          <div style={{ position: 'relative', borderBottom: '1px solid var(--sep)' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="كلمة المرور (6 أحرف+)"
              className="field"
              style={{ borderRadius: 0, paddingLeft: 44 }}
            />
            <button onClick={() => setShowPass(v => !v)} style={eyeBtn}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
          {/* تأكيد كلمة المرور */}
          <div style={{ position: 'relative', borderBottom: '1px solid var(--sep)' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="field"
              style={{ borderRadius: 0, paddingLeft: 44 }}
            />
            <button onClick={() => setShowConfirm(v => !v)} style={eyeBtn}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
          {/* الاسم */}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="اسمك"
            className="field"
            style={{ borderRadius: 0, borderBottom: '1px solid var(--sep)' }}
          />
          {/* الإيميل */}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="الإيميل (اختياري)"
            className="field"
            style={{ borderRadius: 0, direction: 'ltr', textAlign: 'left' }}
          />
        </div>

        {/* مؤشر القوة */}
        {strength && (
          <div style={{ fontSize: 12, textAlign: 'center', marginBottom: 10, color: strength.color }}>
            {strength.label}
          </div>
        )}

        {error && (
          <div style={{
            color: 'var(--red)', fontSize: 13, textAlign: 'center',
            marginBottom: 10, padding: 10,
            background: 'rgba(255,59,48,0.06)', borderRadius: 10,
          }}>
            {error}
          </div>
        )}

        <button className="btn-main" onClick={handleRegister} disabled={loading}>
          {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب ←'}
        </button>
      </div>
    </div>
  );
}

const eyeBtn = {
  position: 'absolute', left: 14, top: '50%',
  transform: 'translateY(-50%)',
  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
};
