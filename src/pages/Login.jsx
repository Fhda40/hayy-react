import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { sha256 } from '../hooks/useSha256';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { phone, userId } = location.state || {};

  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(false);
    try {
      const hashed = await sha256(pass);
      const q = query(
        collection(db, 'users'),
        where('phone', '==', phone),
        where('password', '==', hashed)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        login({ phone, uid: snap.docs[0].id, name: data.name || '' });
        navigate('/stores');
      } else {
        setError(true);
      }
    } catch {
      setError(true);
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>أهلاً بعودتك!</div>
          <div style={{ fontSize: 15, color: 'var(--text3)' }}>{phone}</div>
        </div>

        {/* حقل كلمة المرور */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="كلمة المرور"
            className="field"
            style={{ paddingLeft: 44 }}
          />
          <button
            onClick={() => setShowPass(v => !v)}
            style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>

        {error && (
          <div style={{
            color: 'var(--red)', fontSize: 13, textAlign: 'center',
            marginBottom: 10, padding: 10,
            background: 'rgba(255,59,48,0.06)', borderRadius: 10,
          }}>
            ❌ كلمة المرور غير صحيحة
          </div>
        )}

        <button className="btn-main" onClick={handleLogin} disabled={loading}>
          {loading ? '⏳...' : 'دخول ←'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => navigate('/forgot', { state: { phone } })}
            style={{
              background: 'none', border: 'none',
              color: 'var(--blue)', fontSize: 14,
              fontFamily: "'Tajawal', sans-serif", cursor: 'pointer',
            }}
          >
            نسيت كلمة المرور؟
          </button>
        </div>
      </div>
    </div>
  );
}
