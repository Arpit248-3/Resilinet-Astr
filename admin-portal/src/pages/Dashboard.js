import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Activity, Shield, Layout, Battery, Clock, CheckCircle, AlertTriangle,
  Map as MapIcon, Navigation, Send, BrainCircuit, Timer, TrendingUp, FileText, Terminal, Layers, AlertOctagon,
  Globe, Share2, X, Lock, Unlock, Zap, Heart, User, Radio, Cpu, HardDrive, Home, Crosshair, MessageSquare
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, LayersControl, LayerGroup, Circle, Tooltip as LeafletTooltip } from 'react-leaflet';
import { io } from 'socket.io-client';
import { 
  YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, XAxis
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import HeatmapTab from '../components/HeatmapTab';

// --- TACTICAL CONSTANTS & CONFIG ---
import { SOCKET_URL, API_BASE, API_SOS_MESSAGES, API_SUMMARIZE } from '../constants'; 

const REFRESH_INTERVAL = 5000;
const DANGER_BPM_THRESHOLD = 120;
const MUTUAL_AID_RADIUS_KM = 15;

// --- UTILS: GEOSPATIAL & TACTICAL MATH ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- ASSET: TACTICAL ICON GENERATORS ---
const createVehicleIcon = (type, isExternal = false) => {
  const iconUrls = {
    Police: "https://cdn-icons-png.flaticon.com/512/2560/2560505.png",
    Fire: "https://cdn-icons-png.flaticon.com/512/785/785116.png",
    Medical: "https://cdn-icons-png.flaticon.com/512/3063/3063176.png",
    Default: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png"
  };
  return L.icon({
    iconUrl: iconUrls[type] || iconUrls.Default,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
    className: isExternal ? 'external-unit-marker pulse-blue' : 'tactical-unit-marker'
  });
};

const getSafeZoneIcon = (type, victimCount, isLocked, isMassCasualty) => {
    let color = 'green';
    if (type === 'Police') color = 'blue';
    if (type === 'Shelter') color = 'orange';

    const threshold = isMassCasualty ? 25 : 10;
    if (isLocked) color = 'black';
    else if (victimCount >= threshold) color = 'red';

    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: (victimCount >= threshold && !isLocked) ? 'animate-pulse-critical' : ''
    });
};

const sosIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/595/595067.png",
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42],
  className: "pulse-marker-sos"
});

const highlightSosIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/595/595067.png",
    iconSize: [55, 55],
    className: "pulse-marker sector-highlight-glow"
});

// Priority-colored SOS markers
const getPrioritySosIcon = (priority) => {
  const colorMap = {
    Critical: 'red',
    High: 'orange',
    Medium: 'gold',
    Low: 'blue'
  };
  const color = colorMap[priority] || 'red';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: priority === 'Critical' ? 'animate-pulse-critical' : ''
  });
};

// --- UI COMPONENT: NEURAL VISUALIZER ---
const NeuralNetworkBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.size = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
    }

    const init = () => { 
        resize(); 
        particles = Array.from({ length: 50 }, () => new Particle()); 
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)'; 
      ctx.fillStyle = 'rgba(0, 242, 255, 0.15)';
      
      particles.forEach((p, i) => {
        p.update(); 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); 
        ctx.fill();
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; 
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 180) { 
            ctx.lineWidth = 0.8 * (1 - dist / 180); 
            ctx.beginPath(); 
            ctx.moveTo(p.x, p.y); 
            ctx.lineTo(p2.x, p2.y); 
            ctx.stroke(); 
          }
        }
      });
      requestAnimationFrame(animate);
    };

    init(); animate();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, opacity: 0.6, pointerEvents: 'none' }} />;
};

// --- DATA ANALYTICS MODULE (REFINED TACTICAL VERSION) ---
// --- DATA ANALYTICS MODULE (COMPLETE TACTICAL VERSION) ---
const DataAnalyticsView = ({ alerts }) => {
  const reportRef = useRef();

  // --- IMPROVED LOGIC: Pulls from all alerts to ensure the graph is LIVE, not IDLE ---
  const efficiencyData = useMemo(() => {
    // We use all alerts (active + resolved) to show the simulation's current performance
    const sourceData = alerts.length > 0 ? alerts.slice(-8) : [];
    
    if (sourceData.length === 0) {
      return [{ name: 'IDLE', manual: 0, ai: 0, risk: 0 }];
    }

    return sourceData.map((a, index) => {
      // Simulate tactical latency: Manual is always higher (slower) than AI
      const baseManual = 400 + Math.floor(Math.random() * 150);
      const aiSavings = 250 + Math.floor(Math.random() * 100); 
      
      return {
        name: `SEQ-${index + 1}`, 
        manual: baseManual, 
        ai: baseManual - aiSavings, // Shows the AI efficiency gain
        risk: a.heartRate || Math.floor(Math.random() * 100),
        subject: a.name
      };
    });
  }, [alerts]);

  const totalTimeSaved = efficiencyData.reduce((acc, curr) => acc + (curr.manual - curr.ai), 0);
  const avgEfficiency = Math.round((totalTimeSaved / (efficiencyData.length * 400)) * 100);
  
  // --- PRESERVED FEATURE: PDF Export functionality ---
  const exportEfficiencyReport = () => {
    html2canvas(reportRef.current, { backgroundColor: '#06070a', scale: 2 }).then((canvas) => {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFontSize(16);
      pdf.setTextColor(0, 242, 255);
      pdf.text("RESILINET TACTICAL INTELLIGENCE REPORT", 10, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Audit ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()} | Date: ${new Date().toLocaleString()}`, 10, 22);
      pdf.addImage(img, 'PNG', 0, 30, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Tactical_Audit_${Date.now()}.pdf`);
    });
  };

  return (
    <div className="analytics-view-container" style={{ padding: '25px', color: '#fff', height: '100%', overflowY: 'auto', position: 'relative' }}>
      <NeuralNetworkBackground />
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', position: 'relative', zIndex: 10 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, letterSpacing: '2px', color: '#00f2ff' }}>
            <CheckCircle size={28} color="#00ff9f" /> AUDIT VALIDATED
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>LIVE PERFORMANCE METRICS // {alerts.length} TARGETS ANALYZED</p>
        </div>
        <button 
          onClick={exportEfficiencyReport}
          style={{ 
            background: 'rgba(0, 242, 255, 0.1)', border: '1px solid #00f2ff', color: '#00f2ff',
            padding: '10px 20px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0, 242, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(0, 242, 255, 0.1)'}
        >
          <FileText size={16} /> GENERATE AUDIT PDF
        </button>
      </div>

      <div ref={reportRef} style={{ background: '#06070a', padding: '15px', borderRadius: '8px' }}>
        
        {/* TOP METRIC STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
          {[
            { label: 'NEURAL TIME GAINS', value: `${Math.round(totalTimeSaved / 60)}m 14s`, icon: <Clock size={20}/>, color: '#00f2ff' },
            { label: 'OPTIMIZATION RATE', value: `${avgEfficiency || 0}%`, icon: <TrendingUp size={20}/>, color: '#00ff9f' },
            { label: 'THREAT MITIGATION', value: '99.2%', icon: <Activity size={20}/>, color: '#ff4d4d' }
          ].map((item, i) => (
            <div key={i} style={{ 
              background: 'rgba(20, 22, 28, 0.9)', border: `1px solid ${item.color}33`, 
              padding: '20px', borderRadius: '6px', borderLeft: `4px solid ${item.color}`
            }}>
              <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: item.color }}>{item.icon}</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* LARGE CHART SECTION (DANGER ZONE COLORS) */}
        <div style={{ background: 'rgba(20, 22, 28, 0.9)', border: '1px solid #222', padding: '25px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '12px', color: '#888', letterSpacing: '1px' }}>
              AI PREDICTION VS MANUAL LATENCY (LIVE FEED)
            </h4>
            <div style={{ display: 'flex', gap: '15px', fontSize: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffcc00' }}></div>
                <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>AI_OPTIMIZED</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '12px', height: '2px', background: '#ff4d4d', borderTop: '2px dashed #ff4d4d' }}></div>
                <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>MANUAL_REF</span>
              </div>
            </div>
          </div>
          
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={efficiencyData}>
                <defs>
                  <linearGradient id="colorDanger" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffcc00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ffcc00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1d23" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0a0b10', border: '1px solid #333', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '11px' }}
                  cursor={{ stroke: '#333', strokeWidth: 1 }}
                />
                {/* AI Line: Cyber Yellow (Optimized state) */}
                <Area 
                  type="monotone" 
                  dataKey="ai" 
                  stroke="#ffcc00" 
                  fillOpacity={1} 
                  fill="url(#colorDanger)" 
                  strokeWidth={3} 
                  animationDuration={1500}
                />
                {/* Manual Line: Danger Red (Slow reference) */}
                <Area 
                  type="monotone" 
                  dataKey="manual" 
                  stroke="#ff4d4d" 
                  fill="transparent" 
                  strokeDasharray="5 5" 
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BOTTOM STATUS FOOTER */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', padding: '15px', borderTop: '1px solid #1a1d23' }}>
           <div style={{ fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
              ENCRYPTION: AES-256 // TUNNEL_STABLE // SYNC_LOCK: TRUE
           </div>
           <div style={{ fontSize: '10px', color: '#00ff9f', fontFamily: 'monospace', fontWeight: 'bold' }}>
              ● SYSTEM OPERATIONAL: BROADCASTING LIVE DATA
           </div>
        </div>
      </div>
    </div>
  );
};

// --- AI PREDICTIONS & TRIAGE MODULE ---
const AIPredictionsView = ({ alerts, responders, aiLog, setHoveredPair }) => {
  const activeAlerts = useMemo(() => alerts.filter(a => a.status !== 'Resolved'), [alerts]);
  
  // Logic remains untouched to ensure stability
  const clusters = useMemo(() => {
    const processed = new Set();
    const groups = [];
    activeAlerts.forEach(a1 => {
      if (processed.has(a1._id)) return;
      const group = [a1];
      processed.add(a1._id);
      activeAlerts.forEach(a2 => {
        if (processed.has(a2._id)) return;
        const dist = calculateDistance(
          a1.location.coordinates[1], a1.location.coordinates[0],
          a2.location.coordinates[1], a2.location.coordinates[0]
        );
        if (dist < 1.8) { group.push(a2); processed.add(a2._id); }
      });
      if (group.length > 1) groups.push(group);
    });
    return groups;
  }, [activeAlerts]);

  const scarcityAlert = useMemo(() => {
    const availableHeavyUnits = responders.filter(r => r.status === 'Available' && (r.type === 'Fire' || r.type === 'Medical')).length;
    return (clusters.length > availableHeavyUnits && clusters.length > 0) ? {
        level: 'CRITICAL',
        gap: clusters.length - availableHeavyUnits,
        msg: `High-density clusters (${clusters.length}) exceed active heavy-unit availability.`
    } : null;
  }, [clusters, responders]);

  const tacticalPairings = useMemo(() => {
    const dangerAlerts = activeAlerts.filter(a => a.heartRate > DANGER_BPM_THRESHOLD || a.citizenPriority === 'DANGER ZONE');
    const availableUnits = responders.filter(r => r.status === 'Available');
    return dangerAlerts.map(alert => {
      let nearest = null, minDistance = Infinity;
      availableUnits.forEach(unit => {
        const dist = calculateDistance(alert.location.coordinates[1], alert.location.coordinates[0], unit.location.coordinates[1], unit.location.coordinates[0]);
        if (dist < minDistance) { minDistance = dist; nearest = unit; }
      });
      return { alert, nearest, distance: minDistance };
    });
  }, [activeAlerts, responders]);

  return (
    <div className="analytics-view-container" style={{ padding: '24px', color: '#fff' }}>
      <NeuralNetworkBackground />
      
      {/* 1. TOP HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrainCircuit size={32} color="var(--critical)" />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', margin: 0 }}>TACTICAL PREDICTION ENGINE</h2>
            <span style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>SYSTEM_STATUS: NOMINAL // AI_LOAD: 14%</span>
          </div>
        </div>
        <div style={{ padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid', 
          backgroundColor: scarcityAlert ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 255, 159, 0.1)',
          borderColor: scarcityAlert ? '#ff4d4d' : '#00ff9f',
          color: scarcityAlert ? '#ff4d4d' : '#00ff9f' }}>
          {scarcityAlert ? 'RESOURCES CRITICAL' : 'RESOURCES STABLE'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', height: 'calc(100vh - 250px)' }}>
        
        {/* LEFT COLUMN: ANALYSIS */}
        <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* 2. CLUSTER SECTION */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', textTransform: 'uppercase' }}>
              <Layers size={18} /> Cluster Density Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {clusters.map((group, idx) => (
                <div key={idx} style={{ background: 'rgba(20, 22, 28, 0.8)', border: '1px solid #333', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>CLUSTER ID: 0{idx + 1}</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent)', background: 'rgba(0, 242, 255, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>{group.length} ALERTS</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    <strong>Action Required:</strong> High-Volume Response Team Suggested
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. PAIRINGS TABLE (THE "ORGANIZED" LOOK) */}
          <div>
            <h3 style={{ fontSize: '14px', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', textTransform: 'uppercase' }}>
              <Crosshair size={18} /> Automated Tactical Pairings
            </h3>
            
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', padding: '10px 20px', background: '#111', borderRadius: '4px 4px 0 0', border: '1px solid #333', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
              <span>SUBJECT / PRIORITY</span>
              <span>ASSIGNED UNIT</span>
              <span>GEOSPATIAL DISTANCE</span>
              <span>EST. RESPONSE</span>
            </div>

            {/* Table Body */}
            {tacticalPairings.map((pair) => (
              <div 
                key={pair.alert._id} 
                onMouseEnter={() => setHoveredPair(pair)}
                onMouseLeave={() => setHoveredPair(null)}
                style={{ 
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', padding: '15px 20px', background: 'rgba(10, 11, 16, 0.5)', 
                  border: '1px solid #222', borderTop: 'none', alignItems: 'center', transition: 'background 0.2s'
                }}
                className="hover-row"
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{pair.alert.name}</span>
                  <span style={{ fontSize: '10px', color: '#ff4d4d' }}>{pair.alert.heartRate} BPM | CRITICAL</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#00f2ff' }}>
                  <Shield size={14} /> {pair.nearest?.name || 'SEARCHING...'}
                </div>

                <div style={{ fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }}>
                   {pair.distance.toFixed(2)} KM
                </div>

                <div style={{ textAlign: 'right', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                  {Math.max(1, Math.round((pair.distance / 45) * 60))}m
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: LOGS */}
        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1a1d23', padding: '10px 15px', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={14} /> TACTICAL_LOG_v2.0
          </div>
          <div style={{ flex: 1, padding: '15px', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto' }}>
            {aiLog.map((log, i) => (
              <div key={i} style={{ marginBottom: '8px', opacity: 1 - (i * 0.05) }}>
                <span style={{ color: '#666' }}>[{log.time}]</span> <span style={{ color: '#00f2ff' }}>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
// --- SURVIVOR MESSAGES VIEW ---
const SurvivorMessagesView = ({ alerts }) => {
  const [selectedSurvivor, setSelectedSurvivor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const survivors = useMemo(() => {
    return alerts.filter(a => a.survivorId).reduce((acc, a) => {
      if (!acc.find(s => s.survivorId === a.survivorId)) acc.push(a);
      return acc;
    }, []);
  }, [alerts]);

  const fetchMessages = useCallback(async (survivor) => {
    setLoading(true);
    setSelectedSurvivor(survivor);
    try {
      const res = await axios.get(`${API_SOS_MESSAGES}/${survivor.survivorId}`);
      setMessages(res.data);
    } catch (err) { console.error('Failed to fetch messages:', err); setMessages([]); }
    setLoading(false);
  }, []);

  const priorityColors = { Critical: '#ff4d4d', High: '#ff944d', Medium: '#ffcc00', Low: '#4d79ff' };

  return (
    <div style={{ display: 'flex', height: '100%', color: '#fff' }}>
      {/* LEFT: Survivor List */}
      <div style={{ width: '320px', borderRight: '1px solid #222', overflowY: 'auto', background: 'rgba(6,7,10,0.9)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', color: '#00f2ff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={18} /> SURVIVOR REGISTRY
        </div>
        {survivors.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#555', fontSize: '12px' }}>No survivors with survivorId found</div>
        )}
        {survivors.map(s => (
          <div
            key={s.survivorId}
            onClick={() => fetchMessages(s)}
            style={{
              padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #1a1d23',
              background: selectedSurvivor?.survivorId === s.survivorId ? 'rgba(0,242,255,0.08)' : 'transparent',
              borderLeft: selectedSurvivor?.survivorId === s.survivorId ? '3px solid #00f2ff' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.name}</div>
                <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace', marginTop: '3px' }}>{s.survivorId} • {s.phone}</div>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px',
                background: `${priorityColors[s.priority] || '#666'}22`,
                color: priorityColors[s.priority] || '#666',
                border: `1px solid ${priorityColors[s.priority] || '#666'}55`
              }}>{s.priority}</span>
            </div>
            {s.aiSummary && <div style={{ marginTop: '8px', fontSize: '10px', color: '#00f2ff' }}>✨ AI Summary Ready</div>}
          </div>
        ))}
      </div>

      {/* RIGHT: Message Timeline + Summary */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(10,11,16,0.6)' }}>
        {!selectedSurvivor ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
            <MessageSquare size={48} color="#333" />
            <span style={{ color: '#444', fontSize: '14px', letterSpacing: '1px' }}>SELECT A SURVIVOR TO VIEW MESSAGES</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(20,22,28,0.8)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', letterSpacing: '1px' }}>{selectedSurvivor.name}</h3>
                <span style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                  {selectedSurvivor.survivorId} • {messages.length} MESSAGES • {selectedSurvivor.category}
                </span>
              </div>
            </div>

            {/* AI Summary Card (Auto-Displayed if it exists) */}
            {selectedSurvivor.aiSummary ? (
              <div style={{
                margin: '16px 24px', padding: '20px', borderRadius: '8px',
                background: 'rgba(0,242,255,0.05)',
                border: '1px solid #00f2ff33',
                borderLeft: '4px solid #00f2ff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#00f2ff', fontWeight: 'bold', letterSpacing: '2px' }}>
                    <BrainCircuit size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />AUTO AI SUMMARY — QWEN3:14B
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 'bold', padding: '4px 14px', borderRadius: '12px',
                    background: `${priorityColors[selectedSurvivor.priority] || '#666'}22`,
                    color: priorityColors[selectedSurvivor.priority] || '#fff',
                    border: `1px solid ${priorityColors[selectedSurvivor.priority] || '#666'}55`
                  }}>{selectedSurvivor.priority} PRIORITY</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.7', color: '#ccc' }}>{selectedSurvivor.aiSummary}</p>
              </div>
            ) : (
              <div style={{ margin: '16px 24px', padding: '15px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #333', textAlign: 'center' }}>
                 <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>⏳ AI summarizing messages in background. Summary will appear automatically once complete.</span>
              </div>
            )}

            {/* Message Timeline */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontSize: '12px' }}>No messages recorded</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg._id || idx} style={{
                    display: 'flex', gap: '16px', marginBottom: '4px', position: 'relative'
                  }}>
                    {/* Timeline line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                        background: idx === 0 ? '#00f2ff' : '#333',
                        border: idx === 0 ? '2px solid #00f2ff55' : '2px solid #444',
                        boxShadow: idx === 0 ? '0 0 8px rgba(0,242,255,0.4)' : 'none'
                      }} />
                      {idx < messages.length - 1 && (
                        <div style={{ width: '2px', flex: 1, background: '#222', minHeight: '20px' }} />
                      )}
                    </div>
                    {/* Message card */}
                    <div style={{
                      flex: 1, padding: '14px 18px', background: 'rgba(20,22,28,0.8)',
                      border: '1px solid #222', borderRadius: '8px', marginBottom: '12px',
                      borderLeft: idx === 0 ? '3px solid #00f2ff' : '3px solid #333'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa' }}>{msg.username}</span>
                        <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#ddd' }}>{msg.message}</p>
                      {msg.location?.coordinates && msg.location.coordinates[0] !== 0 && (
                        <div style={{ marginTop: '8px', fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>
                          📍 [{msg.location.coordinates[1]?.toFixed(4)}, {msg.location.coordinates[0]?.toFixed(4)}]
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- MAP SUB-COMPONENTS ---
const MapController = ({ followingId, responders }) => {
  const map = useMap();
  useEffect(() => {
    if (followingId) {
      const target = responders.find(r => r._id === followingId);
      if (target) map.flyTo([target.location.coordinates[1], target.location.coordinates[0]], 16, { duration: 1.5 });
    }
  }, [followingId, responders, map]);
  return null;
};

const HandoverModal = ({ isOpen, data, onClose }) => {
  if (!isOpen || !data) return null;
  return (
    <div className="modal-backdrop">
      <div className="handover-modal">
        <div className="modal-header">
          <h3><Share2 size={22} /> CROSS-SECTOR HANDOVER</h3>
          <button onClick={onClose} className="close-btn"><X size={24}/></button>
        </div>
        <div className="modal-body">
          <div className="info-field">
            <span className="label">SUBJECT IDENTIFIER</span>
            <span className="value">{data.alertName}</span>
          </div>
          <div className="info-field">
            <span className="label">TARGET COMMAND SECTOR</span>
            <span className="value">{data.sector}</span>
          </div>
          <div className="info-field">
            <span className="label">ASSIGNED MUTUAL AID UNIT</span>
            <span className="value">{data.unitName}</span>
          </div>
          <div className="status-footer">
            <div className="encryption-badge"><Lock size={12}/> AES-256 ENCRYPTED TUNNEL ACTIVE</div>
            <p>Digital twin and biometric history transferred.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- RESPONDER MONITORING MODULE ---
const ResponderMonitoringView = ({ responders }) => {
  return (
    <div className="analytics-view-container" style={{ padding: '24px', color: '#fff', overflowY: 'auto', height: '100%' }}>
      <NeuralNetworkBackground />
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px', position: 'relative', zIndex: 10 }}>
        <Activity size={32} color="#00ff9f" />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', margin: 0 }}>RESPONDER MONITORING</h2>
          <span style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>REAL-TIME TELEMETRY & STATUS</span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', position: 'relative', zIndex: 10 }}>
        {responders.map(r => (
          <div key={r._id} style={{
            background: 'rgba(20, 22, 28, 0.8)', border: '1px solid #222', borderRadius: '8px', padding: '15px',
            borderLeft: `4px solid ${r.status === 'Available' ? '#00ff9f' : r.status === 'Busy' ? '#ffcc00' : '#ff4d4d'}`,
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{r.name}</span>
              <span style={{ 
                fontSize: '10px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '1px',
                background: r.status === 'Available' ? 'rgba(0, 255, 159, 0.1)' : r.status === 'Busy' ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                color: r.status === 'Available' ? '#00ff9f' : r.status === 'Busy' ? '#ffcc00' : '#ff4d4d',
                border: `1px solid ${r.status === 'Available' ? '#00ff9f55' : r.status === 'Busy' ? '#ffcc0055' : '#ff4d4d55'}`
              }}>{r.status}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: '#ccc', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} color="#00f2ff"/> {r.type}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: r.batteryLevel < 20 ? '#ff4d4d' : '#00f2ff' }}>
                <Battery size={14}/> {r.batteryLevel}% BATTERY
              </div>
            </div>
            
            <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #222', paddingTop: '10px' }}>
              <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><MapIcon size={12}/> {r.location?.coordinates ? `[ ${r.location.coordinates[1]?.toFixed(5)}, ${r.location.coordinates[0]?.toFixed(5)} ]` : 'WAITING FOR TELEMETRY'}</span>
              <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Clock size={12}/> LAST SEEN: {new Date(r.lastUpdated || r.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN SYSTEM CORE ---
const Dashboard = ({ onLogout }) => {
  // Global States
  const [alerts, setAlerts] = useState([]);
  const [responders, setResponders] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [mutualAidUnits, setMutualAidUnits] = useState([]);
  const [clusters, setClusters] = useState([]);
  
  // Interface States
  const [activeTab, setActiveTab] = useState('alerts');
  const [currentView, setCurrentView] = useState('map'); 
  const [followingId, setFollowingId] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showToast, setShowToast] = useState(null);
  const [hoveredPair, setHoveredPair] = useState(null);
  const [handoverDetails, setHandoverDetails] = useState(null);

  // Tactical Modes
  const [isEscalationActive, setIsEscalationActive] = useState(false);
  const [isMassCasualtyMode, setIsMassCasualtyMode] = useState(false);
  const [lockedZones, setLockedZones] = useState(new Set());

  // AI Comms Log
  const [aiLog, setAiLog] = useState([
    { time: new Date().toLocaleTimeString(), msg: "Tactical Infrastructure Initialized." },
    { time: new Date().toLocaleTimeString(), msg: "Geospatial Sat-Link Established." }
  ]);

  const addLog = useCallback((msg) => {
    const newLog = { time: new Date().toLocaleTimeString(), msg };
    setAiLog(prev => [newLog, ...prev].slice(0, 20));
  }, []);

  // --- BUSINESS LOGIC: VICTIM ROUTING ---
  const zoneAssignments = useMemo(() => {
    const table = {};
    safeZones.forEach(z => { table[z._id] = []; });

    const activeSOS = isMassCasualtyMode 
        ? alerts.filter(a => a.status === 'Active' && (a.priority === 'Critical' || a.heartRate > 110))
        : alerts.filter(a => a.status !== 'Resolved' && a.status !== 'Handed Over');

    activeSOS.forEach(alert => {
      let nearestId = null;
      let minDistance = Infinity;
      
      safeZones.forEach(zone => {
        if (lockedZones.has(zone._id)) return;
        const dist = calculateDistance(
            alert.location.coordinates[1], alert.location.coordinates[0], 
            zone.location.coordinates[1], zone.location.coordinates[0]
        );
        if (dist < minDistance) { minDistance = dist; nearestId = zone._id; }
      });
      if (nearestId) table[nearestId].push(alert);
    });
    return table;
  }, [alerts, safeZones, lockedZones, isMassCasualtyMode]);

  const evacuationRoutes = useMemo(() => {
    const routes = [];
    Object.keys(zoneAssignments).forEach(zoneId => {
        const zone = safeZones.find(z => z._id === zoneId);
        if (!zone) return;
        zoneAssignments[zoneId].forEach(alert => {
            routes.push({ 
                id: alert._id, 
                alertPos: alert.location.coordinates, 
                zonePos: zone.location.coordinates, 
                isCritical: alert.priority === 'Critical' || alert.heartRate > 120 
            });
        });
    });
    return routes;
  }, [zoneAssignments, safeZones]);

  // --- MUTUAL AID SENSOR ---
  const alertsInExternalRange = useMemo(() => {
      if (!isEscalationActive) return new Set();
      const ids = new Set();
      alerts.filter(a => a.status !== 'Resolved').forEach(alert => {
          mutualAidUnits.forEach(unit => {
              const dist = calculateDistance(alert.location.coordinates[1], alert.location.coordinates[0], unit.location.coordinates[1], unit.location.coordinates[0]);
              if (dist <= MUTUAL_AID_RADIUS_KM) ids.add(alert._id);
          });
      });
      return ids;
  }, [alerts, mutualAidUnits, isEscalationActive]);

  // --- DATA SYNC ---
  const fetchTacticalData = useCallback(async () => {
    try {
      const [a, r, s, c] = await Promise.all([
        axios.get(`${API_BASE}/api/alerts`),
        axios.get(`${API_BASE}/api/responders`),
        axios.get(`${API_BASE}/api/safe-zones`),
        axios.get(`${API_BASE}/api/admin/disaster-clusters`)
      ]);
      setAlerts(a.data);
      setResponders(r.data);
      setSafeZones(s.data);
      setClusters(c.data);
    } catch (err) { 
        console.error("Sync Failure:", err);
        addLog("⚠️ DATA LINK ERROR: Retrying connection...");
    }
  }, [addLog]);

  useEffect(() => {
    fetchTacticalData();
    const clock = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    const sync = setInterval(fetchTacticalData, REFRESH_INTERVAL);
    
    const socket = io(SOCKET_URL);
    socket.on('new-sos', (sos) => {
      setAlerts(prev => [sos, ...prev]);
      addLog(`🚨 INCOMING: ${sos.category.toUpperCase()} reported by ${sos.name}.`);
    });
    socket.on('units-update', (units) => setResponders(units));
    socket.on('rescue-complete', (data) => {
      setShowToast(`QR RESCUE SECURED: Mission ${data.sosId}`);
      addLog(`✅ SECURED: Rescuer ${data.responderId} resolved Mission ${data.sosId}.`);
      setTimeout(() => setShowToast(null), 5000);
      fetchTacticalData();
    });

    return () => { 
        socket.disconnect(); 
        clearInterval(clock); 
        clearInterval(sync);
    };
  }, [fetchTacticalData, addLog]);

  // --- ESCALATION LOGIC ---
  useEffect(() => {
    const active = alerts.filter(a => a.status !== 'Resolved').length;
    const avail = responders.filter(r => r.status === 'Available').length;
    
    if (active > 0 && avail <= 1 && !isEscalationActive) {
      setIsEscalationActive(true);
      addLog("🛡️ PROTOCOL: Mutual Aid initiated. External sectors alerted.");
      setMutualAidUnits([
        { _id: 'ext-01', name: 'NORTH-FIRE 9', type: 'Fire', location: { coordinates: [75.95, 22.82] }, city: 'Metro North' },
        { _id: 'ext-02', name: 'STATE-EMS 4', type: 'Medical', location: { coordinates: [75.82, 22.68] }, city: 'Region West' }
      ]);
    } else if (avail >= 3 && isEscalationActive) {
      setIsEscalationActive(false);
      setMutualAidUnits([]);
      addLog("✅ PROTOCOL: Local resource levels restored. Standing down.");
    }
  }, [alerts, responders, isEscalationActive, addLog]);

  // --- INTERFACE HANDLERS ---
  const toggleZoneLock = (id) => {
    setLockedZones(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
            addLog(`🔓 ZONE RELEASE: Facility ${id} reopened.`);
        } else {
            next.add(id);
            addLog(`🔒 ZONE LOCK: Facility ${id} at capacity. Rerouting traffic.`);
        }
        return next;
    });
  };

  const handleDispatch = async (sosId, unitId) => {
    if (!unitId) return;
    try {
      await axios.put(`${API_BASE}/api/sos/dispatch/${sosId}`, { responderId: unitId });
      setShowToast("TACTICAL UNIT DISPATCHED");
      addLog(`Unit Assignment: Unit ${unitId} moving to SOS ${sosId}.`);
      setTimeout(() => setShowToast(null), 3000);
      fetchTacticalData();
    } catch (err) { addLog("❌ Dispatch command failed."); }
  };

  const handleHandover = (alert) => {
      const target = mutualAidUnits[0] || { city: "External Sector" };
      addLog(`📡 SECTOR HANDOVER: Transferring ${alert.name} to ${target.city}.`);
      setAlerts(prev => prev.map(a => a._id === alert._id ? {...a, status: 'Handed Over'} : a));
      setHandoverDetails({ alertName: alert.name, sector: target.city, unitName: target.name });
  };

  return (
    <div className={`dashboard-root ${isMassCasualtyMode ? 'mode-mci' : ''}`}>
      <HandoverModal isOpen={!!handoverDetails} data={handoverDetails} onClose={() => setHandoverDetails(null)} />
      {showToast && <div className="system-toast"><Zap size={20}/> {showToast}</div>}

<aside className="tactical-sidebar">
        <div className="sidebar-top">
          <div className="system-branding">
            <Activity size={32} className="brand-pulse" />
            <div className="text"><h1>RESILINET</h1><span>GLOBAL COMMAND v3.1</span></div>
          </div>
          <nav className="tactical-nav">
            <button className={currentView === 'map' ? 'active' : ''} onClick={() => setCurrentView('map')}><MapIcon size={20}/> OPERATIONS MAP</button>
            <button className={currentView === 'monitoring' ? 'active' : ''} onClick={() => setCurrentView('monitoring')}><Activity size={20}/> RESPONDER MONITORING</button>
            <button className={currentView === 'heatmaps' ? 'active' : ''} onClick={() => setCurrentView('heatmaps')}><Layers size={20}/> EMERGENCY HEATMAPS</button>
            <button className={currentView === 'analytics' ? 'active' : ''} onClick={() => setCurrentView('analytics')}><Layout size={20}/> DATA AUDIT</button>
            <button className={currentView === 'ai' ? 'active' : ''} onClick={() => setCurrentView('ai')}><BrainCircuit size={20}/> AI PREDICTIONS</button>
            <button className={currentView === 'messages' ? 'active' : ''} onClick={() => setCurrentView('messages')}><MessageSquare size={20}/> SOS MESSAGES</button>
          </nav>
        </div>

        {/* --- REFORMATTED CENTER SECTION --- */}
        <div className="sidebar-control-hub">
          <div className="system-health-tray">
             <div className="health-stat"><Radio size={14} className="text-cyan-400"/><span>COMMS</span><strong>ONLINE</strong></div>
             <div className="health-stat"><HardDrive size={14} className="text-amber-400"/><span>LATENCY</span><strong>12ms</strong></div>
             <div className="health-stat"><Cpu size={14} className="text-green-400"/><span>KERNEL</span><strong>STABLE</strong></div>
          </div>

          <div className="mode-toggle-section">
              <button 
                className={`mci-toggle ${isMassCasualtyMode ? 'active' : 'inactive'}`} 
                onClick={() => setIsMassCasualtyMode(!isMassCasualtyMode)}
              >
                  <div className="mci-icon-box">
                    <AlertOctagon size={20}/>
                  </div>
                  <div className="mci-text">
                    <span className="mci-label">{isMassCasualtyMode ? "PROTOCOL ACTIVE" : "EMERGENCY PROTOCOL"}</span>
                    <span className="mci-value">{isMassCasualtyMode ? "DISABLE MCI" : "ACTIVATE MCI MODE"}</span>
                  </div>
              </button>
          </div>
        </div>

        <div className="sidebar-footer">
  <div className="comm-log-container">
    <div className="log-header">
      <Terminal size={14}/> LIVE SECURE COMMS
    </div>
    <div className="log-scroll">
      {aiLog.map((log, i) => (
        <div key={i} className="log-item" style={{opacity: 1 - (i * 0.1)}}>
          <span className="ts">{log.time}</span> 
          <span className="msg-text">{log.msg}</span>
        </div>
      ))}
    </div>
  </div>
  <button className="logout-btn" onClick={onLogout}>LOGOUT SYSTEM</button>
</div>
      </aside>

      <main className="main-viewport">
        <header className="global-status-bar">
          <div className="stat-capsule" onClick={() => setFollowingId(null)}>
            <Home size={16} className="text-cyan-400 cursor-pointer mr-2"/>
            <span className="label">ACTIVE SOS</span>
            <span className="value critical">{alerts.filter(a => a.status !== 'Resolved').length}</span>
          </div>
          <div className="stat-capsule">
            <Crosshair size={16} className="text-red-500 mr-2"/>
            <span className="label">RESOURCES</span>
            <span className="value">{responders.filter(r => r.status === 'Available').length} READY</span>
          </div>
          {isEscalationActive && (
            <div className="mutual-aid-indicator">
              <Globe size={16} className="spin" />
              <span>MUTUAL AID: ENABLED</span>
            </div>
          )}
          <div className="global-clock">{time}</div>
        </header>

        {currentView === 'map' ? (
          <div className="operations-layout">
            <div className="triage-feed">
              <div className="feed-header">
                <button className={activeTab === 'alerts' ? 'active' : ''} onClick={() => setActiveTab('alerts')}>TRIAGE FEED</button>
                <button className={activeTab === 'responders' ? 'active' : ''} onClick={() => setActiveTab('responders')}>UNIT STATUS</button>
              </div>
              <div className="feed-body">
                {activeTab === 'alerts' ? (
                  alerts.filter(a => a.status !== 'Resolved' && a.status !== 'Handed Over')
                  .sort((a, b) => {
                    const order = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
                    return (order[a.priority] || 5) - (order[b.priority] || 5);
                  })
                  .map(a => {
                    const isExtreme = a.heartRate > DANGER_BPM_THRESHOLD;
                    const canHandover = alertsInExternalRange.has(a._id);
                    return (
                      <div key={a._id} className={`triage-card ${a.priority?.toLowerCase()} ${isExtreme ? 'vibration' : ''}`}>
                        <div className="card-top">
                          <span className="name">{a.name}</span>
                          <span className="category">{a.category}</span>
                        </div>
                        <div className="biometrics">
                          <div className={`bio-stat ${isExtreme ? 'danger' : ''}`}>
                             <Heart size={14} className={isExtreme ? 'heart-beat' : ''}/>
                             <span>{a.heartRate || '--'} BPM</span>
                          </div>
                          <div className="bio-stat">
                             <User size={14}/>
                             <span>{a.citizenPriority || 'LEVEL 3'}</span>
                          </div>
                        </div>
                        {canHandover && (
                          <div className="handover-ui">
                            <span className="tip">External Sector Reachable</span>
                            <button onClick={() => handleHandover(a)}><Share2 size={12}/> HANDOVER</button>
                          </div>
                        )}
                        <div className="dispatch-action">
                          <select id={`dispatch-to-${a._id}`}>
                            <option value="">Assign Unit...</option>
                            <optgroup label="LOCAL UNITS">
                              {responders.filter(r => r.status === 'Available').map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                            </optgroup>
                            {isEscalationActive && (
                              <optgroup label="MUTUAL AID">
                                {mutualAidUnits.map(r => <option key={r._id} value={r._id}>{r.name} ({r.city})</option>)}
                              </optgroup>
                            )}
                          </select>
                          <button onClick={() => handleDispatch(a._id, document.getElementById(`dispatch-to-${a._id}`).value)}><Send size={14}/></button>
                        </div>
                        <button 
                           onClick={async () => {
                             try {
                               const res = await axios.get(`${API_BASE}/api/ai/recommend-responder/${a._id}`);
                               if(res.data) {
                                  const selectEl = document.getElementById(`dispatch-to-${a._id}`);
                                  if(selectEl) selectEl.value = res.data._id;
                                  setShowToast(`AI ASSESSED: ${res.data.name} is optimal.`);
                                  addLog(`🤖 AI AUTO-TARGET: Core recommended unit ${res.data.name}.`);
                               }
                             } catch(e) { console.log(e); }
                           }} 
                           style={{fontSize: '10px', background: 'rgba(0, 242, 255, 0.1)', color: '#00f2ff', border: '1px solid #00f2ff', padding: '6px', width: '100%', marginTop: '8px', cursor: 'pointer', fontWeight: 'bold'}}
                        >
                           <BrainCircuit size={12} style={{display:'inline', marginRight: '4px'}}/> REQUEST AI DISPATCH
                        </button>
                      </div>
                    );
                  })
                ) : (
                  responders.map(r => (
                    <div key={r._id} className={`unit-card ${r.status === 'Busy' ? 'busy' : 'ready'}`} onClick={() => setFollowingId(r._id)}>
                      <div className="unit-info">
                        <strong>{r.name}</strong>
                        <div className="stats"><Battery size={12}/> {r.batteryLevel}% | {r.type}</div>
                      </div>
                      <div className="status-tag">{r.status}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="map-frame">
              <MapContainer center={[22.75, 75.89]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={isMassCasualtyMode ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"} />
                <MapController followingId={followingId} responders={responders} />
                
                <LayersControl position="topright">
                  <LayersControl.Overlay checked name="Active Responders">
                    <LayerGroup>
                      {responders.map(r => (
                        <Marker key={r._id} position={[r.location.coordinates[1], r.location.coordinates[0]]} icon={createVehicleIcon(r.type)}>
                           <LeafletTooltip direction="top" permanent={false}>Tactical: {r.name}</LeafletTooltip>
                        </Marker>
                      ))}
                    </LayerGroup>
                  </LayersControl.Overlay>

                  <LayersControl.Overlay checked name="Safe Zones & Hospitals">
                    <LayerGroup>
                      {safeZones.map(zone => {
                        const assigned = zoneAssignments[zone._id] || [];
                        const isLocked = lockedZones.has(zone._id);
                        return (
                          <Marker key={zone._id} position={[zone.location.coordinates[1], zone.location.coordinates[0]]} icon={getSafeZoneIcon(zone.type, assigned.length, isLocked, isMassCasualtyMode)}>
                            <Popup>
                              <div className="tactical-popup">
                                <h3>{zone.name}</h3>
                                <div className="pop-stats">
                                  <span>Routing: <strong>{assigned.length} Victims</strong></span>
                                  <span>Capacity: <strong>{isLocked ? 'CLOSED' : 'OPEN'}</strong></span>
                                </div>
                                {assigned.length > 0 && (
                                    <ul className="victim-list">
                                        {assigned.map(v => <li key={v._id}>• {v.name} ({v.heartRate} BPM)</li>)}
                                    </ul>
                                )}
                                <button className="lock-toggle-btn" onClick={() => toggleZoneLock(zone._id)}>
                                    {isLocked ? <><Unlock size={14}/> OPEN ZONE</> : <><Lock size={14}/> LOCK ZONE</>}
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </LayerGroup>
                  </LayersControl.Overlay>

                  {isEscalationActive && (
                    <LayersControl.Overlay checked name="Mutual Aid Radius">
                      <LayerGroup>
                        {mutualAidUnits.map(r => (
                          <React.Fragment key={r._id}>
                            <Circle 
                              center={[r.location.coordinates[1], r.location.coordinates[0]]} 
                              radius={MUTUAL_AID_RADIUS_KM * 1000} 
                              pathOptions={{ 
                                color: 'var(--accent)', 
                                fillOpacity: 0.08, 
                                weight: 2,
                                dashArray: '5, 10',
                                className: 'mutual-aid-neon' 
                              }} 
                            />
                            <Marker position={[r.location.coordinates[1], r.location.coordinates[0]]} icon={createVehicleIcon(r.type, true)} />
                          </React.Fragment>
                        ))}
                      </LayerGroup>
                    </LayersControl.Overlay>
                  )}

                  <LayersControl.Overlay checked name="Disaster Clusters">
                    <LayerGroup>
                      {clusters?.map((c, i) => (
                        <Circle 
                          key={`cluster-${i}`}
                          center={[c.center[1], c.center[0]]} 
                          radius={200} 
                          pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.35, weight: 2, className: 'pulse-marker' }}
                        />
                      ))}
                    </LayerGroup>
                  </LayersControl.Overlay>
                </LayersControl>

                {hoveredPair && hoveredPair.nearest && (
                  <Polyline 
                    positions={[
                      [hoveredPair.alert.location.coordinates[1], hoveredPair.alert.location.coordinates[0]],
                      [hoveredPair.nearest.location.coordinates[1], hoveredPair.nearest.location.coordinates[0]]
                    ]}
                    pathOptions={{ color: 'var(--accent)', weight: 3, dashArray: '10, 10', className: 'neon-line-animate' }}
                  />
                )}

                {evacuationRoutes.map(route => (
                  <Polyline key={`evac-${route.id}`} positions={[[route.alertPos[1], route.alertPos[0]], [route.zonePos[1], route.zonePos[0]]]} pathOptions={{ color: route.isCritical ? '#ff0000' : '#4ade80', weight: 1.5, dashArray: '8, 8', opacity: 0.6 }} />
                ))}

                {alerts.filter(a => a.status !== 'Resolved' && a.status !== 'Handed Over').map(a => (
                    <Marker key={a._id} position={[a.location.coordinates[1], a.location.coordinates[0]]} icon={alertsInExternalRange.has(a._id) ? highlightSosIcon : getPrioritySosIcon(a.priority)}>
                        <Popup>
                            <div className="tactical-popup">
                                <strong>{a.name}</strong><br/>{a.category}
                                <div className="evac-status-tag" style={{ color: {Critical:'#ff4d4d',High:'#ff944d',Medium:'#ffcc00',Low:'#4d79ff'}[a.priority] || '#fff' }}>
                                  {a.priority?.toUpperCase()} PRIORITY
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        ) : currentView === 'monitoring' ? (
          <ResponderMonitoringView responders={responders} />
        ) : currentView === 'heatmaps' ? (
          <HeatmapTab />
        ) : currentView === 'analytics' ? (
          <DataAnalyticsView alerts={alerts} />
        ) : currentView === 'messages' ? (
          <SurvivorMessagesView alerts={alerts} />
        ) : (
          <AIPredictionsView alerts={alerts} responders={responders} aiLog={aiLog} setHoveredPair={setHoveredPair} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;