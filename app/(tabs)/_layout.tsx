import { Tabs } from 'expo-router';
import React from 'react';
import { LogBox, StyleSheet, Text, View } from 'react-native';

LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

/**
 * FIXED EMOJI ICON COMPONENT
 * Wraps the native system emoji inside an absolute floating layout layer.
 * This completely breaks the parent tab bar's vector tint/shading system on Android.
 */
const RawEmojiIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <View style={styles.iconContainer}>
    {/* Hidden placeholder vector icon to satisfy the tab bar structure safely */}
    <View style={[styles.shadingBypassContainer, { opacity: focused ? 1.0 : 0.4 }]}>
      <Text style={styles.emojiGlyph} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
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
            <RawEmojiIcon emoji="🏛️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Academy',
          tabBarIcon: ({ focused }) => (
            <RawEmojiIcon emoji="🎓" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => (
            <RawEmojiIcon emoji="👑" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <RawEmojiIcon emoji="🏰" focused={focused} />
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
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadingBypassContainer: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: -10,
    bottom: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiGlyph: {
    fontSize: 24,
    includeFontPadding: false,
    textAlign: 'center',
  },
});