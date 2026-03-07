import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, Line
} from 'recharts';
import { Activity, ShieldCheck, Zap, AlertCircle, Clock, CheckCircle2, MapPin, Share2 } from 'lucide-react';

const DataAnalytics = ({ alerts = [] }) => {
  // 1. Process Category Data with Safety Checks
  const categoryData = useMemo(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) return [];
    const counts = alerts.reduce((acc, curr) => {
      const cat = curr.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, count: counts[name] }));
  }, [alerts]);

  // 2. Process Priority Data
  const priorityData = useMemo(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) return [];
    const counts = alerts.reduce((acc, curr) => {
      const prio = curr.priority || 'Low';
      acc[prio] = (acc[prio] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, count: counts[name] }));
  }, [alerts]);

  // 3. Process Trend Data
  const trendData = useMemo(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) return [];
    return alerts.slice(-7).map((a, i) => ({
      name: `T-${7 - i}`,
      mins: a.priority === 'Critical' ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 10) + 5,
      benchmark: 8
    }));
  }, [alerts]);

  const PRIORITY_COLORS = {
    'Critical': '#ff4d4d',
    'High': '#ff944d',
    'Medium': '#ffea00',
    'Low': '#3498db'
  };

  const getBarColor = (name) => {
    const key = name.toUpperCase();
    if (key.includes('FIRE')) return '#ff4d4d';
    if (key.includes('MEDICAL')) return '#ffea00';
    if (key.includes('POLICE')) return '#3498db';
    return '#00f2ff';
  };

  const tooltipStyle = {
    backgroundColor: '#000',
    borderRadius: '8px',
    border: '1px solid #333',
    color: '#fff',
    fontSize: '12px',
    padding: '10px'
  };

  // Error/Empty State Handler
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#06070a', color: '#666', flexDirection: 'column' }}>
        <Activity className="animate-pulse" size={48} />
        <p style={{ marginTop: '15px', letterSpacing: '2px', fontFamily: 'monospace' }}>AWAITING ENCRYPTED TELEMETRY...</p>
      </div>
    );
  }

  return (
    <div className="analytics-engine" style={{ padding: '25px', backgroundColor: '#06070a', color: '#fff', height: '100%', overflowY: 'auto' }}>
      
      {/* SECTION 1: TOP TACTICAL STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {[
          { label: 'TOTAL INCIDENTS', val: alerts.length, icon: <Zap size={14}/>, color: '#00f2ff' },
          { label: 'CRITICAL ALERTS', val: alerts.filter(a => a.priority === 'Critical').length, icon: <AlertCircle size={14}/>, color: '#ff4d4d' },
          { label: 'SYSTEM HEALTH', val: '98.4%', icon: <ShieldCheck size={14}/>, color: '#4dff88' },
          { label: 'RESPONSE AVG', val: '4.2m', icon: <Clock size={14}/>, color: '#ffea00' }
        ].map((stat, i) => (
          <div key={i} style={{ background: '#111', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${stat.color}`, border: '1px solid #222' }}>
            <div style={{ fontSize: '10px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>{stat.icon} {stat.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '5px' }}>{stat.val}</div>
          </div>
        ))}
      </div>

      {/* SECTION 2: CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Category Bar Chart */}
        <div style={cardStyle}>
          <h3 style={cardHeaderStyle}>INCIDENT CATEGORIES</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="name" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={35}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Pie Chart */}
        <div style={cardStyle}>
          <h3 style={cardHeaderStyle}>PRIORITY DISTRIBUTION</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityData}
                dataKey="count"
                nameKey="name"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={8}
                stroke="none"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#888'} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Response Velocity Chart */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <h3 style={cardHeaderStyle}>RESPONSE VELOCITY & PERFORMANCE</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorMins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="name" stroke="#555" fontSize={10} />
              <YAxis stroke="#555" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="mins" stroke="#00f2ff" fillOpacity={1} fill="url(#colorMins)" strokeWidth={3} name="Response Time" />
              <Line type="step" dataKey="benchmark" stroke="#ff4d4d" strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: LIVE INCIDENT LOG WITH HANDOVER */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ ...cardHeaderStyle, margin: 0 }}>ACTIVE INCIDENT RESOLUTION LOG</h3>
          <span style={{ fontSize: '10px', color: '#00f2ff', fontFamily: 'monospace' }}>SECURE_ENCRYPTED_FEED</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#1a1a1a', textAlign: 'left', color: '#888' }}>
                <th style={tableHeaderStyle}>TIMESTAMP</th>
                <th style={tableHeaderStyle}>CATEGORY</th>
                <th style={tableHeaderStyle}>COORDINATES</th>
                <th style={tableHeaderStyle}>PRIORITY</th>
                <th style={tableHeaderStyle}>COMMAND ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 15).map((incident) => (
                <tr key={incident._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={tableCellStyle}>{new Date(incident.createdAt).toLocaleTimeString()}</td>
                  <td style={tableCellStyle}><strong>{incident.category}</strong></td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#888' }}>
                      <MapPin size={12} /> 
                      {incident.location?.coordinates ? 
                        `${incident.location.coordinates[1].toFixed(3)}, ${incident.location.coordinates[0].toFixed(3)}` : 
                        'N/A'}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                      background: (PRIORITY_COLORS[incident.priority] || '#888') + '22',
                      color: PRIORITY_COLORS[incident.priority] || '#888'
                    }}>
                      {incident.priority}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={actionBtnStyle('#4dff88')}>
                        <CheckCircle2 size={12} /> RESOLVE
                      </button>
                      <button style={actionBtnStyle('#3498db')}>
                        <Share2 size={12} /> HANDOVER
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- STYLES OBJECTS ---
const cardStyle = {
  background: '#0a0b10',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #1a1b23'
};

const cardHeaderStyle = {
  color: '#888',
  fontSize: '11px',
  marginBottom: '20px',
  textTransform: 'uppercase',
  letterSpacing: '2px',
  fontWeight: 'bold'
};

const tableHeaderStyle = { padding: '12px 15px', fontSize: '11px', fontWeight: 'normal' };
const tableCellStyle = { padding: '12px 15px' };

const actionBtnStyle = (color) => ({
  background: 'none',
  border: `1px solid ${color}44`,
  color: color,
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: '0.3s',
  fontWeight: 'bold',
  letterSpacing: '0.5px'
});

export default DataAnalytics;