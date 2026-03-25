export default function StoreSkeleton() {
  return (
    <>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:'1px solid var(--sep)' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'var(--bg2)', flexShrink:0, animation:'shimmer 1.5s infinite' }} />
          <div style={{ flex:1 }}>
            <div style={{ width:'60%', height:16, borderRadius:8, background:'var(--bg2)', marginBottom:8, animation:'shimmer 1.5s infinite' }} />
            <div style={{ width:'40%', height:12, borderRadius:8, background:'var(--bg2)', marginBottom:8, animation:'shimmer 1.5s infinite' }} />
            <div style={{ width:'30%', height:12, borderRadius:8, background:'var(--bg2)', animation:'shimmer 1.5s infinite' }} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
