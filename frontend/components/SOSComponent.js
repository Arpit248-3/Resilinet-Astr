import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, Switch, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import * as Linking from 'expo-linking';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_SERVICE_NUMBER = "911"; 
const BACKEND_URL = `${API_URL}/sos`;
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

const SOS_OPTIONS = [
  { id: 'medical', label: 'MEDICAL', icon: 'medkit', color: '#ff4d4d' },
  { id: 'fire', label: 'FIRE', icon: 'flame', color: '#ff944d' },
  { id: 'police', label: 'POLICE', icon: 'shield-checkmark', color: '#4d79ff' },
];

const SHAKE_THRESHOLD = 2.5;

export default function SOSScreen() {
  const [location, setLocation] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [sosStatus, setSosStatus] = useState('idle'); 
  const [lastIncident, setLastIncident] = useState(null);
  
  const accelerometerSubscription = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc.coords);
    })();
  }, []);

  const triggerSOS = async (type) => {
    if (sosStatus === 'sent') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const timestamp = new Date().toLocaleTimeString();
    const mapUrl = location 
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=600x300&markers=color:red%7C${location.latitude},${location.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      : null;

    if (isTestMode) {
      setLastIncident({ type: `TEST: ${type}`, time: timestamp, status: 'Simulated', map: mapUrl });
      setSosStatus('sent');
      return;
    }

    Linking.openURL(`tel:${EMERGENCY_SERVICE_NUMBER}`);

    const network = await Network.getNetworkStateAsync();
    let uploadStatus = 'SMS/Share Only';

    if (network.isInternetReachable && location) {
      try {
        const survivorId = await AsyncStorage.getItem('survivorId') || "6260055671";
        const name = await AsyncStorage.getItem('survivorName') || "Unknown Citizen";
        
        const payload = {
            survivorId: survivorId,
            phone: survivorId,
            category: type,
            emergencyType: type,
            latitude: location.latitude,
            longitude: location.longitude,
            name: name,
            email: "N/A",
            heartRate: 90, 
            timestamp: new Date().toISOString()
        };

        const response = await fetch(BACKEND_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload), 
            headers: { 'Content-Type': 'application/json' } 
        });
        
        if (response.ok) {
            uploadStatus = 'Server Verified';
            Alert.alert("Success", "SOS safely delivered to ResiliNet Command!");
        } else {
            const errBody = await response.text();
            Alert.alert("Backend Warning", `Status: ${response.status}\nRes: ${errBody}`);
        }
      } catch (err) {
        console.log("Upload failed", err); 
        Alert.alert("Network Request Failed", `Attempted to reach: ${BACKEND_URL}\n\nError: ${err.message}\n\nPlease check if your phone is on the same WiFi network as your PC.`);
      }
    }

    setLastIncident({ type: type, time: timestamp, status: uploadStatus, map: mapUrl });
    setSosStatus('sent');

    const message = `🚨 RESILINET SOS: ${type} 🚨\nLocation: http://maps.google.com/?q=${location?.latitude},${location?.longitude}`;
    await Share.share({ message });
  };

  useEffect(() => {
    accelerometerSubscription.current = Accelerometer.addListener(data => {
      const force = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      if (force > SHAKE_THRESHOLD && sosStatus === 'idle') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerSOS('SHAKE-EMERGENCY');
      }
    });
    Accelerometer.setUpdateInterval(100);
    return () => accelerometerSubscription.current && accelerometerSubscription.current.remove();
  }, [sosStatus, location]);

  if (sosStatus === 'sent') return (
    <View style={styles.summaryContainer}>
      <Ionicons name="checkmark-circle" size={60} color="#4dff88" />
      <Text style={styles.summaryTitle}>INCIDENT SUMMARY</Text>
      {lastIncident?.map && <Image source={{ uri: lastIncident.map }} style={styles.mapImage} resizeMode="cover" />}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>TYPE: <Text style={styles.summaryValue}>{lastIncident?.type}</Text></Text>
        <Text style={styles.summaryLabel}>TIME: <Text style={styles.summaryValue}>{lastIncident?.time}</Text></Text>
        <Text style={styles.summaryLabel}>STATUS: <Text style={styles.summaryValue}>{lastIncident?.status}</Text></Text>
      </View>
      <TouchableOpacity style={styles.resetButton} onPress={() => setSosStatus('idle')}>
        <Text style={styles.resetButtonText}>DISMISS REPORT</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RESILINET SOS</Text>
        <View style={styles.testModeRow}>
          <Text style={[styles.testModeText, isTestMode && { color: '#4dff88' }]}>
            {isTestMode ? "TEST MODE ACTIVE" : "LIVE SOS MODE"}
          </Text>
          <Switch value={isTestMode} onValueChange={setIsTestMode} />
        </View>
        
        <View style={styles.indicatorContainer}>
           <Text style={styles.subText}>PRESS BUTTON OR SHAKE TO TRIGGER SOS</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {SOS_OPTIONS.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={[styles.sosButton, { backgroundColor: isTestMode ? '#2e7d32' : option.color }]} 
            onPress={() => triggerSOS(option.label)}
          >
            <Ionicons name={option.icon} size={50} color="#fff" />
            <Text style={styles.buttonLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingVertical: 60 },
  header: { alignItems: 'center' },
  headerTitle: { color: '#ff4d4d', fontSize: 28, fontWeight: 'bold' },
  testModeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  testModeText: { color: '#888', fontSize: 12 },
  indicatorContainer: { height: 100, justifyContent: 'center', alignItems: 'center' },
  subText: { color: '#888', fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  sosButton: { width: 160, height: 160, margin: 10, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  buttonLabel: { color: '#fff', fontWeight: 'bold', marginTop: 15 },
  summaryContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  summaryTitle: { color: '#fff', fontSize: 20, marginVertical: 10 },
  mapImage: { width: '100%', height: 200, borderRadius: 15 },
  summaryBox: { padding: 20, backgroundColor: '#111', borderRadius: 10, width: '100%' },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontWeight: 'bold' },
  resetButton: { marginTop: 20, backgroundColor: '#333', padding: 15, borderRadius: 30 },
  resetButtonText: { color: '#fff' }
});