// components/FullScreenSpinner.tsx
import { useEffect, useState } from 'react';

interface Props {
  label: string;
  isInitial?: boolean; // Đánh dấu lần load đầu
}

const FullScreenSpinner = ({ label}: Props) => {
  const [opacity, setOpacity] = useState(0);
  const darkMode = localStorage.getItem('theme') === 'dark';

  useEffect(() => {
    // Fade in effect cho mượt
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        opacity,
        transition: 'opacity 200ms ease-in-out',
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Spinner animation mượt hơn */}
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
            willChange: 'transform', // Hint cho browser
          }}
        />
        <p style={{ color: '#666', fontSize: 14 }}>{label}</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FullScreenSpinner;