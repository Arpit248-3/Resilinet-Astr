import 'react-native-reanimated'; 
import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00f2ff',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#0a0b10', borderTopColor: '#222' },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen name="index" options={{ title: 'SOS', tabBarIcon: ({ color }) => <Ionicons name="alert-circle-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'AI SOS', tabBarIcon: ({ color }) => <Ionicons name="hardware-chip-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'MAP', tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="rescue-status" options={{ title: 'RESCUE', tabBarIcon: ({ color }) => <Ionicons name="pulse-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="nearby-rescuers" options={{ title: 'NEARBY', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="guide" options={{ title: 'GUIDE', tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'SETTINGS', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="scanner" options={{ href: null, title: 'SCAN RESCUER' }} />
    </Tabs>
  );
}