import { Tabs } from 'expo-router';
import React from 'react';
import { LogBox, Text, View, StyleSheet } from 'react-native';

// Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

/**
 * PRINCIPAL ARCHITECT NOTE: Luxury Emoji Navigation System
 * This layout implements a high-fidelity navigation tray using premium emoji assets.
 * We prioritize pure React Native primitives to ensure zero-latency rendering 
 * and absolute consistency across iOS and Android runtimes.
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
          height: 88,
          paddingBottom: 28,
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
      
      {/* 1. SCANNER: Institutional Analytics Core */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.emojiIcon, { opacity: focused ? 1 : 0.5 }]}>🏛️🏦</Text>
            </View>
          ),
        }}
      />

      {/* 2. LEARN: Intelligence Academy */}
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Academy',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.emojiIcon, { opacity: focused ? 1 : 0.5 }]}>🎓</Text>
            </View>
          ),
        }}
      />

      {/* 3. PORTFOLIO: Wealth Suite */}
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.emojiIcon, { opacity: focused ? 1 : 0.5 }]}>👑</Text>
            </View>
          ),
        }}
      />

      {/* 4. PROFILE: Institutional Identity */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.emojiIcon, { opacity: focused ? 1 : 0.5 }]}>🏰</Text>
            </View>
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
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    width: 48,
  },
  emojiIcon: {
    fontSize: 22,
    textAlign: 'center',
    includeFontPadding: false, // Essential for Android vertical centering
    textAlignVertical: 'center',
  },
});
