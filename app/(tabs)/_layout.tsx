import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogBox } from 'react-native';

// Task 1: Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

/**
 * ARCHITECT NOTE: Institutional Tab Navigation
 * We use a minimalist design with high-contrast active states.
 * Reordered to follow the core user loop: Scan -> History -> Learn -> Portfolio -> Profile.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0F172A', // Institutional Dark Blue
        tabBarInactiveTintColor: '#94A3B8', // Soft Slate
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          height: 84,
          paddingBottom: 24,
          paddingTop: 12,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -4,
        },
        headerShown: false, // Unified header management in individual screens
      }}>
      
      {/* 1. SCANNER: The primary utility */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'scan' : 'scan-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 2. HISTORY: Intelligence logs */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 3. LEARN: Intelligence Academy */}
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Academy',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'school' : 'school-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 4. PORTFOLIO: Institutional Wealth Suite */}
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFILE: User Settings */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* HIDDEN: Legacy index/learn redirect */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Removed from active navigation
        }}
      />
    </Tabs>
  );
}
