import { Tabs } from 'expo-router';
import React from 'react';
import { LogBox, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

/**
 * PREMIUM DARK TAB BAR
 * Crisp dark background with uniform vector icons.
 * Locked to screen floor with thin top border separator.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}>

      {/* 1. SCANNER: Institutional Analytics Core */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={26} color={color} />
          ),
        }}
      />

      {/* 2. LEARN: Intelligence Academy */}
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Academy',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" size={26} color={color} />
          ),
        }}
      />

      {/* 3. PORTFOLIO: Wealth Suite */}
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="video" size={26} color={color} />
          ),
        }}
      />

      {/* 4. PROFILE: Institutional Identity */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={26} color={color} />
          ),
        }}
      />

      {/* HIDDEN: Legacy redirect support */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1B1D2A',
    borderTopWidth: 1,
    borderTopColor: '#2A2D3E',
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
