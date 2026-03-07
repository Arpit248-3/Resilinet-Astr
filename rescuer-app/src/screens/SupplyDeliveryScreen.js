import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function SupplyDeliveryScreen({ responderId }) {
  const [supplies, setSupplies] = useState([]);

  useEffect(() => {
    fetchSupplies();
  }, []);

  const fetchSupplies = async () => {
    try {
        const res = await axios.get(`${API_URL}/supply?responderId=${responderId}`);
        setSupplies(res.data);
    } catch (e) { console.log('Supply fetch error'); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/supply/${id}/status`, { status: newStatus });
      setSupplies(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
    } catch (e) { console.log('Supply status update failed'); }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.label}>MISSION ID</Text>
      <Text style={styles.value}>{item._id}</Text>
      
      <Text style={styles.label}>SUPPLY TYPE</Text>
      <Text style={styles.value}>{item.supplyType || 'General Relief'}</Text>
      
      <Text style={styles.label}>STATUS</Text>
      <Text style={[styles.value, { color: item.status === 'Delivered' ? '#00ffaa' : '#ffaa00' }]}>{item.status.toUpperCase()}</Text>

      {item.status !== 'Delivered' && (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btn} onPress={() => updateStatus(item._id, 'In-Transit')}>
            <Text style={styles.btnText}>IN TRANSIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { borderColor: '#00ffaa' }]} onPress={() => updateStatus(item._id, 'Delivered')}>
            <Text style={[styles.btnText, { color: '#00ffaa' }]}>MARK DELIVERED</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>LOGISTICS & SUPPLY DISPATCH</Text>
      <FlatList
        data={supplies}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ color: '#fff' }}>No Active Supply Missions</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115', padding: 20 },
  header: { color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15, marginTop: 20 },
  card: { backgroundColor: '#1a1d24', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 },
  value: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, marginHorizontal: 5, borderWidth: 1, borderColor: '#ffaa00', borderRadius: 8, alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 12, letterSpacing: 1, color: '#ffaa00' }
});
