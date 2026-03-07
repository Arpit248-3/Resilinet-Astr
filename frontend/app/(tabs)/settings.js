import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SYSTEM SETTINGS</Text>
      <TouchableOpacity style={styles.btn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" color="#ff4d4d" size={20} />
        <Text style={styles.btnText}>DISCONNECT FROM TACTICAL GRID</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10', justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { color: '#00f2ff', fontSize: 24, fontWeight: 'bold', marginBottom: 40, letterSpacing: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d24', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ff4d4d33' },
  btnText: { color: '#ff4d4d', fontWeight: 'bold', marginLeft: 15, letterSpacing: 1 }
});
