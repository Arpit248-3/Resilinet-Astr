import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileText, Download, Send, BrainCircuit, Activity, Globe } from 'lucide-react';
import { API_ANALYTICS_WEEKLY, API_ANALYTICS_PREDICTIVE } from '../constants';
// --- HEATMAP LAYER COMPONENT ---
const PredictiveLayer = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !Array.isArray(points) || points.length === 0) return;

    const heatData = points.map(p => {
      // Support for both GeoJSON and flat coordinate objects
      const lat = p.location?.coordinates?.[1] || p.latitude || p._id?.lat || 0;
      const lng = p.location?.coordinates?.[0] || p.longitude || p._id?.lng || 0;
      const intensity = p.count ? Math.min(p.count / 10, 1) : 0.6;
      return [lat, lng, intensity]; 
    }).filter(coord => coord[0] !== 0);

    const layer = L.heatLayer(heatData, { 
      radius: 30, 
      blur: 15, 
      maxZoom: 10,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
    }).addTo(map);

    return () => map.removeLayer(layer);
  }, [map, points]);

  return null;
};

const Analytics = () => {
  const [chartData, setChartData] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [aiPrediction, setAiPrediction] = useState("INITIALIZING NEURAL OVERLAY...");
  const [isSending, setIsSending] = useState(false);
  const reportRef = useRef(); 

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [weekly, predictive] = await Promise.all([
  axios.get(API_ANALYTICS_WEEKLY),
  axios.get(API_ANALYTICS_PREDICTIVE)
]);

        if (weekly.data) {
          setChartData(weekly.data.map(d => ({ name: d._id, value: d.count })));
        }
        
        if (predictive.data) {
          setRiskZones(predictive.data.hotspots || []);
          setAiPrediction(predictive.data.prediction || "ANALYSIS COMPLETE: NO ANOMALIES.");
        }
      } catch (e) { 
        console.error("Analytics fetch failed", e);
        setAiPrediction("OFFLINE: KERNEL CONNECTION TIMEOUT");
      }
    };

    fetchAnalytics();
  }, []);

  // PDF Generation with High DPI Scaling
  const generatePDFBlob = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, { 
      backgroundColor: '#06070a', 
      useCORS: true, 
      scale: 3, // Higher scale for professional print quality
      logging: false 
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('datauristring');
  };

  const exportPDF = async () => {
    const dataUri = await generatePDFBlob();
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `TACTICAL_REPORT_${new Date().getTime()}.pdf`;
    link.click();
  };

  const dispatchReport = async () => {
    setIsSending(true);
    try {
      const pdfBase64 = await generatePDFBlob();
      await axios.post(API_DISPATCH_REPORT, {
        pdfBase64,
        recipientEmail: "command-center@emergency.gov"
      });
      alert("STRATEGIC DISPATCH SUCCESSFUL");
    } catch (err) {
      alert("DISPATCH ERROR: CHECK ENCRYPTION PROTOCOLS");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ background: '#06070a', minHeight: '100vh', padding: '25px', color: '#fff' }}>
      
      {/* HEADER SECTION */}
      <div style={styles.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrainCircuit color="#00ff41" size={32} />
          <div>
            <h2 style={{ margin: 0, letterSpacing: '3px', color: '#00ff41' }}>PREDICTIVE INTELLIGENCE</h2>
            <span style={{ fontSize: '10px', color: '#444' }}>SECURE_ENCRYPTED_ANALYTICS_V4.0</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportPDF} style={styles.btnSecondary}>
            <Download size={16} /> ARCHIVE PDF
          </button>
          <button 
            onClick={dispatchReport} 
            style={styles.btnPrimary} 
            disabled={isSending}
          >
            <Send size={16} /> {isSending ? 'DISPATCHING...' : 'DISPATCH TO COMMAND'}
          </button>
        </div>
      </div>
      
      {/* MAIN CONTENT AREA */}
      <div ref={reportRef} style={styles.reportSheet}>
        <div style={styles.reportHeader}>
          <FileText color="#00ff41" size={18} />
          <span>STRATEGIC INCIDENT SUMMARY // {new Date().toLocaleDateString()}</span>
        </div>

        <div style={styles.statsGrid}>
          {/* Chart Card */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Activity size={14} color="#00ff41" /> RECENT INCIDENT DISTRIBUTION
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#000', border: '1px solid #00ff41', color: '#00ff41', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#00ff41' : '#e63946'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Risk Card */}
          <div style={styles.riskCard}>
            <div style={styles.cardTitle}>
              <BrainCircuit size={14} color="#ff8c00" /> NEURAL RISK PREDICTION
            </div>
            <div style={styles.aiTextBox}>
              <p style={{ fontSize: '14px', color: '#00ff41', margin: 0, lineHeight: '1.5' }}>
                {aiPrediction}
              </p>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <span style={{ fontSize: '10px', color: '#666', letterSpacing: '1px' }}>DETECTED ANOMALY CLUSTERS</span>
              {riskZones.length > 0 ? riskZones.slice(0, 4).map((zone, i) => (
                <div key={i} style={styles.riskItem}>
                  <div style={{ color: '#ff8c00', fontWeight: 'bold', fontSize: '12px' }}>CLUSTER_{i+1}</div> 
                  <div style={{ color: '#888', fontSize: '11px' }}>{zone._id} &gt; {zone.count} INCIDENTS</div>
                </div>
              )) : <p style={{color: '#333', fontSize: '12px'}}>NO CLUSTERS DETECTED</p>}
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div style={styles.mapContainer}>
          <div style={styles.mapHeader}>
            <Globe size={14} color="#00f2ff" /> TACTICAL HEATMAP: RISK HOTSPOTS
          </div>
          <MapContainer center={[20.59, 78.96]} zoom={5} style={{ height: '420px', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <PredictiveLayer points={riskZones} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// --- STYLES OBJECT ---
const styles = {
  topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#e63946', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', fontSize: '12px', transition: '0.3s' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#111', color: '#00ff41', border: '1px solid #00ff41', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  reportSheet: { padding: '30px', backgroundColor: '#06070a', borderRadius: '20px', border: '1px solid #1a1a1a' },
  reportHeader: { borderBottom: '1px solid #1a1a1a', paddingBottom: '15px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px', color: '#555', fontSize: '12px', letterSpacing: '1px' },
  statsGrid: { display: 'flex', gap: '25px', marginBottom: '25px', flexWrap: 'wrap' },
  card: { flex: 2, minWidth: '400px', background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '15px', border: '1px solid #111' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '25px', letterSpacing: '1px' },
  riskCard: { flex: 1, minWidth: '300px', background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '15px', borderLeft: '4px solid #ff8c00' },
  aiTextBox: { padding: '15px', background: '#000', borderRadius: '8px', border: '1px solid #1a1a1a', minHeight: '80px', display: 'flex', alignItems: 'center' },
  riskItem: { marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid #1a1a1a' },
  mapContainer: { borderRadius: '15px', overflow: 'hidden', border: '1px solid #1a1a1a', marginTop: '10px' },
  mapHeader: { padding: '15px 25px', background: '#0d0e12', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#aaa', letterSpacing: '1px' }
};

export default Analytics;