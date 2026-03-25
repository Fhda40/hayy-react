import { useNavigate } from 'react-router-dom';

export default function MerchantWelcome() {
  const navigate = useNavigate();
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center', gap:20 }}>
        <div style={{ width:80, height:80, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🏪</div>
        <div>
          <div style={{ fontSize:32, fontWeight:900, color:'#0A2540', marginBottom:8 }}>بوابة التجار</div>
          <div style={{ fontSize:15, color:'var(--text3)' }}>أدر نشاطك مع أهل شرورة</div>
        </div>
      </div>
      <div style={{ padding:'0 20px calc(env(safe-area-inset-bottom,0px) + 32px)' }}>
        <button
          onClick={() => navigate('/merchant/phone')}
          style={{ display:'block', width:'100%', padding:17, background:'linear-gradient(135deg,#0A2540,#2D7DD2)', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:700, fontFamily:"'Tajawal',sans-serif", cursor:'pointer' }}
        >ابدأ الآن ←</button>
        <div style={{ textAlign:'center', marginTop:14 }}>
          <a href="/" style={{ color:'var(--text3)', fontSize:14, textDecoration:'none' }}>← للعملاء</a>
        </div>
      </div>
    </div>
  );
}
