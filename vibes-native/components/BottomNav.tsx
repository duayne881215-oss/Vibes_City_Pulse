import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type NavTabKey = 'search' | 'dating' | 'map' | 'profile' | 'messages';

type BottomNavProps = {
  activeTab: NavTabKey;
  onPressSearch: () => void;
  onPressDating: () => void;
  onPressMap: () => void;
  onPressProfile: () => void;
  onPressMessages: () => void;
};

const NAV_ITEMS: Array<{
  key: NavTabKey;
  label: string;
  icon: string;
}> = [
  { key: 'search', label: 'Search', icon: '⌕' },
  { key: 'dating', label: 'Dating', icon: '♡' },
  { key: 'map', label: 'Map', icon: '◎' },
  { key: 'profile', label: 'Profile', icon: '◌' },
  { key: 'messages', label: 'Messages', icon: '▱' },
];

export function BottomNav({
  activeTab,
  onPressSearch,
  onPressDating,
  onPressMap,
  onPressProfile,
  onPressMessages,
}: BottomNavProps) {
  const getAction = (key: NavTabKey) => {
    if (key === 'search') return onPressSearch;
    if (key === 'dating') return onPressDating;
    if (key === 'map') return onPressMap;
    if (key === 'profile') return onPressProfile;
    return onPressMessages;
  };

  return (
    <View style={styles.bottomNavWrap}>
      {NAV_ITEMS.map((item) => {
        const active = activeTab === item.key;

        return (
          <Pressable
            key={item.key}
            style={[styles.navButton, active && styles.navButtonActive]}
            onPress={getAction(item.key)}
          >
            <View style={[styles.navButtonOrb, active && styles.navButtonOrbActive]}>
              <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
            </View>

            <Text style={[styles.navButtonText, active && styles.navButtonTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavWrap: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 10 : 6,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    paddingHorizontal: 9,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.2)',
    backgroundColor: 'rgba(4,10,22,0.9)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 404,
  },
  navButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  navButtonActive: {
    backgroundColor: 'rgba(30,58,138,0.22)',
  },
  navButtonOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(2,8,20,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  navButtonOrbActive: {
    borderColor: 'rgba(147,197,253,0.5)',
    backgroundColor: 'rgba(30,58,138,0.82)',
  },
  navIcon: {
    color: 'rgba(203,213,225,0.74)',
    fontSize: 16,
    lineHeight: 17,
    fontWeight: '800',
  },
  navIconActive: {
    color: '#ffffff',
  },
  navButtonText: {
    color: 'rgba(203,213,225,0.72)',
    fontSize: 10,
    fontWeight: '800',
  },
  navButtonTextActive: {
    color: '#ffffff',
  },
});