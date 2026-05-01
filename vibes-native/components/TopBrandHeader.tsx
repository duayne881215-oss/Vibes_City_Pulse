import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type TopBrandHeaderProps = {
  compact?: boolean;
  showStory?: boolean;
  profileVisible: boolean;
  profileAvatarUrl?: string | null;
  profileInitials: string;
  onPressAvatar: () => void;
  onPressStory: () => void;
  onPressLiveStatus: () => void;
};

const TEXT = '#ffffff';
const GREEN = '#22c55e';
const RED = '#ff4058';
const BORDER = 'rgba(147,197,253,0.22)';
const CARD_2 = 'rgba(10,18,34,0.82)';

export function TopBrandHeader({
  compact = false,
  showStory = true,
  profileVisible,
  profileAvatarUrl,
  profileInitials,
  onPressAvatar,
  onPressStory,
  onPressLiveStatus,
}: TopBrandHeaderProps) {
  const liveLabel = profileVisible ? 'LIVE NOW' : 'OFFLINE';

  return (
    <View style={[styles.topBrandWrap, compact && styles.topBrandWrapCompact]}>
      <View style={styles.topBrandLeft}>
        <Text style={styles.topBrandKicker}>VIBES</Text>

        <View style={styles.topBrandTitleRow}>
          <Text style={[styles.topBrandCity, compact && styles.topBrandCityCompact]}>City</Text>
          <Text style={[styles.topBrandPulse, compact && styles.topBrandPulseCompact]}>Pulse</Text>
        </View>

        <Pressable
          style={[styles.topOnlineChip, !profileVisible && styles.topOnlineChipOffline]}
          onPress={onPressLiveStatus}
        >
          <View style={[styles.topOnlineDot, !profileVisible && styles.topOnlineDotOffline]} />
          <Text style={styles.topOnlineText}>{liveLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.topBrandRight}>
        <Pressable style={styles.topAvatarGlow} onPress={onPressAvatar}>
          <View style={styles.topAvatarCircle}>
            {profileAvatarUrl ? (
              <Image source={{ uri: profileAvatarUrl }} style={styles.topAvatarImage} />
            ) : (
              <Text style={styles.topAvatarInitials}>{profileInitials}</Text>
            )}
          </View>
        </Pressable>

        {showStory ? (
          <Pressable style={({ pressed }) => [styles.topStoryButton, pressed && styles.buttonPressed]} onPress={onPressStory}>
            <Text style={styles.topStoryButtonText}>+ STORY</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.82,
  },
  topBrandWrap: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBrandWrapCompact: {
    marginTop: 2,
    marginBottom: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  topBrandLeft: {
    flex: 1,
    paddingRight: 10,
  },
  topBrandKicker: {
    color: 'rgba(110,231,183,0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3.6,
    marginBottom: 2,
  },
  topBrandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topBrandCity: {
    color: TEXT,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  topBrandCityCompact: {
    fontSize: 21,
    lineHeight: 24,
  },
  topBrandPulse: {
    color: RED,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  topBrandPulseCompact: {
    fontSize: 21,
    lineHeight: 24,
  },
  topOnlineChip: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.38)',
    backgroundColor: 'rgba(20,83,45,0.26)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topOnlineChipOffline: {
    borderColor: 'rgba(148,163,184,0.38)',
    backgroundColor: 'rgba(51,65,85,0.36)',
  },
  topOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  topOnlineDotOffline: {
    backgroundColor: 'rgba(148,163,184,0.88)',
  },
  topOnlineText: {
    color: 'rgba(187,247,208,0.95)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  topBrandRight: {
    alignItems: 'center',
    gap: 7,
  },
  topAvatarGlow: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.45)',
  },
  topAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(3,9,20,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.38)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAvatarImage: {
    width: '100%',
    height: '100%',
  },
  topAvatarInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  topStoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.26)',
    backgroundColor: 'rgba(15,23,42,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topStoryButtonText: {
    color: 'rgba(219,234,254,0.95)',
    fontSize: 10,
    fontWeight: '800',
  },
});
