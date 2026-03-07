import React from 'react';
import { CheckCircle, Database, ShieldCheck, Terminal, Cpu, Zap } from 'lucide-react';

const SuccessModal = ({ method = "BIOMETRIC", victimId = "UNK-000", onClose }) => {
  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div style={modalContentStyle}>
        
        {/* Success Icon & Animation */}
        <div style={iconContainerStyle}>
          <div className="pulse-ring"></div>
          <CheckCircle size={70} color="#4dff88" strokeWidth={1.5} />
        </div>

        {/* Header Section */}
        <h2 style={headerStyle}>AID AUTHORIZED</h2>
        <div style={dividerStyle}></div>

        {/* Verification Details */}
        <p style={detailTextStyle}>
          Verification via <span style={{ color: '#4dff88', fontWeight: 'bold' }}>{method.toUpperCase()}</span> successful.<br/>
          <span style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>IDENTITY TOKEN:</span>
          <br/>
          <code style={tokenStyle}>{victimId}</code>
        </p>

        {/* Terminal / System Logs Feed */}
        
        <div style={terminalStyle}>
          <div style={terminalHeader}>
            <Terminal size={12} /> SYSTEM_KERNEL_LOGS
          </div>
          <div style={logLineStyle('#4dff88')}>
            <Database size={12} /> &gt; HANDSHAKE_PROTOCOL: STABLE
          </div>
          <div style={logLineStyle('#4dff88')}>
            <ShieldCheck size={12} /> &gt; ENCRYPTED_LEDGER_SYNC: OK
          </div>
          <div style={logLineStyle('#4dff88')}>
            <Cpu size={12} /> &gt; NODE_VERIFICATION: 100%
          </div>
          <div style={logLineStyle('#888', true)}>
            <Zap size={12} /> &gt; BROADCASTING TO MESH...
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onClose}
          style={closeBtnStyle}
          onMouseOver={(e) => e.target.style.filter = 'brightness(1.2)'}
          onMouseOut={(e) => e.target.style.filter = 'brightness(1)'}
        >
          DISMISS COMMAND
        </button>
      </div>

      {/* Basic Keyframe Animation CSS Injection */}
      <style>
        {`
          @keyframes ringPulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .pulse-ring {
            position: absolute;
            width: 70px;
            height: 70px;
            border: 2px solid #4dff88;
            border-radius: 50%;
            animation: ringPulse 2s infinite;
          }
        `}
      </style>
    </div>
  );
};

// --- STYLES ---

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(8px)'
};

const modalContentStyle = {
  background: '#0a0b10',
  padding: '40px',
  borderRadius: '24px',
  border: '1px solid #4dff88',
  textAlign: 'center',
  maxWidth: '420px',
  width: '90%',
  boxShadow: '0 0 60px rgba(77, 255, 136, 0.15)',
  position: 'relative'
};

const iconContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '25px',
  position: 'relative'
};

const headerStyle = {
  color: '#fff',
  fontSize: '24px',
  fontWeight: '800',
  letterSpacing: '4px',
  margin: '10px 0',
  textShadow: '0 0 10px rgba(77, 255, 136, 0.3)'
};

const dividerStyle = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, #4dff88, transparent)',
  margin: '20px auto',
  width: '80%'
};

const detailTextStyle = {
  color: '#aaa',
  fontSize: '15px',
  lineHeight: '1.6',
  marginBottom: '30px'
};

const tokenStyle = {
  display: 'inline-block',
  marginTop: '8px',
  background: '#111',
  padding: '6px 12px',
  borderRadius: '6px',
  color: '#4dff88',
  fontFamily: 'monospace',
  border: '1px solid #222',
  fontSize: '14px'
};

const terminalStyle = {
  textAlign: 'left',
  background: '#000',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #1a1a1a',
  fontFamily: '"Fira Code", monospace'
};

const terminalHeader = {
  fontSize: '10px',
  color: '#444',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderBottom: '1px solid #111',
  paddingBottom: '8px'
};

const logLineStyle = (color, animate = false) => ({
  color: color,
  fontSize: '11px',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  opacity: animate ? 0.6 : 1
});

const closeBtnStyle = {
  marginTop: '35px',
  width: '100%',
  background: '#4dff88',
  color: '#000',
  border: 'none',
  padding: '14px',
  borderRadius: '10px',
  fontWeight: '900',
  fontSize: '12px',
  letterSpacing: '2px',
  cursor: 'pointer',
  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 15px rgba(77, 255, 136, 0.2)'
};

export default SuccessModal;