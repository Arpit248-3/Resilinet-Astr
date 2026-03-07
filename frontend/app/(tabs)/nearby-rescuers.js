import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { API_URL } from '@/constants/api';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NearbyRescuersScreen() {
  const [rescuers, setRescuers] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: location.coords.latitude, lng: location.coords.longitude });

      try {
        const res = await axios.get(`${API_URL}/responders`);
        let list = res.data.filter(r => r.location?.coordinates);
        
        // Calculate Distance
        list = list.map(unit => ({
          ...unit,
          distance: calculateDistance(
            location.coords.latitude, location.coords.longitude,
            unit.location.coordinates[1], unit.location.coordinates[0]
          )
        }));

        list.sort((a, b) => a.distance - b.distance);
        setRescuers(list);
      } catch (err) { }
    })();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.status, { color: item.status === 'Available' ? '#00ffaa' : '#ffcc00' }]}>{item.status}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.statLine}><Ionicons name="people-outline" size={12} color="#00f2ff"/> TYPE: {item.type}</Text>
        <Text style={styles.statLine}>📍 DISTANCE: {item.distance.toFixed(1)} KM</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
          <Ionicons name="call-outline" size={14} color="#00f2ff" />
          <Text style={styles.actionText}>CALL UNIT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/map')}>
          <Ionicons name="map-outline" size={14} color="#00f2ff" />
          <Text style={styles.actionText}>TRACK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>NEARBY TACTICAL UNITS</Text>
      <FlatList
        data={rescuers}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ color: '#fff' }}>No responders available in sector.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10', paddingTop: 60 },
  headerTitle: { color: '#00f2ff', fontSize: 16, fontWeight: '900', letterSpacing: 2, paddingHorizontal: 20, marginBottom: 10 },
  card: { backgroundColor: '#1a1d24', borderRadius: 8, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  name: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  status: { fontSize: 10, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  stats: { marginBottom: 20 },
  statLine: { color: '#ccc', fontSize: 12, marginBottom: 5, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0, 242, 255, 0.1)', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#00f2ff55' },
  actionText: { color: '#00f2ff', fontWeight: 'bold', fontSize: 12 }
});
