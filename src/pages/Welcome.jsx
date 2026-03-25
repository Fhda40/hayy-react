import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', padding: '0',
    }}>
      {/* زر التاجر */}
      <div style={{ padding: 'calc(env(safe-area-inset-top,0px) + 20px) 20px 0', display: 'flex' }}>
        <button
          onClick={() => navigate('/merchant')}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 15, cursor: 'pointer', marginRight: 'auto' }}
        >
          تاجر؟
        </button>
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px', textAlign: 'center', gap: 20,
      }}>
        <img
          src="https://res.cloudinary.com/dtwgl17iy/image/upload/v1774160618/%D8%AD%D9%8E%D9%8A%D9%91_otbkdk.png"
          alt="حيّ"
          style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'contain' }}
        />
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>
            خصومات<br />حيّك فقط 🏡
          </div>
          <div style={{ fontSize: 16, color: 'var(--text3)', lineHeight: 1.6 }}>
            عروض حصرية لسكان شرورة<br />من أهلها لأهلها
          </div>
        </div>
      </div>

      {/* زر البدء */}
      <div style={{ padding: '0 16px calc(env(safe-area-inset-bottom,0px) + 32px)' }}>
        <button className="btn-main" onClick={() => navigate('/phone')}>
          ابدأ الآن ←
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text4)' }}>
          صُنع في شرورة 🤝
        </div>
      </div>
    </div>
  );
}
