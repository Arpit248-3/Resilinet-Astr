import React, { useState, useEffect } from 'react';
import './App.css'; 
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

/**
 * TACTICAL COMMAND CENTER - CORE BOOTLOADER
 * Integration Level: 4.0 (Full Suite Sync)
 * * This file serves as the secure entry point for the Admin Portal.
 * It manages authentication state and ensures the Dashboard 
 * environment is initialized only after successful handshake.
 */

function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  // Persistence Check: Keeps user logged in on page refresh
  useEffect(() => {
    const sessionActive = localStorage.getItem('admin_session_active');
    if (sessionActive === 'true') {
      setIsLoggedIn(true);
    }
    
    // Simulate system boot sequence for aesthetic consistency
    const timer = setTimeout(() => setIsBooting(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Handle Secure Login
  const handleLogin = () => {
    localStorage.setItem('admin_session_active', 'true');
    setIsLoggedIn(true);
  };

  // Handle Secure Logout
  const handleLogout = () => {
    localStorage.removeItem('admin_session_active');
    setIsLoggedIn(false);
  };

  // 1. Initial System Bootup (Loading Overlay)
  if (isBooting) {
    return (
      <div style={bootingOverlayStyle}>
        <div className="scanner-line"></div>
        <h2 style={bootingTextStyle}>INITIALIZING_COMMAND_SUITE...</h2>
        {/* Added data-testid here to support updated app.test.js without direct Node access */}
        <div style={progressBarContainer} data-testid="boot-progress">
          <div className="progress-fill"></div>
        </div>
      </div>
    );
  }

  // 2. Authentication Shield
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // 3. Authorized Environment (Dashboard Core)
  return (
    <div className="app-container" style={appContainerStyle}>
      {/* Dashboard now manages:
          - Real-time Sockets
          - IncidentTable.js (Tactical Log)
          - Analytics.js (Predictive Intelligence)
          - SuccessModal.js (Aid Authorization)
      */}
      <Dashboard onLogout={handleLogout} />

      {/* Global CSS for Boot Animations */}
      <style>
        {`
          @keyframes scan {
            0% { top: 0%; }
            100% { top: 100%; }
          }
          @keyframes fillProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .scanner-line {
            position: absolute;
            width: 100%;
            height: 2px;
            background: rgba(0, 255, 65, 0.5);
            box-shadow: 0 0 15px #00ff41;
            animation: scan 2s linear infinite;
          }
          .progress-fill {
            height: 100%;
            background: #00ff41;
            width: 0%;
            animation: fillProgress 1.2s ease-out forwards;
          }
          .app-container {
            background-color: #06070a;
            min-height: 100vh;
            color: #ffffff;
          }
        `}
      </style>
    </div>
  );
}

// --- SYSTEM STYLES ---

const bootingOverlayStyle = {
  height: '100vh',
  width: '100vw',
  backgroundColor: '#000',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden'
};

const bootingTextStyle = {
  color: '#00ff41',
  fontFamily: 'monospace',
  fontSize: '14px',
  letterSpacing: '4px',
  marginBottom: '20px'
};

const progressBarContainer = {
  width: '300px',
  height: '4px',
  backgroundColor: '#111',
  borderRadius: '2px',
  overflow: 'hidden'
};

const appContainerStyle = {
  overflow: 'hidden'
};

export default App;