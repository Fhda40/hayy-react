import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_PASS = 'hayy_admin_2026';
let failedAttempts = 0, lockoutUntil = 0;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  function login() {
    const now = Date.now();
    if (now < lockoutUntil) {
      const mins = Math.ceil((lockoutUntil - now) / 60000);
      setError(`🔒 محظور مؤقتاً — حاول بعد ${mins} دقيقة`);
      return;
    }
    if (pass === ADMIN_PASS) {
      failedAttempts = 0;
      sessionStorage.setItem('h_admin', '1');
      navigate('/admin/dash');
    } else {
      failedAttempts++;
      setPass('');
      if (failedAttempts >= 5) {
        lockoutUntil = Date.now() + 15 * 60 * 1000;
        setError('🔒 تم تجميد الدخول 15 دقيقة بعد 5 محاولات فاشلة');
      } else {
        setError(`❌ كلمة المرور غير صحيحة (${failedAttempts}/5)`);
      }
      setTimeout(() => setError(''), 4000);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:32, background:'var(--bg2)' }}>
      <div style={{ width:76, height:76, background:'#0A2540', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, marginBottom:24, boxShadow:'0 8px 24px rgba(10,37,64,.3)' }}>🛡️</div>
      <div style={{ fontSize:26, fontWeight:900, color:'#0A2540', marginBottom:4 }}>لوحة الإدارة</div>
      <div style={{ fontSize:14, color:'var(--text3)', marginBottom:40 }}>حيّ — شرورة</div>
      <div style={{ width:'100%', maxWidth:320 }}>
        <div style={{ position:'relative', marginBottom:12 }}>
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="كلمة المرور"
            className="field"
            style={{ paddingLeft:46 }}
          />
          <button onClick={() => setShow(v => !v)} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:20, cursor:'pointer' }}>
            {show ? '🙈' : '👁️'}
          </button>
        </div>
        {error && (
          <div style={{ color:'var(--red)', fontSize:13, textAlign:'center', marginBottom:10, padding:8, background:'rgba(255,59,48,.06)', borderRadius:10 }}>
            {error}
          </div>
        )}
        <button className="btn-main" onClick={login}>دخول ←</button>
      </div>
    </div>
  );
}
