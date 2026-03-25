import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { haversine } from '../utils';

const CITY = { lat: 17.5049999, lng: 47.1025904 };
const RADIUS = 5;

export default function Geo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = location.state || {};

  const [state, setState] = useState('idle'); // idle | checking | inside | outside
  const [distance, setDistance] = useState(0);

  function check() {
    setState('checking');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const d = haversine(pos.coords.latitude, pos.coords.longitude, CITY.lat, CITY.lng);
        setDistance(d);
        if (d <= RADIUS) {
          setState('inside');
          setTimeout(() => navigate('/register', { state: { phone } }), 800);
        } else {
          setState('outside');
        }
      },
      () => setState('denied')
    );
  }

  const contentMap = {
    idle: {
      icon: '📍', title: 'أنت من شرورة؟',
      sub: '🔒 نتحقق أنك من سكان الحي\nعشان نعطيك خصومات حصرية',
      btn: 'السماح بالموقع',
    },
    checking: {
      icon: '⏳', title: 'جاري التحقق...',
      sub: 'انتظر لحظة', btn: '...',
    },
    inside: {
      icon: '✅', title: 'أنت في شرورة!',
      sub: 'ادخل وابدأ باستخدام العروض', btn: '...',
    },
    outside: {
      icon: '🗺️', title: 'قريباً في حيّك!',
      sub: `أنت على بعد ${distance.toFixed(0)} كم من شرورة\nحيّ متاح حالياً لسكان شرورة فقط`,
      btn: '🔄 حاول مجدداً',
    },
    denied: {
      icon: '🚫', title: 'تعذّر الوصول للموقع',
      sub: 'يرجى السماح بالموقع من إعدادات المتصفح ثم حاول مجدداً',
      btn: '🔄 حاول مجدداً',
    },
  };
  const content = contentMap[state] ?? contentMap.idle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>{content.icon}</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>{content.title}</div>
        <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.6, whiteSpace: 'pre-line', maxWidth: 280 }}>
          {content.sub}
        </div>
      </div>
      <div style={{ padding: '0 16px calc(env(safe-area-inset-bottom,0px) + 32px)' }}>
        <button
          className="btn-main"
          onClick={check}
          disabled={state === 'checking' || state === 'inside'}
        >
          {content.btn}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text4)' }}>
          موقعك للتحقق فقط — لن يُحفظ أو يُشارك
        </div>
      </div>
    </div>
  );
}
