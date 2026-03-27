import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { initPush } from '../hooks/usePush';
import StoreSkeleton from '../components/StoreSkeleton';
import { haversine } from '../utils';


const FILTERS = [
  { id: 'all', label: '🏪 الكل' },
  { id: 'popular', label: '🔥 الأكثر طلباً' },
  { id: 'nearest', label: '📍 الأقرب' },
  { id: 'discount', label: '💰 أعلى خصم' },
];

export default function Stores() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stores, setStores] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [popularity, setPopularity] = useState({});
  const [ratings, setRatings] = useState({});
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);

  const userPhone = user?.phone;
  useEffect(() => {
    loadStores();
    const t = setTimeout(() => initPush(userPhone), 3000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStores() {
    const inactivePhones = new Set();
    const all = [];

    try {
      const ms = await getDocs(collection(db, 'merchants'));
      ms.forEach(m => {
        const d = m.data();
        if (d.active === false && d.phone) inactivePhones.add(d.phone);
      });
    } catch {}

    try {
      const s = await getDocs(collection(db, 'businesses'));
      s.forEach(d => {
        const data = d.data();
        if (data.active === false) return;
        if (inactivePhones.has(data.phone)) return;
        all.push({ id: d.id, ...data });
      });
    } catch {}

    // Popularity
    const pop = {};
    try {
      const cs = await getDocs(collection(db, 'coupons'));
      cs.forEach(d => { const b = d.data().business_id; if (b) pop[b] = (pop[b] || 0) + 1; });
    } catch {}
    setPopularity(pop);

    // Ratings
    const rat = {}, rd = {};
    try {
      const rs = await getDocs(collection(db, 'ratings'));
      rs.forEach(d => {
        const r = d.data();
        if (!rd[r.business_id]) rd[r.business_id] = { t: 0, c: 0 };
        if (r.stars) { rd[r.business_id].t += r.stars; rd[r.business_id].c++; }
      });
      Object.keys(rd).forEach(id => { rat[id] = (rd[id].t / rd[id].c).toFixed(1); });
    } catch {}
    setRatings(rat);

    // Location
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
      );
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {}

    setStores(all);
    setLoading(false);
  }

  function sorted() {
    const a = [...stores];
    if (filter === 'popular') return a.sort((x, y) => (popularity[y.id] || 0) - (popularity[x.id] || 0));
    if (filter === 'nearest' && userPos) return a.sort((x, y) => {
      const dx = x.lat && x.lng ? haversine(userPos.lat, userPos.lng, x.lat, x.lng) : 999;
      const dy = y.lat && y.lng ? haversine(userPos.lat, userPos.lng, y.lat, y.lng) : 999;
      return dx - dy;
    });
    if (filter === 'discount') return a.sort((x, y) => (y.discount || 0) - (x.discount || 0));
    return a;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: 'calc(env(safe-area-inset-top,0px) + 14px) 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="https://res.cloudinary.com/dtwgl17iy/image/upload/v1774160618/%D8%AD%D9%8E%D9%8A%D9%91_otbkdk.png" style={{ height: 34, objectFit: 'contain' }} alt="حيّ" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', borderRadius: 20, padding: '5px 12px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>شرورة</span>
        </div>
      </div>

      <div style={{ padding: '14px 20px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 26, fontWeight: 900 }}>العروض</span>
        <span style={{ fontSize: 13, color: 'var(--text4)' }}>{stores.length} محل</span>
      </div>

      {user?.name && (
        <div style={{ padding: '0 20px 10px', fontSize: 14, color: 'var(--text3)' }}>
          أهلاً {user.name} 👋
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
        <div style={{ display: 'inline-flex', gap: 8, direction: 'rtl' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: '1.5px solid', whiteSpace: 'nowrap', cursor: 'pointer',
                fontFamily: "'Tajawal', sans-serif",
                borderColor: filter === f.id ? '#1D1D1F' : 'var(--sep)',
                background: filter === f.id ? '#1D1D1F' : '#fff',
                color: filter === f.id ? '#fff' : 'var(--text)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:'0 16px 10px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ابحث عن محل..."
          className="field"
          style={{ margin:0 }}
        />
      </div>

      {/* Stores List */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <StoreSkeleton />
        ) : (() => {
          const list = sorted().filter(s => !search || s.name?.includes(search) || s.type?.includes(search));
          if (list.length === 0) return (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🏪</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>
                {search ? 'لا توجد نتائج' : 'لا توجد أنشطة بعد'}
              </div>
              <div style={{ fontSize:14, color:'var(--text3)' }}>
                {search ? `لم نجد نشاطاً يطابق "${search}"` : 'سيتم إضافة أنشطة قريباً'}
              </div>
            </div>
          );
          return list.map(s => {
            const avg = ratings[s.id];
            const dist = userPos && s.lat && s.lng
              ? haversine(userPos.lat, userPos.lng, s.lat, s.lng).toFixed(1) + ' كم'
              : null;
            return (
              <button
                key={s.id}
                onClick={() => navigate('/store', { state: { store: s } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', borderBottom: '1px solid var(--sep)',
                  background: '#fff', cursor: 'pointer', width: '100%',
                  border: 'none', borderBottom: '1px solid var(--sep)', textAlign: 'right',
                }}
              >
                {/* Logo */}
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, overflow: 'hidden' }}>
                  {s.logo_url
                    ? <img src={s.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} alt={s.name} />
                    : s.icon || '🏪'
                  }
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {s.is_founder && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px', color: '#fff', background: '#0A2540' }}>🎖️ مؤسس</span>}
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
                    {avg && <span style={{ fontSize: 11, color: '#FF9500', fontWeight: 600 }}>★ {avg}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{s.type}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ display: 'inline-block', background: 'rgba(29,29,31,0.06)', color: 'var(--text)', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                      خصم {s.discount || 0}%
                    </span>
                    {dist && <span style={{ fontSize: 11, color: 'var(--text4)' }}>📍 {dist}</span>}
                  </div>
                </div>
                <div style={{ color: 'var(--text4)', fontSize: 18, marginRight: 'auto', flexShrink: 0 }}>›</div>
              </button>
            );
          });
        })()}
        <div style={{ padding: '10px 20px calc(env(safe-area-inset-bottom,0px) + 10px)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>صُنع بـ ❤️ في شرورة — من أهلها لأهلها</div>
        </div>
      </div>

      <Assistant stores={stores} />
    </div>
  );
}
