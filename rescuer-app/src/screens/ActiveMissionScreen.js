import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../App';

export default function ActiveMissionScreen({ missionId, navigate }) {
  const [mission, setMission] = useState(null);

  useEffect(() => {
    fetchMissionDetails();
  }, [missionId]);

  const fetchMissionDetails = async () => {
    if (!missionId) return;
    try {
      const res = await axios.get(`${API_URL}/alerts`);
      const active = res.data.find(a => a._id === missionId);
      setMission(active);
    } catch (e) { console.log('Failed fetching mission details'); }
  };

  const openNavigation = () => {
    if (!mission || !mission.location) return;
    const lat = mission.location.coordinates[1];
    const lng = mission.location.coordinates[0];
    const url = `http://maps.google.com/maps?daddr=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (!missionId || !mission) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.errorText}>No Active Missions Assigned.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>MISSION DOSSIER</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>SURVIVOR ID</Text>
          <Text style={styles.value}>{mission.survivorId || mission._id}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>PRIORITY</Text>
          <Text style={[styles.value, { color: mission.priority === 'Critical' ? '#ff4444' : '#ffaa00' }]}>
            {mission.priority ? mission.priority.toUpperCase() : 'UNKNOWN'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>PHONE CONTACT</Text>
          <Text style={styles.value}>{mission.phone || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>AI INTELLIGENCE SUMMARY</Text>
          <Text style={styles.desc}>{mission.aiSummary || 'No AI summary generated yet. Approach with caution.'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.navBtn} onPress={openNavigation}>
        <Text style={styles.navBtnText}>LAUNCH GPS NAVIGATION</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.qrBtn} onPress={() => navigate('Scanner')}>
        <Text style={styles.qrBtnText}>INITIATE QR HANDSHAKE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20 },
  header: { color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15, marginTop: 20 },
  card: { backgroundColor: '#1a1d24', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  row: { marginBottom: 15 },
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  value: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  desc: { color: '#00f2ff', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  navBtn: { backgroundColor: '#333', padding: 18, borderRadius: 8, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#555' },
  navBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  qrBtn: { backgroundColor: 'rgba(0, 242, 255, 0.15)', padding: 18, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#00f2ff' },
  qrBtnText: { color: '#00f2ff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
