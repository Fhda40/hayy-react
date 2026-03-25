import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Rating() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { store, couponId } = state || {};

  const [applied, setApplied] = useState(null); // true | false | null
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const uid = localStorage.getItem('h_uid') || 'guest';
    try {
      await addDoc(collection(db,'ratings'), {
        user_id: uid,
        business_id: store?.id || '',
        business_name: store?.name || '',
        coupon_id: couponId || '',
        discount_applied: applied,
        stars,
        comment: comment.trim(),
        created_at: serverTimestamp(),
      });
      if (applied === false) {
        await addDoc(collection(db,'complaints'), {
          user_id: uid,
          business_id: store?.id || '',
          business_name: store?.name || '',
          coupon_id: couponId || '',
          created_at: serverTimestamp(),
          status: 'open',
        });
      }
    } catch {}
    navigate('/stores');
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ padding:'calc(env(safe-area-inset-top,0px) + 16px) 20px 0', textAlign:'center', fontSize:17, fontWeight:600 }}>
        تقييم التجربة
      </div>

      <div style={{ padding:'20px 24px', flex:1, display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:52, marginBottom:14 }}>🧾</div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>هل طُبّق الخصم؟</div>
          <div style={{ fontSize:14, color:'var(--text3)' }}>
            ساعدنا في متابعة <strong style={{ color:'var(--text)' }}>{store?.name || 'المحل'}</strong>
          </div>
        </div>

        {/* Yes / No */}
        <div style={{ display:'flex', gap:12, marginBottom:20 }}>
          <div
            onClick={() => setApplied(true)}
            style={{
              flex:1, border:`1.5px solid ${applied===true ? 'var(--green)' : 'var(--sep)'}`,
              borderRadius:14, padding:'18px 12px', textAlign:'center', cursor:'pointer',
              background: applied===true ? 'rgba(52,199,89,0.06)' : '#fff',
            }}
          >
            <div style={{ fontSize:28, marginBottom:6 }}>✅</div>
            <div style={{ fontWeight:600, color:'#1a7a3a' }}>نعم، طُبّق</div>
          </div>
          <div
            onClick={() => setApplied(false)}
            style={{
              flex:1, border:`1.5px solid ${applied===false ? 'var(--red)' : 'var(--sep)'}`,
              borderRadius:14, padding:'18px 12px', textAlign:'center', cursor:'pointer',
              background: applied===false ? 'rgba(255,59,48,0.06)' : '#fff',
            }}
          >
            <div style={{ fontSize:28, marginBottom:6 }}>❌</div>
            <div style={{ fontWeight:600, color:'var(--red)' }}>لم يُطبَّق</div>
          </div>
        </div>

        {/* Stars */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:8 }}>قيّم تجربتك</div>
          <div style={{ display:'flex', gap:4 }}>
            {[1,2,3,4,5].map(v => (
              <button
                key={v}
                onClick={() => setStars(v)}
                style={{
                  fontSize:28, background:'none', border:'none', cursor:'pointer', padding:4,
                  filter: v <= stars ? 'none' : 'grayscale(1)',
                  transition: 'filter 0.15s',
                }}
              >⭐</button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="تعليق اختياري..."
          className="field"
          style={{ marginBottom:16 }}
        />

        <button className="btn-main" style={{ margin:0 }} onClick={submit} disabled={loading}>
          {loading ? '⏳...' : 'إرسال التقييم'}
        </button>

        <div style={{ height:12 }} />

        <button
          onClick={() => navigate('/stores')}
          style={{ background:'none', border:'none', color:'var(--text3)', fontSize:14, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', textAlign:'center', width:'100%' }}
        >
          تخطي
        </button>
      </div>
    </div>
  );
}
