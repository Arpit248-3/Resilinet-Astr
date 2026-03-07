import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io } from 'socket.io-client';
import QRCode from 'react-native-qrcode-svg';
import CryptoJS from 'crypto-js';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL, SOCKET_URL, SECRET_KEY } from '@/constants/api';

export default function RescueStatusScreen() {
  const [statusObj, setStatusObj] = useState(null);
  const [survivorIdentity, setSurvivorIdentity] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const id = await AsyncStorage.getItem('survivorId');
      const phone = await AsyncStorage.getItem('survivorPhone');
      setSurvivorIdentity({ survivorId: id, phone });

      if (id) {
        const res = await axios.get(`${API_URL}/sos/status/${id}`);
        setStatusObj(res.data);
      }
    } catch (e) {
      console.log('Status fetch or AsyncStorage error', e);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = io(SOCKET_URL);
    socket.on('units-update', fetchData);
    socket.on('rescue-complete', fetchData);
    socket.on('supply-delivered', fetchData);

    return () => socket.disconnect();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getQRData = () => {
    if (!statusObj?.sos || !survivorIdentity?.survivorId) return null;
    
    // Cryptographic Timestamp Hash Payload
    const ts = new Date().toISOString();
    const payloadStr = JSON.stringify({
      survivorId: survivorIdentity.survivorId,
      sosId: statusObj?.sos?._id || "N/A",
      timestamp: ts
    });
    
    const signature = CryptoJS.HmacSHA256(payloadStr, SECRET_KEY).toString();
    return JSON.stringify({ ...JSON.parse(payloadStr), signature });
  };

  const renderStatusStep = (title, active, icon) => (
    <View style={[styles.stepRow, active ? styles.stepActive : {}]}>
      <View style={[styles.iconBox, active ? { backgroundColor: '#00f2ff22', borderColor: '#00f2ff' } : {}]}>
        {icon}
      </View>
      <Text style={[styles.stepTitle, active ? { color: '#00f2ff' } : {}]}>{title}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f2ff" />}
    >
      <Text style={styles.header}>TACTICAL RESCUE PROTOCOL</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MISSION STATUS</Text>
        {statusObj?.status === 'No Active SOS' ? (
           <Text style={styles.inactiveText}>No Active SOS Transmitted.</Text>
        ) : (
          <View style={styles.tracker}>
             {renderStatusStep('SOS Submitted', true, <Ionicons name="pulse-outline" size={20} color={statusObj?.status ? "#00f2ff" : "#555"}/>)}
             {renderStatusStep('Responder Assigned', ["Responder En Route", "Aid Delivered", "Resolved"].includes(statusObj?.status), <Ionicons name="shield-checkmark-outline" size={20} color={["Responder En Route", "Aid Delivered", "Resolved"].includes(statusObj?.status) ? "#00f2ff" : "#555"}/>)}
             {renderStatusStep('Responder En Route', ["Responder En Route", "Aid Delivered", "Resolved"].includes(statusObj?.status), <Ionicons name="car-outline" size={20} color={["Responder En Route", "Aid Delivered", "Resolved"].includes(statusObj?.status) ? "#00f2ff" : "#555"}/>)}
             {renderStatusStep('Aid Delivered', ["Aid Delivered", "Resolved"].includes(statusObj?.status), <Ionicons name="checkmark-circle-outline" size={20} color={["Aid Delivered", "Resolved"].includes(statusObj?.status) ? "#00f2ff" : "#555"}/>)}
             {renderStatusStep('Resolved', statusObj?.status === 'Resolved', <Ionicons name="flag-outline" size={20} color={statusObj?.status === 'Resolved' ? "#00f2ff" : "#555"}/>)}
          </View>
        )}
      </View>

      {statusObj?.status && ["Responder Assigned", "Responder En Route", "rescue_assigned"].includes(statusObj.status) && (
        <TouchableOpacity style={styles.scanRescuerBtn} onPress={() => router.push('/scanner')}>
          <Ionicons name="qr-code-outline" size={20} color="#000" />
          <Text style={styles.scanRescuerText}>SCAN RESCUER IDENTIFICATION</Text>
        </TouchableOpacity>
      )}

      {statusObj?.status && statusObj.status !== 'No Active SOS' && statusObj.status !== 'Resolved' && (
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>SECURE HANDSHAKE (QR)</Text>
          <Text style={styles.qrInstructions}>Present this cryptographic code to the Rescuer upon arrival to securely verify delivery and close your SOS.</Text>
          <View style={styles.qrBox}>
            {getQRData() ? (
              <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 12 }}>
                <QRCode value={getQRData()} size={180} />
              </View>
            ) : <Ionicons name="pulse-outline" color="#888" size={30} />}
          </View>
        </View>
      )}

      {survivorIdentity && (
         <View style={styles.identityCard}>
            <Text style={styles.cardTitle}>SURVIVOR IDENTITY</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
              <View>
                <Text style={styles.idLabel}>ID HASH</Text>
                <Text style={styles.idValue}>{(survivorIdentity?.survivorId || "").substring(0, 12).toUpperCase()}</Text>
                <Text style={[styles.idLabel, {marginTop: 10}]}>PHONE</Text>
                <Text style={styles.idValue}>{survivorIdentity?.phone || "N/A"}</Text>
              </View>
              <View style={{ backgroundColor: '#fff', padding: 5 }}>
                 <QRCode value={JSON.stringify(survivorIdentity)} size={60} />
              </View>
            </View>
         </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10', padding: 20 },
  header: { color: '#00f2ff', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 20, marginTop: 40 },
  card: { backgroundColor: '#1a1d24', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  cardTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15 },
  inactiveText: { color: '#555', fontStyle: 'italic' },
  tracker: { borderLeftWidth: 2, borderLeftColor: '#222', marginLeft: 10, paddingLeft: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  iconBox: { position: 'absolute', left: -36, backgroundColor: '#1a1d24', borderWidth: 2, borderColor: '#333', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: '#555', fontSize: 14, fontWeight: 'bold' },
  stepActive: { opacity: 1 },
  qrCard: { backgroundColor: '#1a1d24', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#00f2ff33', marginBottom: 20 },
  qrInstructions: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  qrBox: { alignItems: 'center', marginVertical: 10 },
  identityCard: { backgroundColor: '#0f1115', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 40 },
  idLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  idValue: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 4, fontFamily: 'monospace' },
  scanRescuerBtn: { backgroundColor: '#00f2ff', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, marginBottom: 20, gap: 10 },
  scanRescuerText: { color: '#000', fontWeight: '900', letterSpacing: 1, fontSize: 12 }
});
