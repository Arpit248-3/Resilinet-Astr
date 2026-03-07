import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated'; 

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ 
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}>
        {/* Main Tab System */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Auth Screen */}
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        
        {/* Guide Detail as a Modal */}
        <Stack.Screen 
          name="guide-detail" 
          options={{ 
            presentation: 'modal', 
            headerShown: true,
            title: "Emergency Instructions",
            animation: 'slide_from_bottom'
          }} 
        />

        {/* Info/Generic Modal */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'transparentModal', 
            title: 'Information' 
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}