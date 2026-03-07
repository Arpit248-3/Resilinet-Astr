import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';
import socket from '../socket';

const TIMELINE_STEPS = [
  { key: 'sent', label: 'SOS Transmitted', icon: 'radio' },
  { key: 'assigned', label: 'Rescuer Assigned', icon: 'person-add' },
  { key: 'enroute', label: 'Rescuer En Route', icon: 'navigate' },
  { key: 'delivered', label: 'Aid Delivered', icon: 'checkmark-done' },
];

export default function RescueStatusScreen() {
  const [statusData, setStatusData] = useState(null);
  const [rescuer, setRescuer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);

    socket.on('rescueAssigned', (data) => {
      console.log('Rescue assigned event:', data);
      setCurrentStep(1);
      fetchStatus();
    });

    socket.on('supplyDelivered', (data) => {
      console.log('Supply delivered event:', data);
      setCurrentStep(3);
      fetchStatus();
    });

    socket.on('statusUpdate', (sos) => {
      if (sos.status === 'rescue_assigned' || sos.status === 'Dispatched') setCurrentStep(2);
      if (sos.status === 'Resolved') setCurrentStep(3);
    });

    return () => {
      clearInterval(interval);
      socket.off('rescueAssigned');
      socket.off('supplyDelivered');
      socket.off('statusUpdate');
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const survivorId = await AsyncStorage.getItem('survivorId');
      if (!survivorId) { setLoading(false); return; }

      const statusRes = await axios.get(`${API_URL}/sos/status/${survivorId}`);
      setStatusData(statusRes.data);

      // Determine timeline position
      const s = statusRes.data.status;
      if (s === 'No Active SOS') setCurrentStep(-1);
      else if (s === 'Resolved' || s === 'Aid Delivered') setCurrentStep(3);
      else if (s === 'Responder En Route') setCurrentStep(2);
      else if (statusRes.data.sos?.assignedResponder) setCurrentStep(1);
      else setCurrentStep(0);

      // Fetch assigned rescuer details
      const rescRes = await axios.get(`${API_URL}/sos/assigned/${survivorId}`);
      if (rescRes.data) setRescuer(rescRes.data);
    } catch (e) {
      console.log('Status fetch failed:', e.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00f2ff" />
        <Text style={styles.loadingText}>Syncing with command center...</Text>
      </View>
    );
  }

  if (currentStep === -1 || !statusData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="shield-checkmark" size={60} color="#333" />
        <Text style={styles.noSosTitle}>NO ACTIVE SOS</Text>
        <Text style={styles.noSosSub}>You have no ongoing emergency. Stay safe.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="pulse" size={24} color="#00ff88" />
        <Text style={styles.headerTitle}>RESCUE STATUS</Text>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {TIMELINE_STEPS.map((step, idx) => {
          const isActive = idx <= currentStep;
          const isCurrent = idx === currentStep;
          return (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLine}>
                <View style={[
                  styles.timelineDot,
                  isActive && styles.timelineDotActive,
                  isCurrent && styles.timelineDotCurrent,
                ]}>
                  <Ionicons name={step.icon} size={16} color={isActive ? '#fff' : '#555'} />
                </View>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <View style={[styles.timelineConnector, isActive && styles.timelineConnectorActive]} />
                )}
              </View>
              <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Current Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.cardLabel}>CURRENT STATUS</Text>
        <Text style={styles.cardValue}>{statusData.status}</Text>
      </View>

      {/* Rescuer Info */}
      {rescuer && (
        <View style={styles.rescuerCard}>
          <Text style={styles.cardLabel}>ASSIGNED RESCUE UNIT</Text>
          <View style={styles.rescuerRow}>
            <Ionicons name="shield" size={36} color="#00f2ff" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rescuerName}>{rescuer.name}</Text>
              <Text style={styles.rescuerMeta}>{rescuer.type} Unit • {rescuer.status}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: rescuer.status === 'Busy' ? '#ffaa00' : '#00ff88' }]}>
              <Text style={[styles.statusBadgeText, { color: rescuer.status === 'Busy' ? '#ffaa00' : '#00ff88' }]}>
                {rescuer.status === 'Busy' ? 'EN ROUTE' : rescuer.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* SOS Details */}
      {statusData.sos && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardLabel}>SOS DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Category</Text>
            <Text style={styles.detailVal}>{statusData.sos.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Priority</Text>
            <Text style={[styles.detailVal, {
              color: statusData.sos.priority === 'Critical' ? '#ff4d4d' :
                statusData.sos.priority === 'High' ? '#ffaa00' : '#00f2ff'
            }]}>
              {statusData.sos.priority}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Submitted</Text>
            <Text style={styles.detailVal}>{new Date(statusData.sos.timestamp).toLocaleString()}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  loadingText: { color: '#00f2ff', marginTop: 15, fontSize: 12, letterSpacing: 1 },
  noSosTitle: { color: '#555', fontSize: 20, fontWeight: 'bold', marginTop: 15, letterSpacing: 2 },
  noSosSub: { color: '#444', fontSize: 13, marginTop: 8 },

  // Timeline
  timeline: { paddingHorizontal: 20, marginVertical: 20 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 60 },
  timelineLine: { alignItems: 'center', width: 40 },
  timelineDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1d24',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333',
  },
  timelineDotActive: { backgroundColor: '#00f2ff33', borderColor: '#00f2ff' },
  timelineDotCurrent: { backgroundColor: '#00f2ff', borderColor: '#00f2ff' },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#333', minHeight: 24 },
  timelineConnectorActive: { backgroundColor: '#00f2ff' },
  timelineLabel: { color: '#555', fontSize: 14, fontWeight: 'bold', marginLeft: 12, marginTop: 6 },
  timelineLabelActive: { color: '#fff' },

  // Cards
  statusCard: {
    marginHorizontal: 20, marginBottom: 15, padding: 18, backgroundColor: '#111',
    borderRadius: 12, borderWidth: 1, borderColor: '#00f2ff33', borderLeftWidth: 4, borderLeftColor: '#00f2ff',
  },
  cardLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  cardValue: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },

  rescuerCard: {
    marginHorizontal: 20, marginBottom: 15, padding: 18, backgroundColor: '#111',
    borderRadius: 12, borderWidth: 1, borderColor: '#222',
  },
  rescuerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rescuerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rescuerMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  detailsCard: {
    marginHorizontal: 20, marginBottom: 15, padding: 18, backgroundColor: '#111',
    borderRadius: 12, borderWidth: 1, borderColor: '#222',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1d24',
  },
  detailKey: { color: '#666', fontSize: 12 },
  detailVal: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
