import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Phone() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (phone.length < 9) {
      setError('أدخل رقماً صحيحاً');
      return;
    }
    setError('');
    setLoading(true);
    const fullPhone = '+966' + phone;

    try {
      const q = query(collection(db, 'users'), where('phone', '==', fullPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // المستخدم موجود → تسجيل دخول
        navigate('/login', { state: { phone: fullPhone, userId: snap.docs[0].id } });
      } else {
        // مستخدم جديد → التحقق من الموقع أولاً
        navigate('/geo', { state: { phone: fullPhone } });
      }
    } catch {
      navigate('/geo', { state: { phone: fullPhone } });
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top,0px) + 16px) 20px 0' }}>
        <button className="nav-btn" onClick={() => navigate('/')}>‹ رجوع</button>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 20px 48px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>أدخل رقمك</div>
          <div style={{ fontSize: 15, color: 'var(--text3)' }}>نتحقق أنك من أهل شرورة</div>
        </div>

        {/* حقل الهاتف */}
        <div style={{
          background: 'var(--bg2)', borderRadius: 14, overflow: 'hidden',
          display: 'flex', alignItems: 'center', direction: 'ltr',
          height: 58, marginBottom: 12,
        }}>
          <div style={{
            padding: '0 14px', borderLeft: '1px solid var(--sep)',
            fontSize: 15, fontWeight: 600, color: 'var(--text3)',
            height: '100%', display: 'flex', alignItems: 'center',
          }}>
            🇸🇦 +966
          </div>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            placeholder="5X XXX XXXX"
            style={{
              flex: 1, border: 'none', background: 'none',
              padding: '0 14px', fontSize: 18, fontWeight: 600,
              fontFamily: "'Tajawal', sans-serif", color: 'var(--text)',
              outline: 'none', direction: 'ltr', height: '100%',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button className="btn-main" onClick={handleContinue} disabled={loading}>
          {loading ? '⏳ جاري التحقق...' : 'متابعة ←'}
        </button>
      </div>
    </div>
  );
}
