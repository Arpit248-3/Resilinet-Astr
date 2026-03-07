import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io } from 'socket.io-client';

import { API_URL, SOCKET_URL } from '@/constants/api';

export default function MapTab() {
  const [region, setRegion] = useState(null);
  const [rescuerUnits, setRescuerUnits] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [assignedResponder, setAssignedResponder] = useState(null);
  const mapRef = useRef(null);

  const fetchMapData = async (survivorId) => {
    try {
      // 1. Fetch nearby rescuers
      const resResponders = await axios.get(`${API_URL}/responders`);
      setRescuerUnits(resResponders.data.filter(r => r.location?.coordinates));

      // 2. Fetch active SOS alerts
      const resAlerts = await axios.get(`${API_URL}/alerts`);
      setActiveAlerts(resAlerts.data.filter(a => a.status !== 'Resolved' && a.location?.coordinates));

      // 3. Check for specific assigned rescuer
      if (survivorId) {
        const resAssigned = await axios.get(`${API_URL}/sos/assigned/${survivorId}`);
        if (resAssigned.data) {
           setAssignedResponder(resAssigned.data);
        } else {
           setAssignedResponder(null);
        }
      }
    } catch (e) {
      console.log('Map sync failed:', e.message);
    }
  };

  useEffect(() => {
    let interval;
    let socket;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      const userRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(userRegion);
      
      let survivorId = null;
      try {
        survivorId = await AsyncStorage.getItem('survivorId');
      } catch (e) {
        console.log("AsyncStorage read fail on map:", e);
      }
      
      await fetchMapData(survivorId);

      // Forces the map to move to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(userRegion, 1000);
      }

      // Initialize Socket
      socket = io(SOCKET_URL);
      socket.on('units-update', (units) => {
         setRescuerUnits(units.filter(r => r.location?.coordinates));
         if (survivorId) fetchMapData(survivorId);
      });
      socket.on('new-sos', () => fetchMapData(survivorId));

      // 3 minute periodic refresh 
      interval = setInterval(() => {
        fetchMapData(survivorId);
      }, 180000);
    })();

    return () => {
      if (interval) clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  if (!region) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#00f2ff" />
        <Text style={{color: '#00f2ff', marginTop: 10, letterSpacing: 2, fontWeight: 'bold'}}>SYNCING SATELLITES...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        key={`${region.latitude}-${region.longitude}`}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={true}
        userInterfaceStyle='dark'
      >
        <Marker 
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title="Your Identity"
          description="Transmitting location securely"
          pinColor="green"
        />

        {/* Render Assigned Rescuer Explicitly using a Polyline tracking ray */}
        {assignedResponder && assignedResponder.location?.coordinates && (
          <>
            <Marker
              coordinate={{ latitude: assignedResponder.location.coordinates[1], longitude: assignedResponder.location.coordinates[0] }}
              title={`Assigned: ${assignedResponder.name}`}
              description={`Type: ${assignedResponder.type} | En-Route!`}
              pinColor="yellow"
            />
            <Polyline 
              positions={[
                { latitude: region.latitude, longitude: region.longitude }, 
                { latitude: assignedResponder.location.coordinates[1], longitude: assignedResponder.location.coordinates[0] }
              ]}
              strokeColor="#00f2ff" 
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          </>
        )}

        {/* Render other Rescuers (Blue) */}
        {rescuerUnits.map(unit => {
          if (assignedResponder && unit._id === assignedResponder._id) return null; // already rendered
          if (!unit.location?.coordinates) return null; // Map Crash Safeguard
          return (
            <Marker
              key={unit._id}
              coordinate={{ latitude: unit.location.coordinates[1], longitude: unit.location.coordinates[0] }}
              title={unit.name}
              description={`${unit.type} | ${unit.status}`}
              pinColor="blue"
            />
          );
        })}

        {/* Render Active SOS Distresses (Red) */}
        {activeAlerts.map(alert => (
          <Marker
            key={alert._id}
            coordinate={{ latitude: alert.location.coordinates[1], longitude: alert.location.coordinates[0] }}
            title={alert.category || "SOS"}
            description={alert.name}
            pinColor="red"
          />
        ))}

      </MapView>

      {assignedResponder && (
        <View style={styles.trackingOverlay}>
           <Text style={styles.overlayTitle}>ASSIGNED UNIT EN ROUTE</Text>
           <Text style={styles.overlayText}>{assignedResponder.name} ({assignedResponder.type})</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { width: '100%', height: '100%' },
  loading: { flex: 1, backgroundColor: '#0a0b10', justifyContent: 'center', alignItems: 'center' },
  trackingOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: '#00f2ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  overlayTitle: { color: '#00f2ff', fontWeight: '900', letterSpacing: 1, fontSize: 10 },
  overlayText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 5 }
});