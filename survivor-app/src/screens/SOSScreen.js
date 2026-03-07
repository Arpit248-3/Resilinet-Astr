import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Animated, Vibration
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

const CATEGORIES = [
  { id: 'MEDICAL', label: 'Medical', icon: 'medkit', color: '#ff4d4d' },
  { id: 'FIRE', label: 'Fire', icon: 'flame', color: '#ff8c00' },
  { id: 'FLOOD', label: 'Flood', icon: 'water', color: '#4d79ff' },
  { id: 'EARTHQUAKE', label: 'Quake', icon: 'earth', color: '#8B4513' },
  { id: 'RESCUE', label: 'Rescue', icon: 'people', color: '#00cc88' },
  { id: 'GENERAL', label: 'Other', icon: 'alert-circle', color: '#888' },
];

export default function SOSScreen() {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sosId, setSosId] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsating SOS button animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const sendSOS = async () => {
    setSending(true);
    Vibration.vibrate(500);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Enable location access to send SOS.');
        setSending(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const survivorId = await AsyncStorage.getItem('survivorId') || 'survivor-anon';
      const name = await AsyncStorage.getItem('survivorName') || 'Unknown';
      const phone = await AsyncStorage.getItem('survivorPhone') || 'N/A';

      const payload = {
        survivorId,
        name,
        phone,
        message: message || category,
        category,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      console.log('SOS sending payload:', JSON.stringify(payload));

      const res = await axios.post(`${API_URL}/sos`, payload);
      console.log('SOS sent successfully:', res.data);

      if (res.data?.data?._id) {
        await AsyncStorage.setItem('activeSosId', res.data.data._id);
        setSosId(res.data.data._id);
      }

      setSent(true);
      Alert.alert('✅ SOS Sent!', 'Help is on the way. Check Rescue Status tab.');
    } catch (err) {
      console.error('SOS failed:', err.message);
      Alert.alert('SOS Failed', `Network error: ${err.message}`);
    }
    setSending(false);
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.sentContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#00ff88" />
          <Text style={styles.sentTitle}>SOS TRANSMITTED</Text>
          <Text style={styles.sentSubtitle}>
            Your emergency has been broadcast to all nearby rescue units and the command center.
          </Text>
          <Text style={styles.sosIdText}>SOS ID: {sosId?.substring(0, 8)}...</Text>
          <TouchableOpacity style={styles.newSosBtn} onPress={() => { setSent(false); setMessage(''); }}>
            <Text style={styles.newSosBtnText}>SEND ANOTHER SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="warning" size={28} color="#ff4d4d" />
        <Text style={styles.headerTitle}>EMERGENCY SOS</Text>
      </View>
      <Text style={styles.headerSub}>Select category and press the SOS button to send an alert.</Text>

      {/* Category Selector */}
      <Text style={styles.sectionLabel}>EMERGENCY TYPE</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.categoryBtn,
              category === c.id && { borderColor: c.color, backgroundColor: `${c.color}22` },
            ]}
            onPress={() => setCategory(c.id)}
          >
            <Ionicons name={c.icon} size={24} color={category === c.id ? c.color : '#666'} />
            <Text style={[styles.categoryLabel, category === c.id && { color: c.color }]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message Input */}
      <Text style={styles.sectionLabel}>DESCRIBE YOUR EMERGENCY</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Building collapsed, people trapped..."
        placeholderTextColor="#555"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
      />

      {/* SOS Button */}
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={sendSOS}
            disabled={sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Ionicons name="radio" size={36} color="#fff" />
                <Text style={styles.sosText}>SEND SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.sosHint}>Press to broadcast emergency signal</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 15, paddingBottom: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  headerSub: { color: '#666', fontSize: 12, paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10, marginBottom: 20 },
  categoryBtn: {
    width: '30%', flexGrow: 1, padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#222', backgroundColor: '#111', alignItems: 'center', gap: 6,
  },
  categoryLabel: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  input: {
    marginHorizontal: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  sosButton: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: '#cc0000',
    justifyContent: 'center', alignItems: 'center', elevation: 10,
    shadowColor: '#ff0000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
    borderWidth: 3, borderColor: '#ff4444',
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginTop: 6 },
  sosHint: { color: '#555', fontSize: 11, marginTop: 12, letterSpacing: 1 },
  sentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  sentTitle: { color: '#00ff88', fontSize: 24, fontWeight: 'bold', marginTop: 20, letterSpacing: 2 },
  sentSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  sosIdText: { color: '#00f2ff', fontFamily: 'monospace', marginTop: 15, fontSize: 12 },
  newSosBtn: {
    marginTop: 30, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 8,
    borderWidth: 1, borderColor: '#ff4d4d', backgroundColor: 'rgba(255,77,77,0.1)',
  },
  newSosBtnText: { color: '#ff4d4d', fontWeight: 'bold', letterSpacing: 1 },
});
