import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:32, textAlign:'center' }}>
      <div style={{ fontSize:80, marginBottom:24, animation:'float 3s ease-in-out infinite' }}>🗺️</div>
      <div style={{ fontSize:28, fontWeight:900, marginBottom:12 }}>الصفحة غير موجودة</div>
      <div style={{ fontSize:15, color:'var(--text3)', marginBottom:32, lineHeight:1.7 }}>
        يبدو أن الرابط خاطئ أو انتهت صلاحيته
      </div>
      <button className="btn-main" style={{ maxWidth:280 }} onClick={() => navigate('/')}>
        العودة للرئيسية
      </button>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
    </div>
  );
}
