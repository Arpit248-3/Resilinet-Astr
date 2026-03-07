import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOS_TARGET_NUMBER = "6260055671";

const SOS_OPTIONS = [
  { id: 'medical', label: 'MEDICAL', icon: 'medkit', color: '#ff4d4d' },
  { id: 'fire', label: 'FIRE', icon: 'flame', color: '#ff944d' },
  { id: 'security', label: 'POLICE', icon: 'shield-checkmark', color: '#4d79ff' },
  { id: 'disaster', label: 'DISASTER', icon: 'thunderstorm', color: '#ffcc00' },
  { id: 'cyber', label: 'CYBER', icon: 'lock-closed', color: '#9933ff' },
  { id: 'marine', label: 'MARINE', icon: 'boat', color: '#33ccff' }
];

export default function SOSScreen() {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Detecting location...");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress("Permission Denied");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      
      // Reverse Geocoding to fix "Address Not Found"
      let reverseToken = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      if (reverseToken.length > 0) {
        const item = reverseToken[0];
        setAddress(`${item.name || ''}, ${item.street || ''}, ${item.city || ''}`);
      }
    })();
  }, []);

  const triggerSOS = async (type) => {
    if (!location) {
      Alert.alert("Error", "Location not yet acquired. Please wait.");
      return;
    }

    // Ask user for severity to determine priority
    Alert.alert(
      "Confirm Priority",
      "Is this a life-threatening immediate emergency?",
      [
        { text: "NO (Standard)", onPress: () => processSOS(type, "STANDARD") },
        { text: "YES (Critical)", onPress: () => processSOS(type, "CRITICAL"), style: 'destructive' }
      ]
    );
  };

  const processSOS = async (type, priority) => {
    const lat = location.latitude;
    const lon = location.longitude;
    // Fixed: Corrected template literal for Google Maps URL
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    
    const message = `[${priority} SOS] ${type.toUpperCase()}\nLoc: ${address}\nMap: ${googleMapsUrl}`;

    // 1. Send SMS to the target authority number
    const smsUrl = Platform.OS === 'ios' 
      ? `sms:${SOS_TARGET_NUMBER}&body=${encodeURIComponent(message)}` 
      : `sms:${SOS_TARGET_NUMBER}?body=${encodeURIComponent(message)}`;

    // 2. Alert Backend for PDF generation and Web Feed
    try {
      const survivorId = await AsyncStorage.getItem('survivorId') || SOS_TARGET_NUMBER;
      const survivorName = await AsyncStorage.getItem('survivorName') || "Unknown Citizen";

      await fetch(`${API_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survivorId: survivorId,
          name: survivorName, 
          phone: survivorId,
          category: type,
          priority: priority,
          ai_insight: `User signaled ${type} emergency via mobile app.`,
          latitude: lat,
          longitude: lon
        })
      });
    } catch (error) {
      console.error("Backend offline, sending SMS only. Error details:", error);
    }

    Linking.openURL(smsUrl);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RESILINET SOS</Text>
        <Text style={styles.locationText}>📍 {address}</Text>
      </View>

      <View style={styles.grid}>
        {SOS_OPTIONS.map((opt) => (
          <TouchableOpacity 
            key={opt.id} 
            style={[styles.sosButton, { backgroundColor: opt.color }]} 
            onPress={() => triggerSOS(opt.label)}
          >
            <Ionicons name={opt.icon} size={40} color="#fff" />
            <Text style={styles.buttonLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerInfo}>Alerts will be sent to Authorities and {SOS_TARGET_NUMBER}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 30, backgroundColor: '#111', borderBottomWidth: 2, borderBottomColor: '#ff4d4d' },
  headerTitle: { color: '#ff4d4d', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  locationText: { color: '#888', textAlign: 'center', marginTop: 10, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 10 },
  sosButton: { 
    width: '45%', 
    height: 140, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 10, 
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  buttonLabel: { color: '#fff', fontWeight: 'bold', marginTop: 10, fontSize: 16 },
  footer: { padding: 20, alignItems: 'center' },
  footerInfo: { color: '#555', fontSize: 11, textAlign: 'center' }
});