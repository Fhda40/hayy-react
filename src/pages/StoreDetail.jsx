import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { haversine, relativeDate } from '../utils';

export default function StoreDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const store = state?.store;
  const userPos = state?.userPos;

  const [reviews, setReviews] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!store) return;
    fetchReviews();
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReviews() {
    try {
      const q = query(
        collection(db, 'ratings'),
        where('business_id', '==', store.id),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  if (!store) { navigate('/stores'); return null; }

  const avgStars = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.stars || 0), 0) / reviews.length : 0;
  const comments = reviews.filter(r => r.comment?.trim()).slice(0, 10);
  const dist = userPos && store.lat && store.lng
    ? haversine(userPos.lat, userPos.lng, store.lat, store.lng) : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--bg2)' }}>
      {/* Header */}
      <div style={{ background:'#fff', padding:'calc(env(safe-area-inset-top,0px) + 12px) 20px 14px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--sep)' }}>
        <button className="nav-btn" onClick={() => navigate('/stores')} style={{ flexShrink:0 }}>‹ رجوع</button>
        <span style={{ fontSize:16, fontWeight:700, flex:1, textAlign:'center' }}>{store.name}</span>
        <div style={{ width:60 }} />
      </div>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

        {/* Store Hero */}
        <div style={{ background:'#fff', padding:'24px 20px 20px', textAlign:'center', marginBottom:10 }}>
          <div style={{ width:80, height:80, borderRadius:20, background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, overflow:'hidden', margin:'0 auto 14px' }}>
            {store.logo_url
              ? <img src={store.logo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={store.name} />
              : store.icon || '🏪'}
          </div>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{store.name}</div>
          {store.is_founder && (
            <span style={{ fontSize:11, fontWeight:700, borderRadius:8, padding:'3px 10px', color:'#fff', background:'#0A2540', marginBottom:8, display:'inline-block' }}>🎖️ عضو مؤسس</span>
          )}
          <div style={{ fontSize:14, color:'var(--text3)', marginBottom:12 }}>{store.type}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'rgba(29,29,31,0.07)', color:'var(--text)', fontSize:15, fontWeight:700, padding:'6px 18px', borderRadius:20 }}>
              خصم {store.discount || 0}%
            </span>
            {reviews.length > 0 && (
              <span style={{ fontSize:13, color:'#FF9500', fontWeight:700 }}>★ {avgStars.toFixed(1)}</span>
            )}
            {dist && (
              <span style={{ fontSize:12, color:'var(--text4)' }}>📍 {dist < 1 ? Math.round(dist*1000)+'م' : dist.toFixed(1)+'كم'}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {store.description && (
          <div style={{ background:'#fff', margin:'0 0 10px', padding:'16px 20px' }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>📝 عن النشاط</div>
            <div style={{ fontSize:14, color:'var(--text3)', lineHeight:1.7 }}>{store.description}</div>
          </div>
        )}

        {/* Area */}
        {store.area && (
          <div style={{ background:'#fff', margin:'0 0 10px', padding:'14px 20px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>📍</span>
            <span style={{ fontSize:14, color:'var(--text3)' }}>{store.area}</span>
          </div>
        )}

        {/* Photos */}
        {store.photos?.length > 0 && (
          <div style={{ background:'#fff', margin:'0 0 10px', padding:'16px 20px 16px' }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>📸 الصور</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {store.photos.map((u, i) => (
                <div key={i} onClick={() => setSelectedPhoto(u)}
                  style={{ aspectRatio:'1', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                  <img src={u} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {store.lat && store.lng && (
          <div style={{ margin:'0 0 10px', padding:'0 16px' }}>
            <a href={`https://maps.google.com/?q=${store.lat},${store.lng}`} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'#fff', borderRadius:16, textDecoration:'none', color:'var(--text)' }}>
              <span style={{ fontSize:28 }}>🗺️</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>عرض على الخريطة</div>
                {dist && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                  {dist < 1 ? `${Math.round(dist*1000)} متر منك` : `${dist.toFixed(1)} كم منك`}
                </div>}
              </div>
              <span style={{ marginRight:'auto', fontSize:18, color:'var(--text4)' }}>›</span>
            </a>
          </div>
        )}

        {/* Ratings */}
        <div style={{ background:'#fff', margin:'0 0 10px', padding:'16px 20px' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>⭐ التقييمات والتعليقات</div>
          {reviews.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--text4)', fontSize:13, padding:'12px 0' }}>لا يوجد تقييمات بعد — كن أول من يقيّم</div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'12px 16px', background:'var(--bg2)', borderRadius:12 }}>
                <div style={{ fontSize:36, fontWeight:900, color:'#1D1D1F' }}>{avgStars.toFixed(1)}</div>
                <div>
                  <div style={{ display:'flex', gap:2, marginBottom:2 }}>
                    {[1,2,3,4,5].map(v => (
                      <span key={v} style={{ fontSize:18, color: v <= Math.round(avgStars) ? '#FF9500' : '#E0E0E0' }}>★</span>
                    ))}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>بناءً على {reviews.length} تقييم</div>
                </div>
              </div>
              {comments.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {comments.map(r => (
                    <div key={r.id} style={{ borderTop:'1px solid var(--sep)', paddingTop:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>👤</div>
                        <div>
                          <div style={{ display:'flex', gap:1 }}>
                            {[1,2,3,4,5].map(v => (
                              <span key={v} style={{ fontSize:12, color: v <= (r.stars||0) ? '#FF9500' : '#E0E0E0' }}>★</span>
                            ))}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text4)' }}>{relativeDate(r.created_at)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.6, paddingRight:36 }}>{r.comment}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ height:100 }} />
      </div>

      {/* Sticky bottom button */}
      <div style={{ position:'sticky', bottom:0, background:'#fff', borderTop:'1px solid var(--sep)', padding:'12px 16px calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
        <button
          className="btn-main"
          style={{ margin:0 }}
          onClick={() => navigate('/coupon', { state: { store, userPos } })}
        >
          🎁 احصل على خصمك
        </button>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={selectedPhoto} style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain', borderRadius:12 }} alt="" />
          <button onClick={() => setSelectedPhoto(null)}
            style={{ position:'absolute', top:20, left:20, background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:36, height:36, borderRadius:'50%', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
      )}
    </div>
  );
}
