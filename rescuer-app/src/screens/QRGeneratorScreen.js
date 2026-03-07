import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRGeneratorScreen({ responderId, missionId, navigate }) {
  const qrPayload = JSON.stringify({ rescuerId: responderId, sosId: missionId });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>INITIATE RESCUE HANDSHAKE</Text>
      <Text style={styles.sub}>Present this secure QR code to the survivor's device.</Text>

      <View style={styles.qrContainer}>
        {missionId ? (
          <QRCode value={qrPayload} size={220} />
        ) : (
          <Text style={{color: '#888'}}>No Active Mission</Text>
        )}
      </View>
      <Text style={styles.instruction}>The Survivor's app scanner will validate this payload and secure the link.</Text>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Mission')}>
        <Text style={styles.backText}>BACK TO MISSION</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20, alignItems: 'center' },
  header: { color: '#00f2ff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, marginTop: 40 },
  sub: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 12, marginBottom: 30 },
  instruction: { color: '#ccc', textAlign: 'center', fontSize: 14, fontStyle: 'italic', marginBottom: 40, paddingHorizontal: 15 },
  backBtn: { backgroundColor: '#1a1d24', padding: 18, borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  backText: { color: '#00f2ff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
