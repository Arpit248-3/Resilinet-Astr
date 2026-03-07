import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '@/constants/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if survivor is already logged in
    const checkLogin = async () => {
      try {
        const id = await AsyncStorage.getItem('survivorId');
        if (id) {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.log("AsyncStorage check failed on load:", error);
      }
    };
    checkLogin();
  }, [router]);

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/survivor/login`, {
        phone,
        name: name.trim() || 'Unknown Survivor'
      });
      
      const { survivorId } = res.data;
      await AsyncStorage.setItem('survivorId', survivorId);
      await AsyncStorage.setItem('survivorPhone', phone);
      await AsyncStorage.setItem('survivorName', name.trim() || 'Unknown Survivor');
      
      router.replace('/(tabs)');
    } catch (err) {
      console.error(err);
      alert('Network Error. Could not connect to Resilinet Command Center.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandContainer}>
        <Ionicons name="shield-outline" color="#00f2ff" size={64} style={{ marginBottom: 20 }} />
        <Text style={styles.title}>RESILINET</Text>
        <Text style={styles.subtitle}>SURVIVOR CONNECTION PROTOCOL</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>MOBILE IDENTIFIER</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor="#555"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>FULL NAME (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Name"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>ESTABLISH CONNECTION</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure 256-bit Encrypted Handshake</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b10',
    justifyContent: 'center',
    padding: 30,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#00f2ff',
    letterSpacing: 2,
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1d24',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    color: '#fff',
    padding: 15,
    fontSize: 16,
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#00f2ff',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  footerText: {
    color: '#444',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
