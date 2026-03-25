import { useState, useEffect, useRef } from 'react';

let showToastFn = null;

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const tid = useRef(null);

  useEffect(() => {
    showToastFn = (message, dur = 2600) => {
      setMsg(message);
      setVisible(true);
      clearTimeout(tid.current);
      tid.current = setTimeout(() => setVisible(false), dur);
    };
    return () => { showToastFn = null; };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '80px'})`,
      background: '#1D1D1F',
      color: '#fff',
      padding: '10px 22px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 600,
      zIndex: 9999,
      transition: 'transform .35s cubic-bezier(.34,1.56,.64,1)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      {msg}
    </div>
  );
}

export function toast(msg, dur) {
  showToastFn?.(msg, dur);
}
