import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';
import socket from '../socket';

export default function RescuersMapScreen() {
  const [location, setLocation] = useState(null);
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMap();
    const interval = setInterval(fetchResponders, 10000);

    socket.on('units-update', (units) => {
      setResponders(units.filter(u => u.location?.coordinates));
    });

    socket.on('locationUpdate', (data) => {
      if (data.type === 'rescuer') {
        setResponders(prev => prev.map(r =>
          r._id === data.userId
            ? { ...r, location: { ...r.location, coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)] } }
            : r
        ));
      }
    });

    return () => {
      clearInterval(interval);
      socket.off('units-update');
      socket.off('locationUpdate');
    };
  }, []);

  const initMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location required for map.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      await fetchResponders();
    } catch (e) {
      console.error('Map init failed:', e);
    }
    setLoading(false);
  };

  const fetchResponders = async () => {
    try {
      const res = await axios.get(`${API_URL}/responders`);
      setResponders(res.data.filter(r => r.location?.coordinates));
    } catch (e) {
      console.log('Fetch responders failed');
    }
  };

  const openNavigation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const getStatusColor = (status) => {
    if (status === 'Available') return '#00ff88';
    if (status === 'Busy') return '#ffaa00';
    return '#ff4d4d';
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00f2ff" />
        <Text style={styles.loadingText}>Acquiring satellite lock...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 22.7196,
          longitude: location?.longitude || 75.8577,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        userInterfaceStyle="dark"
      >
        {/* Survivor Location */}
        {location && (
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={200}
            fillColor="rgba(0, 120, 255, 0.15)"
            strokeColor="rgba(0, 120, 255, 0.5)"
            strokeWidth={1}
          />
        )}

        {/* Responder Markers */}
        {responders.map((r) => {
          const lat = r.location.coordinates[1];
          const lng = r.location.coordinates[0];
          const dist = location ? getDistance(location.latitude, location.longitude, lat, lng) : '?';

          return (
            <Marker
              key={r._id}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={getStatusColor(r.status)}
              title={`${r.name} (${r.type})`}
              description={`${r.status} • ${dist} km away`}
              onCalloutPress={() => openNavigation(lat, lng)}
            />
          );
        })}
      </MapView>

      {/* Bottom Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelHeader}>
          <Ionicons name="locate" size={18} color="#00f2ff" />
          <Text style={styles.infoPanelTitle}>NEARBY RESCUE UNITS</Text>
          <Text style={styles.infoPanelCount}>{responders.length}</Text>
        </View>

        {responders.slice(0, 3).map((r) => {
          const lat = r.location.coordinates[1];
          const lng = r.location.coordinates[0];
          const dist = location ? getDistance(location.latitude, location.longitude, lat, lng) : '?';

          return (
            <View key={r._id} style={styles.unitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName}>{r.name}</Text>
                <Text style={styles.unitMeta}>{r.type} • {dist} km • {r.status}</Text>
              </View>
              <TouchableOpacity onPress={() => openNavigation(lat, lng)} style={styles.navBtn}>
                <Ionicons name="navigate" size={18} color="#00f2ff" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b10' },
  map: { flex: 1 },
  loadingText: { color: '#00f2ff', marginTop: 15, fontSize: 12, letterSpacing: 1 },
  infoPanel: {
    backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#333',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  infoPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  infoPanelTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, flex: 1 },
  infoPanelCount: {
    color: '#00f2ff', fontSize: 11, fontWeight: 'bold',
    backgroundColor: 'rgba(0,242,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  unitRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1a1d24',
  },
  unitName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  unitMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  navBtn: {
    padding: 10, backgroundColor: 'rgba(0,242,255,0.1)',
    borderRadius: 8, borderWidth: 1, borderColor: '#00f2ff33',
  },
});
