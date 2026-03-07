import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import OperationsMapScreen from './src/screens/OperationsMapScreen';
import ActiveMissionScreen from './src/screens/ActiveMissionScreen';
import StatusDashboardScreen from './src/screens/StatusDashboardScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import SupplyDeliveryScreen from './src/screens/SupplyDeliveryScreen';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import axios from 'axios';

// Replace with your Computer's Local IPv4 Address if testing on a physical device.
// 10.0.2.2 works for testing on an Android Emulator.
export const API_URL = 'http://192.168.145.236:5000/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [responderId, setResponderId] = useState(null);
  const [activeMissionId, setActiveMissionId] = useState(null);

  // Background Telemetry Simulation
  useEffect(() => {
    let interval;
    if (responderId) {
      interval = setInterval(async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          
          let location = await Location.getCurrentPositionAsync({});
          let batteryLevel = await Battery.getBatteryLevelAsync();
          if (batteryLevel === -1) batteryLevel = 1; // Fallback to 100% if emulator
          
          await axios.patch(`${API_URL}/responders/${responderId}/location`, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            batteryLevel: Math.round(batteryLevel * 100),
            timestamp: new Date().toISOString()
          });
        } catch (e) { console.log('Telemetry sync failed', e.message); }
      }, 180000); // 3 minutes
    }
    return () => clearInterval(interval);
  }, [responderId]);

  const renderScreen = () => {
    switch(currentScreen) {
      case 'Login':
        return <LoginScreen setResponderId={setResponderId} navigate={setCurrentScreen} />;
      case 'Map':
        return <OperationsMapScreen responderId={responderId} setActiveMissionId={setActiveMissionId} navigate={setCurrentScreen} />;
      case 'Mission':
        return <ActiveMissionScreen missionId={activeMissionId} navigate={setCurrentScreen} />;
      case 'Dashboard':
        return <StatusDashboardScreen responderId={responderId} navigate={setCurrentScreen} />;
      case 'Supply':
        return <SupplyDeliveryScreen responderId={responderId} navigate={setCurrentScreen} />;
      case 'Scanner':
        return <QRScannerScreen responderId={responderId} missionId={activeMissionId} navigate={setCurrentScreen} />;
      default:
        return <LoginScreen setResponderId={setResponderId} navigate={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      {renderScreen()}
      
      {/* Bottom Navigation Bar */}
      {responderId && currentScreen !== 'Login' && (
        <View style={styles.navBar}>
          <Text style={styles.navItem} onPress={() => setCurrentScreen('Map')}>Map</Text>
          <Text style={styles.navItem} onPress={() => setCurrentScreen('Dashboard')}>Status</Text>
          <Text style={styles.navItem} onPress={() => setCurrentScreen('Supply')}>Cargo</Text>
          {activeMissionId && <Text style={styles.navItem} onPress={() => setCurrentScreen('Mission')}>Mission</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1d24',
    padding: 20,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  navItem: { color: '#00f2ff', fontWeight: 'bold', fontSize: 16 }
});
