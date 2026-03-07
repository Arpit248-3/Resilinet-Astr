import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '@/constants/api';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
      const parsedData = JSON.parse(data);
      if (!parsedData.rescuerId || !parsedData.sosId) {
        Alert.alert("Invalid QR", "This QR code is not a valid Resilinet Rescue Token.");
        return;
      }

      await axios.post(`${API_URL}/rescue/start`, {
        rescuerId: parsedData.rescuerId,
        sosId: parsedData.sosId
      });

      Alert.alert(
        "RESCUE INITIATED", 
        "Handshake Verified. The Rescuer has taken charge of your SOS.",
        [{ text: "OK", onPress: () => router.push('/rescue-status') }]
      );
    } catch (e) {
      Alert.alert("Error", "Could not verify Rescuer QR code with the network.");
      setScanned(false);
    }
  };

  if (hasPermission === null) return <Text style={{ color: '#fff', padding: 20 }}>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text style={{ color: '#ff4444', padding: 20 }}>No access to camera.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SCAN RESCUER</Text>
      <Text style={styles.sub}>Scan the Rescuer's QR code to verify their identity and start the localized operation.</Text>

      <View style={styles.scannerWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={styles.targetBox} />
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.push('/rescue-status')}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20 },
  header: { color: '#00f2ff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, marginTop: 40, textAlign: 'center' },
  sub: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 30, letterSpacing: 1, lineHeight: 18 },
  scannerWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#333', position: 'relative' },
  targetBox: { position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', borderWidth: 2, borderColor: '#00f2ff', borderRadius: 8, borderStyle: 'dashed' },
  cancelBtn: { backgroundColor: '#1a1d24', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#333' },
  cancelText: { color: '#aaa', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
