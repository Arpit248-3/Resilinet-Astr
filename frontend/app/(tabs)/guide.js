import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const EMERGENCY_DATA = [
  { 
    id: '1', 
    title: 'CPR Basics', 
    tags: 'heart, breath, chest', 
    content: 'Keep blood flowing to the brain during cardiac arrest.',
    steps: ['Check surroundings for safety', 'Call emergency services immediately', 'Push hard and fast in the center of the chest', 'Maintain 100-120 compressions per minute'] 
  },
  { 
    id: '2', 
    title: 'Bleeding Control', 
    tags: 'blood, cut, wound', 
    content: 'Apply firm pressure to stop life-threatening blood loss.',
    steps: ['Apply firm pressure with clean cloth', 'Elevate the wound above heart level', 'Use a tourniquet if bleeding is uncontrollable'] 
  },
  // ... other data remains the same
];

export default function OfflineGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredData = EMERGENCY_DATA.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Survival Guide</Text>

      {/* NEW: First Aid Quick-Launch Button */}
      <TouchableOpacity 
        style={styles.firstAidBtn}
        onPress={() => {
          const cpr = EMERGENCY_DATA.find(d => d.id === '1');
          router.push({
            pathname: '/guide-detail',
            params: { title: cpr.title, content: cpr.content, steps: JSON.stringify(cpr.steps) }
          });
        }}
      >
        <Ionicons name="pulse-outline" size={24} color="#fff" />
        <Text style={styles.firstAidText}>EMERGENCY FIRST AID</Text>
      </TouchableOpacity>
      
      <View style={styles.searchSection}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search by injury..."
          placeholderTextColor="#999"
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredData.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.card} 
            onPress={() => router.push({
              pathname: '/guide-detail',
              params: { title: item.title, content: item.content, steps: JSON.stringify(item.steps) }
            })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}><Ionicons name="book-outline" size={20} color="#e63946" /></View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{item.content}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#ccc" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 15 },
  firstAidBtn: { 
    backgroundColor: '#e63946', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 18, 
    borderRadius: 15, 
    marginBottom: 20 
  },
  firstAidText: { color: '#fff', fontWeight: 'bold', marginLeft: 10, letterSpacing: 1 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 15, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, height: 50, fontSize: 16, marginLeft: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 17, fontWeight: 'bold' },
  cardSubtitle: { fontSize: 13, color: '#777' }
});