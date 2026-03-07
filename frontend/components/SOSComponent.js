import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, Animated, Switch, Image, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import * as Linking from 'expo-linking';

// Constants defined globally within the file to avoid "not defined" errors
const SOS_TARGET_NUMBER = "6260055671";
const EMERGENCY_SERVICE_NUMBER = "911"; 
const BACKEND_URL = "http://127.0.0.1:5000/api/sos"; 
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
const SAFETY_PIN = "1234"; 

const SOS_OPTIONS = [
  { id: 'medical', label: 'MEDICAL', icon: 'medkit', color: '#ff4d4d' },
  { id: 'fire', label: 'FIRE', icon: 'flame', color: '#ff944d' },
  { id: 'police', label: 'POLICE', icon: 'shield-checkmark', color: '#4d79ff' },
];

const SHAKE_THRESHOLD = 2.5;

export default function SOSScreen() {
  const [location, setLocation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTestMode, setIsTestMode] = useState(false);
  const [dbLevel, setDbLevel] = useState(-160); 
  const [maxDbObserved, setMaxDbObserved] = useState(-160); 
  const [sosStatus, setSosStatus] = useState('idle'); 
  const [lastIncident, setLastIncident] = useState(null);
  const [isPinEntryVisible, setIsPinEntryVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const accelerometerSubscription = useRef(null);

  // Function used to calculate wave animations
  const getWaveScale = useCallback((db) => {
    if (!isRecording || db === -160) return 0.2;
    const power = Math.pow(10, db / 20); 
    return Math.max(0.2, Math.min(power * 2.5, 1.8));
  }, [isRecording]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc.coords);
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  const triggerSOS = useCallback(async (type, voiceUri) => {
    const timestamp = new Date().toLocaleTimeString();
    const finalType = maxDbObserved < -50 ? `SILENT-${type}` : type;

    const mapUrl = location 
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=600x300&markers=color:red%7C${location.latitude},${location.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      : null;

    if (isTestMode) {
      setLastIncident({ type: `TEST: ${finalType}`, time: timestamp, status: 'Simulated', map: mapUrl });
      setSosStatus('sent');
      return;
    }

    Linking.openURL(`tel:${EMERGENCY_SERVICE_NUMBER}`);

    const network = await Network.getNetworkStateAsync();
    let uploadStatus = 'SMS/Share Only';

    if (network.isInternetReachable && location) {
      const formData = new FormData();
      formData.append('audio', { uri: voiceUri, name: `sos_${Date.now()}.m4a`, type: 'audio/m4a' });
      formData.append('phone', SOS_TARGET_NUMBER);
      formData.append('category', finalType);
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());

      try {
        const response = await fetch(BACKEND_URL, { 
            method: 'POST', 
            body: formData, 
            headers: { 'Content-Type': 'multipart/form-data' } 
        });
        if (response.ok) uploadStatus = 'Server Verified';
      } catch (err) {
        console.log("Upload failed", err); 
      }
    }

    setLastIncident({ type: finalType, time: timestamp, status: uploadStatus, map: mapUrl });
    setSosStatus('sent');

    const message = `🚨 RESILINET SOS: ${finalType} 🚨\nLocation: http://maps.google.com/?q=${location?.latitude},${location?.longitude}`;
    await Share.share({ message });
  }, [location, isTestMode, maxDbObserved]);

  const stopAndTriggerSOS = useCallback(async (type) => {
    setIsRecording(false);
    setIsPinEntryVisible(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await triggerSOS(type, uri);
    } catch (err) {
      console.error("Stop Error:", err);
      recordingRef.current = null;
    }
  }, [triggerSOS]);

  const startVoiceCapture = async () => {
    try {
      setDbLevel(-160);
      setMaxDbObserved(-160);
      setPinInput('');
      
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: true 
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering !== undefined) {
            setDbLevel(status.metering);
            setMaxDbObserved(prev => Math.max(prev, status.metering));
          }
        },
        100
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setTimeLeft(10);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return prev - 1;
        });
      }, 1000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) { 
      console.error("Recording error", err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    accelerometerSubscription.current = Accelerometer.addListener(data => {
      const force = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      if (force > SHAKE_THRESHOLD && !isRecording && sosStatus === 'idle') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        startVoiceCapture();
      }
    });
    Accelerometer.setUpdateInterval(100);
    return () => accelerometerSubscription.current && accelerometerSubscription.current.remove();
  }, [isRecording, sosStatus]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    if (timeLeft === 0 && isRecording) {
      stopAndTriggerSOS("AUTO-EMERGENCY");
    }
  }, [timeLeft, isRecording, stopAndTriggerSOS]);

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
          {isRecording ? (
            <Animated.View style={[styles.recordingOverlay, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.waveContainer}>
                {[0.6, 1.2, 0.8, 1.4].map((val, i) => (
                  <View key={i} style={[styles.waveBar, { height: 30 * getWaveScale(dbLevel) * val, backgroundColor: '#ff4d4d' }]} />
                ))}
              </View>
              <Text style={styles.recordingText}>{timeLeft}s</Text>
            </Animated.View>
          ) : (
            <Text style={styles.subText}>HOLD BUTTON OR SHAKE TO TRIGGER</Text>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {SOS_OPTIONS.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={[styles.sosButton, { backgroundColor: isTestMode ? '#2e7d32' : option.color }]} 
            onPressIn={startVoiceCapture}
            onPressOut={() => { if (!isPinEntryVisible) stopAndTriggerSOS(option.label); }}
          >
            <Ionicons name={option.icon} size={50} color="#fff" />
            <Text style={styles.buttonLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={isPinEntryVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pinContainer}>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              value={pinInput}
              onChangeText={(t) => {
                setPinInput(t);
                if (t === SAFETY_PIN) {
                  setIsRecording(false);
                  setIsPinEntryVisible(false);
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingVertical: 60 },
  header: { alignItems: 'center' },
  headerTitle: { color: '#ff4d4d', fontSize: 28, fontWeight: 'bold' },
  testModeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  testModeText: { color: '#888', fontSize: 12 },
  indicatorContainer: { height: 100, justifyContent: 'center' },
  recordingOverlay: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  waveContainer: { flexDirection: 'row', gap: 4 },
  waveBar: { width: 4, borderRadius: 2 },
  subText: { color: '#888' },
  recordingText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
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
  resetButtonText: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  pinContainer: { padding: 30, backgroundColor: '#111', borderRadius: 20 },
  pinInput: { backgroundColor: '#222', color: '#fff', width: 200, height: 50, textAlign: 'center', fontSize: 24 }
});