import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Switch, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps'; // Circle is now used below
import * as Location from 'expo-location';

import { API_URL } from '@/constants/api';

// IMPORTANT: Ensure you have created frontend/data/safeZones.json
const SAFE_ZONES = require('../data/safeZones.json'); 

export default function StatusMap() {
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [victimLocations, setVictimLocations] = useState([]);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setUserLoc({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (isVolunteer) {
      // Connects to your backend IP
      fetch(`${API_URL}/alerts`)
        .then(res => res.json())
        .then(data => setVictimLocations(data))
        .catch(() => console.log("Backend Offline"));
    }
  }, [isVolunteer]);

  if (!userLoc) return <View style={styles.loading}><Text>Syncing GPS...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Volunteer Mode</Text>
        <Switch 
          value={isVolunteer} 
          onValueChange={setIsVolunteer} 
          trackColor={{ true: "#e63946" }} 
        />
      </View>

      <MapView style={styles.map} initialRegion={userLoc}>
        {/* User Location Marker */}
        <Marker coordinate={userLoc} title="You Are Here" pinColor="blue" />
        
        {/* Panic Radius - This uses the 'Circle' import to fix your error */}
        <Circle 
          center={userLoc} 
          radius={2000} 
          fillColor="rgba(230, 57, 70, 0.2)" 
          strokeColor="#e63946" 
        />

        {/* Safe Zones from JSON */}
        {SAFE_ZONES.map(zone => (
          <Marker 
            key={zone.id} 
            coordinate={{ latitude: zone.latitude, longitude: zone.longitude }} 
            title={zone.name} 
            pinColor="green" 
          />
        ))}

        {/* Victim Locations (Only visible in Volunteer Mode) */}
        {isVolunteer && victimLocations.map((loc) => (
          <Marker 
            key={loc._id}
            coordinate={{ 
              latitude: loc.location.coordinates[1], 
              longitude: loc.location.coordinates[0] 
            }}
            title={loc.category || "Emergency"}
            pinColor="orange"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1 }, 
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: '#fff', 
    alignItems: 'center',
    zIndex: 1 
  },
  headerText: { fontWeight: 'bold', color: '#e63946' },
  map: { flex: 1 } 
});