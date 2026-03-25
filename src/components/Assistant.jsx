import { useState, useRef, useEffect } from 'react';
import { callAskAssistant } from '../firebase';

export default function Assistant({ stores = [] }) {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    { role: 'assistant', content: 'أهلاً! أنا مساعد حيّ 👋\nأخبرني ايش تبحث عنه وأساعدك تلاقي أفضل عرض.' }
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const userHistory = [...history, { role: 'user', content: msg }];
    setHistory(userHistory);
    setLoading(true);
    try {
      const { data } = await callAskAssistant({
        message: msg,
        stores: stores.map(s => ({ name: s.name, type: s.type, discount: s.discount, area: s.area })),
        history: userHistory.slice(-6),
      });
      setHistory(h => [...h, { role: 'assistant', content: data.reply }]);
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة ثانية.' }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* زر الدردشة الطافي */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', left: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#0A2540,#1565C0)',
          border: 'none', fontSize: 24, cursor: 'pointer', zIndex: 1000,
          boxShadow: '0 4px 16px rgba(10,37,64,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* نافذة الدردشة */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,0px) + 82px)', left: 12,
          width: 'min(340px, calc(100vw - 24px))', height: 420,
          background: '#fff', borderRadius: 20, zIndex: 999,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,.18)', overflow: 'hidden',
        }}>
          {/* رأس */}
          <div style={{ background: 'linear-gradient(135deg,#0A2540,#1565C0)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22 }}>🤖</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>مساعد حيّ</div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 11 }}>يساعدك تلاقي أفضل عرض</div>
            </div>
          </div>

          {/* المحادثة */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? '#0A2540' : 'var(--bg2)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '9px 13px', fontSize: 13, lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg2)', borderRadius: '14px 14px 14px 4px', padding: '9px 13px', fontSize: 13, color: 'var(--text3)' }}>
                ⏳ يفكر...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* مربع الإدخال */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--sep)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="اسألني..."
              style={{
                flex: 1, border: '1.5px solid var(--sep)', borderRadius: 12,
                padding: '9px 13px', fontSize: 13, fontFamily: "'Tajawal',sans-serif",
                outline: 'none', background: 'var(--bg2)',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: loading || !input.trim() ? 'var(--sep)' : '#0A2540',
                color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ←
            </button>
          </div>
        </div>
      )}
    </>
  );
}
