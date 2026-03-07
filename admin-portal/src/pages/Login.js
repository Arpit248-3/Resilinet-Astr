import React, { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, Lock, ChevronRight, RefreshCcw } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const clearPin = () => setPin('');

  useEffect(() => {
    if (pin.length === 4) {
      setLoading(true);
      // Artificial delay for "processing" feel
      setTimeout(() => {
        if (pin === '1234') {
          onLogin();
        } else {
          setError(true);
          setPin('');
          setLoading(false);
        }
      }, 800);
    }
  }, [pin, onLogin]);

  return (
    <div className="login-container">
      {/* Visual background element */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.3 }}>
         {/* You can reuse your NeuralNetworkBackground here for consistency */}
      </div>

      <div className={`login-glass-card ${error ? 'error-shake' : ''}`}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 242, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px'
          }}>
            {loading ? (
              <RefreshCcw className="animate-spin" color="#00f2ff" size={28} />
            ) : error ? (
              <ShieldAlert color="#ff4d4d" size={28} />
            ) : (
              <Fingerprint color="#00f2ff" size={28} />
            )}
          </div>
          <h2 className="shimmer-text" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0' }}>
            TERMINAL ACCESS
          </h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '8px' }}>
            {error ? "ACCESS DENIED - RETRY" : "ENTER SECURE ADMIN PIN"}
          </p>
        </div>

        <div className="pin-display">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`pin-dot ${pin.length > i ? 'active' : ''}`} />
          ))}
        </div>

        <div className="keypad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              className="keypad-btn"
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button className="keypad-btn" style={{ color: '#ff4d4d' }} onClick={clearPin}>
            <Lock size={18} />
          </button>
          <button className="keypad-btn" onClick={() => handleKeyPress('0')}>0</button>
          <button className="keypad-btn" disabled>
            <ChevronRight size={18} color="#333" />
          </button>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px' }}>
            SECURE ENCRYPTED UPLINK v2.0.4
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;