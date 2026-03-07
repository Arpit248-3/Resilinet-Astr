import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../App';

export default function StatusDashboardScreen({ responderId }) {
  const [responder, setResponder] = useState(null);

  useEffect(() => {
    // Optionally fetch full responder profile on mount
    fetchResponder();
  }, []);

  const fetchResponder = async () => {
    try {
      // Temporary workaround since we don't have a GET /responders/:id route yet
      // We will just assume status is Available on mount, or fetch from alerts
    } catch (e) {
      console.log(e);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const res = await axios.patch(`${API_URL}/responders/${responderId}/status`, { status: newStatus });
      setResponder(res.data);
    } catch (e) { console.log('Status update failed'); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TACTICAL TELEMETRY</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>RESPONDER ID</Text>
        <Text style={styles.value}>{responderId}</Text>
        
        <Text style={styles.label}>CURRENT STATUS</Text>
        <Text style={[styles.value, { color: responder?.status === 'Busy' ? '#ffaa00' : '#00ffaa' }]}>
          {responder ? responder.status.toUpperCase() : 'AVAILABLE'}
        </Text>
        
        <Text style={styles.label}>BATTERY LEVEL</Text>
        <Text style={styles.value}>{responder ? responder.batteryLevel : 100}%</Text>
      </View>

      <Text style={styles.header}>OVERRIDE STATUS</Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { borderColor: '#00ffaa' }]} onPress={() => updateStatus('Available')}>
          <Text style={[styles.btnText, { color: '#00ffaa' }]}>AVAILABLE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: '#ffaa00' }]} onPress={() => updateStatus('Busy')}>
          <Text style={[styles.btnText, { color: '#ffaa00' }]}>BUSY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { borderColor: '#ff4444' }]} onPress={() => updateStatus('Offline')}>
          <Text style={[styles.btnText, { color: '#ff4444' }]}>OFFLINE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20 },
  header: { color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15, marginTop: 20 },
  card: { backgroundColor: '#1a1d24', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  value: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, marginHorizontal: 5, borderWidth: 1, borderRadius: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  btnText: { fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }
});
