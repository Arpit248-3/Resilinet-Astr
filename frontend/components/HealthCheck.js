import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
// import * as FaceDetector from 'expo-face-detector'; // DISABLED NATIVE MODULE
import QRCode from 'react-native-qrcode-svg';

export default function HealthCheck() {
  const [peopleCount, setPeopleCount] = useState(0);
  const [cryptoToken, setCryptoToken] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#fff' }}>Camera permission required for triage.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // SIMULATED TRIAGE (Replaces handleFacesDetected to avoid native module call)
  const simulateTriage = () => {
    const mockCount = 1;
    setPeopleCount(mockCount);
    const token = `RESILI-V-MOCK-${Math.floor(Math.random() * 1000)}-${Date.now()}`;
    setCryptoToken(token);
  };

  const resetScanner = () => {
    setCryptoToken(null);
    setPeopleCount(0);
  };

  return (
    <View style={styles.container}>
      {/* Camera View - faceDetectorSettings removed to avoid crash */}
      <CameraView 
        style={styles.camera}
        // onFacesDetected={handleFacesDetected} // DISABLED
      />
      
      <View style={styles.overlay}>
        <Text style={styles.countText}>LIVE TRIAGE: {peopleCount} PERSON(S) DETECTED</Text>
        
        {cryptoToken ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrLabel}>CRYPTOGRAPHIC VERIFICATION TOKEN</Text>
            <QRCode value={cryptoToken} size={150} color="black" backgroundColor="white" />
            <Text style={styles.tokenText}>{cryptoToken}</Text>
            
            <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
              <Text style={styles.resetButtonText}>SCAN NEW TARGET</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchingContainer}>
            <Text style={styles.searchingText}>NATIVE FACE DETECTION DISABLED FOR EXPO GO</Text>
            <TouchableOpacity style={styles.button} onPress={simulateTriage}>
              <Text style={styles.buttonText}>SIMULATE BIOMETRIC SCAN</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { height: '30%' }, // Reduced height to save resources
  overlay: { 
    padding: 20, 
    alignItems: 'center', 
    backgroundColor: '#0a0a0a', 
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: '#00ff41'
  },
  countText: { color: '#00ff41', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginBottom: 20 },
  qrContainer: { 
    marginTop: 10, 
    padding: 20, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    borderRadius: 15,
    width: '90%'
  },
  qrLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  tokenText: { fontSize: 9, marginTop: 10, color: '#666', fontFamily: 'monospace' },
  searchingContainer: { marginTop: 30, alignItems: 'center' },
  searchingText: { color: '#888', fontSize: 10, marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: '#00ff41', padding: 15, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  resetButton: { 
    marginTop: 20, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    backgroundColor: '#000', 
    borderRadius: 5 
  },
  resetButtonText: { color: '#00ff41', fontSize: 12, fontWeight: 'bold' }
});