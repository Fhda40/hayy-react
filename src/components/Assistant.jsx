import { useState, useRef, useEffect } from 'react';
import { callAskAssistant } from '../firebase';
import './Assistant.css'; // استيراد ملف الـ CSS

const QUICK_ACTIONS = [
  'أين أجد عروض مطاعم؟',
  'أريد خصم على الكافيهات',
  'ما هي أحدث العروض؟',
  'مساعدة'
];

export default function Assistant({ stores = [] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    { role: 'assistant', content: 'أهلاً! أنا مساعد حيّ 👋\nأخبرني ايش تبحث عنه وأساعدك تلاقي أفضل عرض.' }
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  async function send(messageToSend = input) {
    const msg = messageToSend.trim();
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
    } catch (e) {
      setHistory(h => [...h, { role: 'assistant', content: 'خطأ: ' + (e?.code || e?.message || String(e)) }]);
    }
    setLoading(false);
  }

  const handleQuickAction = (action) => {
    send(action);
  };

  return (
    <>
      {/* زر الدردشة الطافي */}
      <button
        onClick={() => setOpen(v => !v)}
        className="assistant-fab"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* نافذة الدردشة */}
      {open && (
        <div className="assistant-popup">
          {/* رأس */}
          <div className="assistant-header">
            <div className="assistant-header-icon">🤖</div>
            <div>
              <div className="assistant-header-title">مساعد حيّ</div>
              <div className="assistant-header-subtitle">يساعدك تلاقي أفضل عرض</div>
            </div>
          </div>

          {/* المحادثة */}
          <div className="assistant-messages">
            {history.map((m, i) => (
              <div key={i} className={`assistant-message-bubble ${m.role === 'user' ? 'assistant-message-user' : 'assistant-message-assistant'}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="assistant-loading">
                ⏳ يفكر...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* اقتراحات سريعة */}
          {!loading && history.length === 1 && ( // إظهار الاقتراحات فقط في بداية المحادثة
            <div className="assistant-quick-actions">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(action)}
                  className="assistant-quick-action-button"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* مربع الإدخال */}
          <div className="assistant-input-area">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="اسألني..."
              className="assistant-input-field"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="assistant-send-button"
            >
              ←
            </button>
          </div>
        </div>
      )}
    </>
  );
}
