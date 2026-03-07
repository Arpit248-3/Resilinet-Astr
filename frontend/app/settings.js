import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';

export default function SettingsScreen() {
  const [contact, setContact] = useState('');

  return (
    <View style={styles.container}>
      <Stack.Options options={{ title: 'Settings', headerStyle: { backgroundColor: '#000' }, headerTintColor: '#fff' }} />
      <Text style={styles.label}>Emergency Contact Number</Text>
      <TextInput 
        style={styles.input} 
        placeholder="+91 00000 00000" 
        placeholderTextColor="#666"
        value={contact}
        onChangeText={setContact}
        keyboardType="phone-pad"
      />
      <TouchableOpacity 
        style={styles.saveBtn} 
        onPress={() => Alert.alert("Success", "Emergency contact updated.")}
      >
        <Text style={styles.saveText}>UPDATE CONTACTS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 25 },
  label: { color: '#fff', fontSize: 16, marginBottom: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  saveBtn: { backgroundColor: '#e63946', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#fff', fontWeight: 'bold', letterSpacing: 1 }
});