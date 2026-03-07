import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      console.log('QR Data:', parsed);

      const survivorId = await AsyncStorage.getItem('survivorId') || 'survivor-anon';

      const payload = {
        rescuerId: parsed.rescuerId,
        sosId: parsed.sosId || await AsyncStorage.getItem('activeSosId'),
        survivorId,
      };

      console.log('Confirm delivery payload:', payload);

      const res = await axios.post(`${API_URL}/sos/confirm-delivery`, payload);
      console.log('Delivery confirmed:', res.data);

      setResult({ success: true, rescuerId: parsed.rescuerId });
      Alert.alert('✅ Supply Confirmed!', 'Rescue delivery has been verified and logged.');
    } catch (err) {
      console.error('QR scan error:', err.message);
      setResult({ success: false });
      Alert.alert('Scan Failed', `Could not verify QR code: ${err.message}`);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="camera-outline" size={60} color="#555" />
        <Text style={styles.permText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (result) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons
          name={result.success ? 'checkmark-circle' : 'close-circle'}
          size={80}
          color={result.success ? '#00ff88' : '#ff4d4d'}
        />
        <Text style={[styles.resultTitle, { color: result.success ? '#00ff88' : '#ff4d4d' }]}>
          {result.success ? 'DELIVERY VERIFIED' : 'VERIFICATION FAILED'}
        </Text>
        {result.success && (
          <Text style={styles.resultSub}>
            Rescuer {result.rescuerId?.substring(0, 8)}... has confirmed supply delivery.
          </Text>
        )}
        <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setScanned(false); setResult(null); }}>
          <Ionicons name="scan" size={18} color="#00f2ff" />
          <Text style={styles.scanAgainText}>SCAN AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="qr-code" size={22} color="#00f2ff" />
        <Text style={styles.headerTitle}>QR VERIFICATION</Text>
      </View>
      <Text style={styles.headerSub}>Point your camera at the rescuer's QR code to confirm supply delivery.</Text>

      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {/* Scanning overlay */}
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      <View style={styles.instructions}>
        <Ionicons name="information-circle" size={16} color="#555" />
        <Text style={styles.instructText}>
          The rescuer will display their QR code after arriving with supplies. Scan it to confirm the delivery.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  headerSub: { color: '#666', fontSize: 12, paddingHorizontal: 20, marginBottom: 15 },
  scannerContainer: { flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: 220, height: 220, borderWidth: 3, borderColor: '#00f2ff',
    borderRadius: 20, backgroundColor: 'transparent',
  },
  instructions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, margin: 20, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#222',
  },
  instructText: { color: '#888', fontSize: 12, flex: 1, lineHeight: 18 },
  permText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 15, paddingHorizontal: 40 },
  permBtn: {
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, borderWidth: 1, borderColor: '#00f2ff', backgroundColor: 'rgba(0,242,255,0.1)',
  },
  permBtnText: { color: '#00f2ff', fontWeight: 'bold', letterSpacing: 1 },
  resultTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, letterSpacing: 2 },
  resultSub: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 },
  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 30,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8,
    borderWidth: 1, borderColor: '#00f2ff', backgroundColor: 'rgba(0,242,255,0.1)',
  },
  scanAgainText: { color: '#00f2ff', fontWeight: 'bold', letterSpacing: 1 },
});
