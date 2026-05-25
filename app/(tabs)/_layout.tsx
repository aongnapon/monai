import { Tabs } from 'expo-router';
import React from 'react';
import { LogBox, StyleSheet, Text, View } from 'react-native';

LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const TabEmoji = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <View style={{ opacity: focused ? 1 : 0.5 }}>
    <Text style={{ fontSize: 24 }}>{emoji}</Text>
  </View>
);

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
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabEmoji emoji="🏛️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Academy',
          tabBarIcon: ({ focused }) => (
            <TabEmoji emoji="🎓" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => (
            <TabEmoji emoji="👑" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabEmoji emoji="🏰" focused={focused} />
          ),
        }}
      />
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
