import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '@/constants/api';

export default function SOSMessageScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [survivorIdentity, setSurvivorIdentity] = useState(null);
  
  const fetchMessages = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/sos-messages/${id}`);
      setMessages(res.data);
    } catch (e) { console.log('Fetch messages error'); }
  };

  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('survivorId');
        const name = await AsyncStorage.getItem('survivorName');
        setSurvivorIdentity({ survivorId: id, name });
        if (id) fetchMessages(id);
      } catch (error) {
        console.log("AsyncStorage unavailable in index:", error);
      }
    })();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !survivorIdentity?.survivorId) return;
    
    setLoading(true);
    try {
      let extLocation = { type: 'Point', coordinates: [0, 0] };
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        extLocation = { type: 'Point', coordinates: [loc.coords.longitude, loc.coords.latitude] };
      }

      await axios.post(`${API_URL}/sos-messages`, {
        survivorId: survivorIdentity.survivorId,
        username: survivorIdentity.name,
        message,
        location: extLocation
      });

      // E2E Compliance: Also post explicitly to the core SOS dispatch endpoint
      const sosPayload = {
        survivorId: survivorIdentity.survivorId,
        phone: survivorIdentity.survivorId,
        latitude: extLocation.coordinates[1],
        longitude: extLocation.coordinates[0],
        category: "Medical",
        emergencyType: "Medical",
        name: survivorIdentity.name || "Unknown Citizen",
        email: "N/A",
        heartRate: 80,
        timestamp: new Date().toISOString()
      };
      console.log('[Survivor] Sending SOS payload:', JSON.stringify(sosPayload));
      const sosRes = await axios.post(`${API_URL}/sos`, sosPayload);
      console.log('[Survivor] SOS response:', sosRes.status, sosRes.data?.success);

      setMessage('');
      fetchMessages(survivorIdentity.survivorId);
      Alert.alert("SOS Sent", "Message successfully delivered to the backend network.");
    } catch (err) {
      console.error('[Survivor] SOS transmission error:', err.message);
      Alert.alert('Network Request Failed', `Attempted to reach: ${API_URL}/sos\n\nError: ${err.message}\n\nPlease check if your phone is on the same WiFi network as your PC.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
         <Ionicons name="alert-circle-outline" color="#ff4d4d" size={24}/>
         <Text style={styles.headerText}>SOS STATUS LOGS</Text>
      </View>
      <Text style={styles.subtext}>Update your status continuously. ResiliNet AI automatically summarizes these logs for Tactical Triage & Rescuers.</Text>
      
      <ScrollView style={styles.messageScroll}>
        {messages.map((msg, idx) => (
          <View key={idx} style={styles.messageCard}>
             <Text style={styles.messageTime}>{new Date(msg.createdAt).toLocaleTimeString()} - {msg.username}</Text>
             <Text style={styles.messageBody}>{msg.message}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="e.g., Trapped inside, leg bleeding..."
          placeholderTextColor="#666"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Ionicons name="send-outline" color="#000" size={20} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  headerText: { color: '#ff4d4d', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  subtext: { color: '#888', fontSize: 11, paddingHorizontal: 20, marginBottom: 20, lineHeight: 16 },
  messageScroll: { flex: 1, paddingHorizontal: 20 },
  messageCard: { backgroundColor: '#1a1d24', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  messageTime: { color: '#555', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 5 },
  messageBody: { color: '#fff', fontSize: 14, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#0f1115' },
  input: { flex: 1, backgroundColor: '#1a1d24', color: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333', maxHeight: 100 },
  sendBtn: { backgroundColor: '#00f2ff', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8, marginLeft: 10 }
});