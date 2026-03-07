import React from 'react';
import { 
  Clock, MapPin, AudioLines, AlertTriangle, 
  CheckCircle2, Share2, ExternalLink, ShieldAlert 
} from 'lucide-react';

const IncidentTable = ({ incidents = [], onResolve, onHandover }) => {
  
  // Define Priority Styles to match DataAnalytics.js
  const getPriorityStyle = (priority) => {
    const styles = {
      'Critical': { color: '#ff4d4d', bg: 'rgba(255, 77, 77, 0.15)' },
      'High': { color: '#ff944d', bg: 'rgba(255, 148, 77, 0.15)' },
      'Medium': { color: '#ffea00', bg: 'rgba(255, 234, 0, 0.15)' },
      'Low': { color: '#3498db', bg: 'rgba(52, 152, 219, 0.15)' }
    };
    return styles[priority] || styles['Low'];
  };

  // Helper to safely format coordinates
  const formatLocation = (incident) => {
    if (incident.location?.coordinates) {
      return `${incident.location.coordinates[1].toFixed(4)}, ${incident.location.coordinates[0].toFixed(4)}`;
    }
    if (incident.latitude && incident.longitude) {
      return `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`;
    }
    return "COORD_PENDING";
  };

  if (!incidents || incidents.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <ShieldAlert size={40} color="#333" />
        <p style={{ marginTop: '10px', color: '#555', fontFamily: 'monospace' }}>NO ACTIVE THREATS DETECTED</p>
      </div>
    );
  }

  return (
    <div className="incident-table-container" style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle color="#ffea00" size={18} />
          <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '1px' }}>TACTICAL INCIDENT LOG</h2>
        </div>
        <span style={statusBadgeStyle}>LIVE_ENCRYPTED_FEED</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}><Clock size={14} /> TIMESTAMP</th>
              <th style={thStyle}>CATEGORY</th>
              <th style={thStyle}><AudioLines size={14} /> EVIDENCE</th>
              <th style={thStyle}><MapPin size={14} /> LOCATION</th>
              <th style={thStyle}>PRIORITY</th>
              <th style={thStyle}>COMMAND ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const pStyle = getPriorityStyle(incident.priority);
              return (
                <tr key={incident._id} style={trStyle}>
                  <td style={tdStyle}>
                    {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{incident.category}</span>
                  </td>
                  <td style={tdStyle}>
                    {incident.audioPath ? (
                      <audio controls style={audioStyle}>
                        <source src={`http://localhost:5000/${incident.audioPath}`} type="audio/mpeg" />
                      </audio>
                    ) : (
                      <span style={{ color: '#444', fontSize: '11px' }}>NO_AUDIO_FEED</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <a 
                      href={`https://www.google.com/maps?q=${formatLocation(incident).replace(' ', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={mapLinkStyle}
                    >
                      {formatLocation(incident)} <ExternalLink size={10} />
                    </a>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      ...priorityBadgeBase,
                      backgroundColor: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.color}44`
                    }}>
                      {incident.priority || 'LOW'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => onResolve && onResolve(incident._id)}
                        style={actionBtnStyle('#4dff88')}
                        title="Mark as Resolved"
                      >
                        <CheckCircle2 size={14} /> RESOLVE
                      </button>
                      <button 
                        onClick={() => onHandover && onHandover(incident._id)}
                        style={actionBtnStyle('#3498db')}
                        title="Handover to specialized unit"
                      >
                        <Share2 size={14} /> HANDOVER
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- STYLES ---

const containerStyle = {
  background: '#0a0b10',
  borderRadius: '12px',
  border: '1px solid #1a1b23',
  margin: '20px 0',
  overflow: 'hidden'
};

const headerStyle = {
  padding: '15px 20px',
  borderBottom: '1px solid #1a1b23',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.02)'
};

const statusBadgeStyle = {
  fontSize: '10px',
  fontFamily: 'monospace',
  color: '#00f2ff',
  background: 'rgba(0, 242, 255, 0.1)',
  padding: '4px 8px',
  borderRadius: '4px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  color: '#aaa',
  fontSize: '13px'
};

const tableHeaderRowStyle = {
  background: '#111',
  textAlign: 'left'
};

const thStyle = {
  padding: '12px 15px',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#666',
  letterSpacing: '1px',
  textTransform: 'uppercase'
};

const trStyle = {
  borderBottom: '1px solid #1a1b23',
  transition: 'background 0.2s'
};

const tdStyle = {
  padding: '12px 15px',
  verticalAlign: 'middle'
};

const audioStyle = {
  height: '28px',
  width: '180px',
  filter: 'invert(90%) hue-rotate(180deg) brightness(1.5)'
};

const mapLinkStyle = {
  color: '#888',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '11px'
};

const priorityBadgeBase = {
  padding: '3px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
  display: 'inline-block'
};

const actionBtnStyle = (color) => ({
  background: 'transparent',
  border: `1px solid ${color}44`,
  color: color,
  padding: '6px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s'
});

const emptyStateStyle = {
  padding: '60px',
  textAlign: 'center',
  background: '#0a0b10',
  borderRadius: '12px',
  border: '1px dashed #222'
};

export default IncidentTable;