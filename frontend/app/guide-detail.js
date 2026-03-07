import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function GuideDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract data from params
  const title = params.title || "Information";
  const content = params.content || "No description provided.";
  
  // Safety check: parse steps string back into an array
  let steps = [];
  try {
    if (params.steps) {
      steps = typeof params.steps === 'string' ? JSON.parse(params.steps) : params.steps;
    }
  } catch (error) {
    console.error("Failed to parse steps:", error);
    steps = [];
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#e63946" />
        <Text style={styles.backText}>BACK TO LIST</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{title.toUpperCase()}</Text>

      <View style={styles.contentBox}>
        <Text style={styles.description}>{content}</Text>
        
        <Text style={styles.sectionHeader}>STEP-BY-STEP INSTRUCTIONS:</Text>
        
        {Array.isArray(steps) && steps.length > 0 ? (
          steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.numText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.stepText}>No detailed steps available for this guide.</Text>
        )}
      </View>
      
      {/* Bottom Padding */}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    marginTop: 45 // Increased for notch phones
  },
  backText: { color: '#e63946', marginLeft: 10, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  contentBox: { 
    backgroundColor: '#111', 
    padding: 20, 
    borderRadius: 15, 
    borderLeftWidth: 4, 
    borderLeftColor: '#e63946' 
  },
  description: { color: '#ccc', fontSize: 16, marginBottom: 20, lineHeight: 22 },
  sectionHeader: { 
    color: '#e63946', 
    fontWeight: 'bold', 
    marginBottom: 15, 
    marginTop: 10,
    letterSpacing: 1 
  },
  stepRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-start' },
  stepNumber: { 
    backgroundColor: '#e63946', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    marginTop: 2
  },
  numText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stepText: { color: '#fff', flex: 1, fontSize: 15, lineHeight: 20 }
});