import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './src/config/api';

import SOSScreen from './src/screens/SOSScreen';
import RescuersMapScreen from './src/screens/RescuersMapScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import RescueStatusScreen from './src/screens/RescueStatusScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  // Background location tracking — updates backend every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const survivorId = await AsyncStorage.getItem('survivorId');
        if (!survivorId) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({});
        await axios.post(`${API_URL}/location/update`, {
          userId: survivorId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          type: 'survivor',
        });
      } catch (e) {
        console.log('Survivor telemetry failed:', e.message);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0b10" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === 'SOS') iconName = 'warning';
              else if (route.name === 'Map') iconName = 'map';
              else if (route.name === 'Scanner') iconName = 'qr-code';
              else if (route.name === 'Status') iconName = 'pulse';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#00f2ff',
            tabBarInactiveTintColor: '#555',
            tabBarStyle: {
              backgroundColor: '#111',
              borderTopColor: '#333',
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: 0.5,
            },
            headerStyle: { backgroundColor: '#0a0b10', elevation: 0, shadowOpacity: 0 },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold', letterSpacing: 1 },
            headerShown: false,
          })}
        >
          <Tab.Screen name="SOS" component={SOSScreen} options={{ tabBarLabel: 'SOS' }} />
          <Tab.Screen name="Map" component={RescuersMapScreen} options={{ tabBarLabel: 'Rescuers' }} />
          <Tab.Screen name="Scanner" component={QRScannerScreen} options={{ tabBarLabel: 'QR Scan' }} />
          <Tab.Screen name="Status" component={RescueStatusScreen} options={{ tabBarLabel: 'Status' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
