import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, setDoc, doc, addDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from '../../components/Toast';

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function timeAgo(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return Math.floor(s/60) + ' دقيقة';
  if (s < 86400) return Math.floor(s/3600) + ' ساعة';
  return Math.floor(s/86400) + ' يوم';
}

export default function AdminDash() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [merchants, setMerchants] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState('all');
  const [compFilter, setCompFilter] = useState('open');
  const [refreshing, setRefreshing] = useState(false);
  const [addForm, setAddForm] = useState({ name:'', type:'', discount:10, icon:'🏪', description:'', area:'', phone:'' });
  const [addSaving, setAddSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => { loadAll(); loadReports(); }, []);

  async function loadReports() {
    try {
      const snap = await getDocs(query(collection(db,'reports'), orderBy('created_at','desc'), limit(10)));
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  async function loadAll() {
    await Promise.all([loadMerchants(), loadCoupons(), loadComplaints()]);
  }

  async function loadMerchants() {
    try {
      const snap = await getDocs(collection(db,'merchants'));
      setMerchants(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch { toast('⚠️ خطأ في التجار'); }
  }

  async function loadCoupons() {
    try {
      const snap = await getDocs(collection(db,'coupons'));
      setCoupons(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.created_at?.toDate?.()??0) - (a.created_at?.toDate?.()??0)));
    } catch {}
  }

  async function loadComplaints() {
    try {
      const snap = await getDocs(collection(db,'complaints'));
      setComplaints(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.created_at?.toDate?.()??0) - (a.created_at?.toDate?.()??0)));
    } catch {}
  }

  async function refresh() {
    setRefreshing(true);
    await loadAll();
    toast('✅ تم التحديث');
    setRefreshing(false);
  }

  async function toggleMerchant(m) {
    const newActive = m.active === false;
    try {
      await setDoc(doc(db,'merchants',m.id), { active:newActive, updated_at:serverTimestamp() }, { merge:true });
      const biz = await getDocs(query(collection(db,'businesses'), where('phone','==',m.phone||'')));
      if (!biz.empty) await setDoc(doc(db,'businesses',biz.docs[0].id), { active:newActive }, { merge:true });
      setMerchants(prev => prev.map(x => x.id===m.id ? {...x, active:newActive} : x));
      toast(newActive ? '✅ تم التفعيل' : '⛔ تم التعطيل');
    } catch { toast('❌ حدث خطأ'); }
  }

  async function resolveComp(id) {
    try {
      await setDoc(doc(db,'complaints',id), { status:'resolved', resolved_at:serverTimestamp() }, { merge:true });
      setComplaints(prev => prev.map(c => c.id===id ? {...c, status:'resolved'} : c));
      toast('✅ الشكوى محلولة');
    } catch { toast('❌ خطأ'); }
  }

  // Overview stats
  const total = merchants.length;
  const active = merchants.filter(m => m.active !== false).length;
  const today = new Date(); today.setHours(0,0,0,0);
  const cToday = coupons.filter(c => { const t = c.created_at?.toDate?.(); return t && t >= today; }).length;
  const open = complaints.filter(c => c.status === 'open').length;
  const week = new Date(Date.now() - 7*86400000);
  const wc = coupons.filter(c => { const t = c.created_at?.toDate?.(); return t && t >= week; });
  const wUsed = wc.filter(c => c.status==='used').length;
  const wExp = wc.filter(c => c.status==='expired').length;
  const wRate = wc.length ? Math.round(wUsed/wc.length*100)+'%' : '—';

  const countMap = {};
  coupons.filter(c => c.status==='used').forEach(c => { if (c.business_name) countMap[c.business_name] = (countMap[c.business_name]||0)+1; });
  const top = Object.entries(countMap).sort((a,b) => b[1]-a[1]).slice(0,5);

  const filteredM = merchants.filter(m => !search || m.store_name?.includes(search) || m.phone?.includes(search));
  const filteredC = couponFilter==='all' ? coupons : coupons.filter(c => c.status===couponFilter);
  const filteredComp = complaints.filter(c => c.status===compFilter);

  const statusMap = { used:'مُستخدم', pending:'نشط', expired:'منتهي' };
  const statusCls = { used:'rgba(52,199,89,.12)', pending:'rgba(255,149,0,.12)', expired:'rgba(142,142,147,.12)' };
  const statusClr = { used:'#1a7a3a', pending:'#8a5000', expired:'var(--text3)' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg2)' }}>
      {/* Header */}
      <div style={{ background:'#0A2540', padding:'calc(env(safe-area-inset-top,0px)+14px) 18px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:22 }}>🛡️</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>لوحة الإدارة</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>حيّ — شرورة</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={refresh} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'#fff', padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' }}>
            {refreshing ? '⏳' : '🔄'}
          </button>
          <button onClick={() => { sessionStorage.removeItem('h_admin'); navigate('/admin'); }}
            style={{ background:'rgba(255,255,255,.12)', border:'none', color:'#fff', padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' }}>
            خروج
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid var(--sep)', flexShrink:0, overflowX:'auto', scrollbarWidth:'none' }}>
        {[['overview','📊 عام'],['merchants','🏪 التجار'],['coupons','🎟️ الكوبونات'],['complaints','⚠️ الشكاوى'],['reports','🤖 تقارير'],['add','➕ إضافة']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, minWidth:72, padding:'13px 8px', fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", background:'none', border:'none', borderBottom:`2px solid ${tab===id ? '#0A2540' : 'transparent'}`, color: tab===id ? '#0A2540' : 'var(--text3)', cursor:'pointer', whiteSpace:'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ padding:'14px 14px 40px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[['—', total, 'إجمالي التجار',''],['var(--green)', active, 'نشطون',''],['var(--blue)', cToday, 'كوبونات اليوم',''],['var(--orange,#FF9500)', open, 'شكاوى مفتوحة','']].map(([color,val,lbl],i) => (
                <div key={i} style={{ background:'#fff', borderRadius:16, padding:16, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:32, fontWeight:900, lineHeight:1, color: i>0 ? color : 'var(--text)' }}>{val}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--sep)', fontSize:15, fontWeight:700 }}>📈 هذا الأسبوع</div>
              <div style={{ padding:14 }}>
                {[['كوبونات مُستخدمة', wUsed],['منتهية الصلاحية', wExp],['معدل الاستخدام', wRate]].map(([l,v],i) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom: i<2 ? '1px solid var(--sep)' : 'none' }}>
                    <span style={{ fontSize:14, color:'var(--text3)' }}>{l}</span>
                    <span style={{ fontSize:14, fontWeight:700, color: i===2 ? 'var(--blue)' : 'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--sep)', fontSize:15, fontWeight:700 }}>🏆 أكثر التجار نشاطاً</div>
              {top.length
                ? top.map(([n,cnt],i) => (
                  <div key={n} style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom: i<top.length-1 ? '1px solid var(--sep)' : 'none' }}>
                    <span style={{ fontSize:16, fontWeight:900, color:'var(--text4)', width:24 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:14 }}>{n}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--blue)' }}>{cnt} كوبون</span>
                  </div>))
                : <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text4)' }}><div style={{ fontSize:32, marginBottom:8 }}>📊</div><div style={{ fontSize:14 }}>لا بيانات بعد</div></div>}
            </div>
          </div>
        )}

        {/* ── MERCHANTS ── */}
        {tab === 'merchants' && (
          <div style={{ padding:'14px 14px 40px' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث..." className="field" style={{ marginBottom:12 }} />
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              {filteredM.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text4)' }}><div style={{ fontSize:32 }}>🏪</div><div style={{ fontSize:14, marginTop:8 }}>لا يوجد تجار</div></div>
                : filteredM.map((m,i) => {
                  const isActive = m.active !== false;
                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', padding:'12px 14px', borderBottom: i<filteredM.length-1 ? '1px solid var(--sep)' : 'none', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, overflow:'hidden' }}>
                        {m.logo_url ? <img src={m.logo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : m.icon || '🏪'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {!m.cr_number && <span style={{ fontSize:10, background:'rgba(255,149,0,0.15)', color:'#8a5000', borderRadius:6, padding:'1px 6px', marginRight:4 }}>غير موثّق</span>}
                          {m.store_name || 'بدون اسم'}
                        </div>
                        <div style={{ fontSize:12, color:'var(--text3)', marginTop:1 }}>{m.phone || '—'}</div>
                        <div style={{ fontSize:12, color:'var(--text4)', marginTop:1 }}>{m.store_type || ''} {m.discount ? '• '+m.discount+'%' : ''}</div>
                        {m.cr_number && <div style={{ fontSize:11, color:'var(--text4)', marginTop:1 }}>🪪 س.ت: {m.cr_number}</div>}
                      </div>
                      {m.is_founder && <span style={{ fontSize:10, background:'#0A2540', color:'#fff', borderRadius:8, padding:'2px 8px', flexShrink:0 }}>🎖️ مؤسس</span>}
                      <button onClick={() => toggleMerchant(m)}
                        style={{ width:48, height:28, borderRadius:14, background: isActive ? 'var(--green)' : '#DCDCDC', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0, border:'none', outline:'none' }}>
                        <span style={{ position:'absolute', width:22, height:22, borderRadius:'50%', background:'#fff', top:3, right: isActive ? 23 : 3, transition:'right .2s', boxShadow:'0 1px 3px rgba(0,0,0,.25)' }} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── COUPONS ── */}
        {tab === 'coupons' && (
          <div style={{ padding:'14px 14px 40px' }}>
            <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', marginBottom:12 }}>
              {[['all','الكل'],['used','مُستخدم'],['pending','نشط'],['expired','منتهي']].map(([id,label]) => (
                <button key={id} onClick={() => setCouponFilter(id)}
                  style={{ padding:'7px 16px', border:`1.5px solid ${couponFilter===id ? '#1D1D1F' : 'var(--sep)'}`, borderRadius:20, background: couponFilter===id ? '#1D1D1F' : '#fff', fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", color: couponFilter===id ? '#fff' : 'var(--text3)', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              {filteredC.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text4)' }}><div style={{ fontSize:32 }}>🎟️</div><div style={{ fontSize:14, marginTop:8 }}>لا توجد كوبونات</div></div>
                : filteredC.slice(0,60).map((c,i) => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderBottom: i<Math.min(filteredC.length,60)-1 ? '1px solid var(--sep)' : 'none' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.business_name || '—'}</div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2, direction:'ltr', textAlign:'right' }}>{c.code || '—'} · {timeAgo(c.created_at)}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:10, flexShrink:0, marginRight:10, background: statusCls[c.status] || statusCls.expired, color: statusClr[c.status] || statusClr.expired }}>
                      {statusMap[c.status] || '—'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── COMPLAINTS ── */}
        {tab === 'complaints' && (
          <div style={{ padding:'14px 14px 40px' }}>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              {[['open','مفتوحة'],['resolved','محلولة']].map(([id,label]) => (
                <button key={id} onClick={() => setCompFilter(id)}
                  style={{ padding:'7px 16px', border:`1.5px solid ${compFilter===id ? '#1D1D1F' : 'var(--sep)'}`, borderRadius:20, background: compFilter===id ? '#1D1D1F' : '#fff', fontSize:13, fontWeight:600, fontFamily:"'Tajawal',sans-serif", color: compFilter===id ? '#fff' : 'var(--text3)', cursor:'pointer', flexShrink:0 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              {filteredComp.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text4)' }}><div style={{ fontSize:32 }}>{compFilter==='open' ? '✅' : '📋'}</div><div style={{ fontSize:14, marginTop:8 }}>{compFilter==='open' ? 'لا شكاوى مفتوحة' : 'لا شكاوى محلولة'}</div></div>
                : filteredComp.map((c,i) => (
                  <div key={c.id} style={{ padding:14, borderBottom: i<filteredComp.length-1 ? '1px solid var(--sep)' : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:15, fontWeight:700 }}>{c.business_name || 'محل غير معروف'}</span>
                      <span style={{ fontSize:12, color:'var(--text4)' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text3)', marginBottom: c.status==='open' ? 10 : 0 }}>كوبون: {c.coupon_id?.slice(-6) || '—'}</div>
                    {c.status === 'open'
                      ? <button onClick={() => resolveComp(c.id)} style={{ width:'100%', padding:10, background:'var(--green)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' }}>✅ تم الحل</button>
                      : <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✅ محلولة</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <div style={{ padding:'14px 14px 40px' }}>
            {selectedReport ? (
              <div>
                <button onClick={() => setSelectedReport(null)} style={{ background:'none', border:'none', color:'var(--blue)', fontSize:14, fontFamily:"'Tajawal',sans-serif", cursor:'pointer', marginBottom:12, padding:0 }}>
                  ‹ العودة للتقارير
                </button>
                <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:13, color:'var(--text3)', marginBottom:12 }}>
                    {selectedReport.created_at?.toDate?.()?.toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) || '—'}
                  </div>
                  {/* إحصائيات سريعة */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                    {[
                      ['التجار النشطون', selectedReport.stats?.merchants?.active ?? '—'],
                      ['كوبونات مستخدمة', selectedReport.stats?.coupons?.used ?? '—'],
                      ['معدل الاستخدام', selectedReport.stats?.coupons?.usage_rate ?? '—'],
                      ['شكاوى مفتوحة', selectedReport.stats?.complaints?.open ?? '—'],
                    ].map(([l,v]) => (
                      <div key={l} style={{ background:'var(--bg2)', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:22, fontWeight:900 }}>{v}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* تحليل Claude */}
                  <div style={{ fontSize:14, lineHeight:1.8, color:'var(--text)', whiteSpace:'pre-wrap', borderTop:'1px solid var(--sep)', paddingTop:14 }}>
                    {selectedReport.analysis || 'لا يوجد تحليل'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>📋 تقارير مدير المشروع</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:14, padding:'10px 14px', background:'rgba(21,101,192,.06)', borderRadius:12 }}>
                  🤖 التقارير تُولَّد تلقائياً كل اثنين الساعة 8 صباحاً بتحليل ذكاء اصطناعي كامل
                </div>
                {reports.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text4)' }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>🤖</div>
                    <div style={{ fontSize:14 }}>لا توجد تقارير بعد</div>
                    <div style={{ fontSize:12, marginTop:6 }}>أول تقرير سيظهر الاثنين القادم</div>
                  </div>
                ) : (
                  <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                    {reports.map((r, i) => (
                      <button key={r.id} onClick={() => setSelectedReport(r)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom: i<reports.length-1 ? '1px solid var(--sep)' : 'none', background:'none', border:'none', width:'100%', cursor:'pointer', textAlign:'right' }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700 }}>
                            تقرير {r.created_at?.toDate?.()?.toLocaleDateString('ar-SA', { month:'long', day:'numeric' }) || '—'}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                            {r.stats?.coupons?.used ?? 0} كوبون مستخدم • {r.stats?.complaints?.open ?? 0} شكوى مفتوحة
                          </div>
                        </div>
                        <span style={{ color:'var(--text4)', fontSize:18 }}>›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ADD STORE ── */}
        {tab === 'add' && (
          <div style={{ padding:'14px 14px 40px' }}>
            <div style={{ background:'#fff', borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>➕ إضافة نشاط جديد</div>

              {[
                ['اسم النشاط *', 'name', 'text', 'مثال: كافيه الورد'],
                ['نوع النشاط', 'type', 'text', 'مثال: مقاهي ومشروبات'],
                ['رقم الجوال', 'phone', 'tel', '05xxxxxxxx'],
                ['الحي / المنطقة', 'area', 'text', 'مثال: حي النزهة'],
                ['وصف العرض', 'description', 'text', 'مثال: خصم على جميع المشروبات'],
              ].map(([label, key, type, placeholder]) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:6, display:'block' }}>{label}</label>
                  <input
                    type={type}
                    value={addForm[key]}
                    onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="field"
                    style={{ margin:0 }}
                  />
                </div>
              ))}

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:6, display:'block' }}>نسبة الخصم: <strong>{addForm.discount}%</strong></label>
                <input type="range" min={5} max={50} step={5} value={addForm.discount}
                  onChange={e => setAddForm(f => ({ ...f, discount: Number(e.target.value) }))}
                  style={{ width:'100%', accentColor:'#0A2540' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text4)', marginTop:4 }}>
                  <span>5%</span><span>25%</span><span>50%</span>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'var(--text3)', marginBottom:8, display:'block' }}>أيقونة</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
                  {['🏪','☕','🍽️','💊','🛒','✂️','👗','📱','🌿','🍰','💈','🎯'].map(e => (
                    <div key={e} onClick={() => setAddForm(f => ({ ...f, icon: e }))}
                      style={{ fontSize:22, padding:8, borderRadius:10, background:'var(--bg2)', border:`2px solid ${addForm.icon===e ? '#0A2540' : 'transparent'}`, cursor:'pointer', textAlign:'center' }}>
                      {e}
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={addSaving || !addForm.name}
                onClick={async () => {
                  setAddSaving(true);
                  try {
                    await addDoc(collection(db, 'businesses'), {
                      name: addForm.name,
                      type: addForm.type,
                      discount: addForm.discount,
                      icon: addForm.icon,
                      description: addForm.description,
                      area: addForm.area,
                      phone: addForm.phone,
                      active: true,
                      created_at: serverTimestamp(),
                    });
                    toast('✅ تم إضافة النشاط');
                    setAddForm({ name:'', type:'', discount:10, icon:'🏪', description:'', area:'', phone:'' });
                    await loadMerchants();
                  } catch { toast('❌ حدث خطأ'); }
                  setAddSaving(false);
                }}
                style={{ display:'block', width:'100%', padding:16, background: addSaving || !addForm.name ? '#ccc' : 'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor: addSaving || !addForm.name ? 'not-allowed' : 'pointer' }}
              >
                {addSaving ? '⏳ جاري الإضافة...' : '➕ إضافة النشاط'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
