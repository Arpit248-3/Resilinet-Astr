import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { GoogleMap, useLoadScript, HeatmapLayer } from '@react-google-maps/api';
import { Layers, Calendar, Loader, AlertCircle } from 'lucide-react';

// Require the "visualization" library for the HeatmapLayer
const libraries = ['visualization'];

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 22.7196, // Centered around Indore based on other dashboard maps
  lng: 75.8577
};

// Dark mode map styles mimicking Carto Dark Matter
const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
];

const mapOptions = {
  styles: darkMapStyles,
  disableDefaultUI: true,
  zoomControl: true,
};

const HeatmapTab = () => {
  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '', // Assumes API key is in .env if available
    libraries,
  });

  const [activeLayer, setActiveLayer] = useState('sos'); // 'sos', 'resources', 'latency'
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHeatmapData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/heatmap-data`, {
        params: {
          type: activeLayer,
          startDate: dateRange.start,
          endDate: dateRange.end
        }
      });
      setHeatmapData(response.data);
    } catch (err) {
      console.error("Heatmap API failed to fetch real data:", err);
      setErrorMsg('Failed to load spatial data.');
      setHeatmapData([]); // Strict fallback: no mock data ever
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayer, dateRange]);

  // Convert raw data to google.maps.LatLng objects for the HeatmapLayer
  const mapHeatmapData = useMemo(() => {
    if (!isLoaded || !window.google || !heatmapData.length) return [];
    return heatmapData.map(point => ({
      location: new window.google.maps.LatLng(point.lat, point.lng),
      weight: point.weight
    }));
  }, [heatmapData, isLoaded]);

  // Gradient definitions based on layer type
  const getGradient = () => {
    if (activeLayer === 'sos') {
      return [
        'rgba(0,255,255,0)',
        'rgba(255,255,0,1)',
        'rgba(255,0,0,1)'
      ];
    }
  
    return [
      'rgba(0,255,255,0)',
      'rgba(0,255,128,1)',
      'rgba(0,255,0,1)'
    ];
  };

  if (loadError) {
    return (
      <div style={{ padding: '20px', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertCircle /> Error loading Google Maps
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#fff' }}>
      {/* Control Panel Header */}
      <div style={{ padding: '16px 24px', background: 'rgba(20,22,28,0.9)', borderBottom: '1px solid #333', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Layers size={18} color="#00f2ff" />
          <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginRight: '10px' }}>LAYER:</span>

          {['sos', 'resources'].map(type => (
            <button
              key={type}
              onClick={() => setActiveLayer(type)}
              style={{
                padding: '8px 16px',
                background: activeLayer === type ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeLayer === type ? '#00f2ff' : '#444'}`,
                color: activeLayer === type ? '#00f2ff' : '#888',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase'
              }}
            >
              {type === 'sos' ? 'SOS Urgency' : 'Resource Distribution'}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '30px', background: '#333' }} />

        {/* Date Range Picker */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Calendar size={18} color="#00f2ff" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
          />
          <span style={{ color: '#666' }}>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
          />
        </div>

      </div>

      {/* Map Content Area */}
      <div style={{ flex: 1, position: 'relative', background: '#0a0a0a' }}>

        {/* Loading Overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
            <Loader className="spin" size={32} color="#00f2ff" />
            <span style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px' }}>ANALYZING SPATIAL DATA...</span>
          </div>
        )}

        {/* Empty State Overlay */}
        {!loading && heatmapData.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(20,22,28,0.9)', padding: '20px 40px', borderRadius: '8px', border: '1px dashed #444', textAlign: 'center' }}>
              <AlertCircle size={32} color="#666" style={{ margin: '0 auto 10px' }} />
              <div style={{ color: '#eee', fontSize: '14px', fontWeight: 'bold' }}>NO DATA FOUND</div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>No spatial events recorded for this parameter in the selected timeframe.</div>
            </div>
          </div>
        )}

        {/* Google Map Viewer */}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            options={mapOptions}
          >
            {heatmapData.length > 0 && (
              <HeatmapLayer
                data={mapHeatmapData}
                options={{
                  radius: 75,
                  opacity: 0.9,
                  gradient: getGradient()
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
};

export default HeatmapTab;
