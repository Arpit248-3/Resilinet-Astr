import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function LoginScreen({ setResponderId, navigate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Medical'); // Medical, Fire, Police
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !phone) {
      setError('Name and Phone are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/responders/register`, {
        name,
        phone,
        type
      });
      // Response contains the new responder document
      setResponderId(response.data._id);
      navigate('Map');
    } catch (err) {
      console.log('Register error:', err.message);
      setError('Registration failed. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESILINET TACTICAL</Text>
      <Text style={styles.subtitle}>RESPONDER INITIALIZATION</Text>

      <View style={styles.card}>
        <Text style={styles.label}>FULL NAME</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. John Doe" 
          placeholderTextColor="#666"
          value={name} 
          onChangeText={setName} 
        />

        <Text style={styles.label}>PHONE NUMBER</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. +1 555-0198" 
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={phone} 
          onChangeText={setPhone} 
        />

        <Text style={styles.label}>UNIT TYPE</Text>
        <View style={styles.typeContainer}>
          {['Medical', 'Fire', 'Police'].map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.typeButton, type === t && styles.typeButtonActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#0f1115" /> : <Text style={styles.submitText}>INITIALIZE HANDSHAKE</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', padding: 20 },
  title: { color: '#00f2ff', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  subtitle: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 40, letterSpacing: 3 },
  card: { backgroundColor: '#1a1d24', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  label: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginBottom: 8, marginTop: 15, letterSpacing: 1 },
  input: { backgroundColor: '#0f1115', color: '#fff', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  typeButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#333', borderRadius: 6, marginHorizontal: 4, alignItems: 'center' },
  typeButtonActive: { backgroundColor: 'rgba(0, 242, 255, 0.15)', borderColor: '#00f2ff' },
  typeText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  typeTextActive: { color: '#00f2ff' },
  error: { color: '#ff4444', marginTop: 15, textAlign: 'center', fontSize: 12 },
  submitBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 6, marginTop: 25, alignItems: 'center' },
  submitText: { color: '#0f1115', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});
