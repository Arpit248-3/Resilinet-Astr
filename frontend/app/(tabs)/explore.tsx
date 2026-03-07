import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const [isSafe, setIsSafe] = useState(false);

  const handleCheckIn = () => {
    setIsSafe(true);
    Alert.alert("Status Broadcasted", "Your 'I Am Safe' status has been shared with your network.");
  };

  const contacts = [
    { name: 'Local Police', number: '100', icon: 'shield-outline' as const },
    { name: 'Ambulance', number: '102', icon: 'medical-outline' as const },
    { name: 'Fire Department', number: '101', icon: 'flame-outline' as const },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI SOS / RESOURCES</Text>
      </View>

      <View style={styles.checkInCard}>
        <View style={styles.checkInTextGroup}>
          <Text style={styles.checkInTitle}>Status Check-in</Text>
          <Text style={styles.checkInDesc}>Broadcast your safety status.</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkInBtn, isSafe && styles.safeActive]} 
          onPress={handleCheckIn}
          disabled={isSafe}
        >
          <Ionicons 
            name={(isSafe ? "checkmark-circle" : "radio-outline") as any} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.btnText}>{isSafe ? "SAFE" : "I AM SAFE"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertBox}>
        <View style={styles.alertHeader}>
          <Ionicons name="warning" size={20} color="#e63946" />
          <Text style={styles.alertHeaderText}>ACTIVE ALERT</Text>
        </View>
        <Text style={styles.alertContent}>Flood warning issued for low-lying areas. Move to high ground immediately.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EMERGENCY HOTLINES</Text>
        {contacts.map((contact, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.contactCard} 
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={contact.icon as any} size={24} color="#e63946" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactNumber}>{contact.number}</Text>
            </View>
            <Ionicons name="call" size={20} color="#2ecc71" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { marginTop: 60, marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  checkInCard: { 
    backgroundColor: '#111', padding: 20, borderRadius: 20, flexDirection: 'row', 
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#333' 
  },
  checkInTextGroup: { flex: 1 },
  checkInTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  checkInDesc: { color: '#666', fontSize: 13, marginTop: 4 },
  checkInBtn: { 
    backgroundColor: '#e63946', paddingHorizontal: 15, paddingVertical: 10, 
    borderRadius: 12, flexDirection: 'row', alignItems: 'center' 
  },
  safeActive: { backgroundColor: '#2ecc71' },
  btnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  alertBox: { 
    backgroundColor: 'rgba(230, 57, 70, 0.1)', borderWidth: 1, borderColor: '#e63946', 
    borderRadius: 15, padding: 15, marginBottom: 25 
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alertHeaderText: { color: '#e63946', fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
  alertContent: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#e63946', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  contactCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', 
    padding: 15, borderRadius: 15, marginBottom: 12 
  },
  iconContainer: { 
    width: 45, height: 45, borderRadius: 10, backgroundColor: '#1a1a1a', 
    justifyContent: 'center', alignItems: 'center' 
  },
  contactInfo: { flex: 1, marginLeft: 15 },
  contactName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  contactNumber: { color: '#666', fontSize: 14 },
});