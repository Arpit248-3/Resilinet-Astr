import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import axios from 'axios';
import { API_URL } from '../../App';

export default function QRScannerScreen({ responderId, missionId, navigate }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

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
      // Validate the QR payload matches the expected mission ID
      if (!data.includes(missionId)) {
        Alert.alert("Handshake Failed", "This QR code does not belong to the active mission survivor.");
        return;
      }

      // Execute secure API transaction
      await axios.post(`${API_URL}/sos/confirm-delivery`, {
        sosId: missionId,
        responderId: responderId
      });

      Alert.alert(
        "MISSION SUCCESS", 
        "Handshake Verified. The survivor is secured and command has been notified.",
        [{ text: "Return to Dashboard", onPress: () => navigate('Dashboard') }]
      );
    } catch (e) {
      Alert.alert("Verification Error", "Could not synchronize with the tactical server.");
    }
  };

  if (hasPermission === null) return <Text style={{ color: '#fff', padding: 20 }}>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text style={{ color: '#ff4444', padding: 20 }}>No access to camera.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SECURE HANDSHAKE SCANNER</Text>
      <Text style={styles.sub}>Scan the Survivor's encrypted QR code to authorize rescue completion and transfer supply chain custody.</Text>

      <View style={styles.scannerWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        
        {/* Optical Alignment Sight */}
        <View style={styles.targetBox} />
      </View>

      {scanned && (
        <TouchableOpacity style={styles.scanAgain} onPress={() => setScanned(false)}>
          <Text style={styles.scanAgainText}>TAP TO SCAN AGAIN</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigate('Mission')}>
        <Text style={styles.cancelText}>ABORT HANDSHAKE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20 },
  header: { color: '#00f2ff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, marginTop: 20, textAlign: 'center' },
  sub: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 30, letterSpacing: 1, lineHeight: 18 },
  scannerWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#333', position: 'relative' },
  targetBox: { position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', borderWidth: 2, borderColor: '#00f2ff', borderRadius: 8, borderStyle: 'dashed' },
  cancelBtn: { backgroundColor: '#1a1d24', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#333' },
  cancelText: { color: '#aaa', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  scanAgain: { backgroundColor: 'rgba(0, 242, 255, 0.15)', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#00f2ff' },
  scanAgainText: { color: '#00f2ff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
