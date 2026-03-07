import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import axios from 'axios';
import { API_URL } from '../../App';

export default function OperationsMapScreen({ responderId, setActiveMissionId, navigate }) {
  const [alerts, setAlerts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [safeZones, setSafeZones] = useState([]);

  // Default to Indore coordinates
  const INITAL_REGION = {
    latitude: 22.7196,
    longitude: 75.8577,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMapData = async () => {
    try {
      const sosRes = await axios.get(`${API_URL}/alerts`);
      setAlerts(sosRes.data.filter(a => a.status !== 'Resolved'));

      const clusterRes = await axios.get(`${API_URL}/admin/disaster-clusters`);
      setClusters(clusterRes.data);

      const zoneRes = await axios.get(`${API_URL}/safe-zones`);
      setSafeZones(zoneRes.data);
    } catch (e) { console.log('Map data fetch failed'); }
  };

  const acceptMission = async (sosId) => {
    try {
      // Mark responder as Busy
      await axios.patch(`${API_URL}/responders/${responderId}/status`, { status: 'Busy' });
      // Tell backend SOS is Dispatched
      await axios.put(`${API_URL}/sos/dispatch/${sosId}`, { responderId: responderId });
      
      setActiveMissionId(sosId);
      navigate('Mission');
    } catch (err) {
      Alert.alert("Dispatch Failed", "Could not synchronize with command center.");
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={INITAL_REGION}
        userInterfaceStyle="dark"
      >
        {/* Render Disaster Clusters as Red Zones */}
        {clusters.map((c, idx) => (
          <Circle
            key={`cluster-${idx}`}
            center={{ latitude: c.center[1], longitude: c.center[0] }}
            radius={200}
            fillColor="rgba(255, 0, 0, 0.3)"
            strokeColor="rgba(255, 0, 0, 0.8)"
            strokeWidth={2}
          />
        ))}

        {/* Render Safe Zones (Green) */}
        {safeZones.map((z, idx) => (
          z.location && z.location.coordinates && (
            <Marker
              key={`zone-${idx}`}
              coordinate={{ latitude: z.location.coordinates[1], longitude: z.location.coordinates[0] }}
              pinColor="green"
              title={z.name}
            />
          )
        ))}

        {/* Render SOS Alerts (Red/Orange/Yellow) */}
        {alerts.map((a, idx) => {
          let color = 'yellow';
          if (a.priority === 'Critical') color = 'red';
          if (a.priority === 'High') color = 'orange';

          return a.location && a.location.coordinates ? (
            <Marker
              key={`sos-${idx}`}
              coordinate={{ latitude: a.location.coordinates[1], longitude: a.location.coordinates[0] }}
              pinColor={color}
              onPress={() => {
                Alert.alert(
                  `${a.priority.toUpperCase()} PRIORITY ALERT`,
                  `${a.category} incident reported.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "ACCEPT MISSION", onPress: () => acceptMission(a._id) }
                  ]
                );
              }}
            />
          ) : null;
        })}
      </MapView>

      {/* Overlay UI */}
      <View style={styles.overlay}>
        <Text style={styles.title}>TACTICAL MAP</Text>
        <Text style={styles.sub}>Tap an alert marker to accept a mission.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  overlay: { 
    position: 'absolute', 
    top: 40, 
    left: 20, 
    right: 20, 
    backgroundColor: 'rgba(20,22,28,0.9)', 
    padding: 15, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  title: { color: '#00f2ff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  sub: { color: '#aaa', fontSize: 11, marginTop: 4 }
});
