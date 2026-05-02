

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type DailyPulseData = {
  title: string;
  message: string;
  items: string[];
};

type DailyPulseCardProps = {
  data: DailyPulseData | null;
  loading?: boolean;
  onRefresh?: () => void;
};

export function DailyPulseCard({ data, loading = false, onRefresh }: DailyPulseCardProps) {
  const items = data?.items?.length
    ? data.items
    : ['The city is waking up. Vibes will learn what you like as you use the app.'];

  return (
    <View style={styles.card}>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>VIBES AI</Text>
          <Text style={styles.title}>{data?.title || 'Daily Pulse'}</Text>
        </View>

        <View style={styles.aiBadgeWrap}>
          <View style={styles.aiBadgeShadow} />
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.message}>{data?.message || 'What is moving around you right now.'}</Text>

      <View style={styles.itemsWrap}>
        {items.slice(0, 3).map((item, index) => (
          <View key={`${item}-${index}`} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Personalized from your live signals</Text>

        {onRefresh ? (
          <Pressable style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]} onPress={onRefresh}>
            {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.refreshText}>Refresh</Text>}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(7,13,26,0.88)',
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginTop: 14,
    marginBottom: 18,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  cardBorderOverlay: { display: 'none' },
  glowGreen: { display: 'none' },
  glowRed: { display: 'none' },
  glowBlue: { display: 'none' },
  glowWhite: { display: 'none' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    zIndex: 3,
  },
  kicker: {
    color: '#6fff94',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3.2,
    marginBottom: 2,
    textShadowColor: 'rgba(110,231,183,0.38)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(59,130,246,0.18)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
    marginBottom: 1,
  },
  aiBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  aiBadgeShadow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(59,130,246,0.18)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 2,
  },
  aiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(110,231,183,0.55)',
    backgroundColor: 'rgba(20,83,45,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 2,
    shadowColor: '#fff',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  aiBadgeText: {
    color: '#6fff94',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2.2,
    textShadowColor: '#fff',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
    textTransform: 'uppercase',
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(59,130,246,0.13)',
    marginVertical: 10,
    borderRadius: 2,
    zIndex: 2,
  },
  message: {
    color: 'rgba(226,232,240,0.96)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
    textShadowColor: 'rgba(110,231,183,0.10)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
    zIndex: 3,
  },
  itemsWrap: {
    marginTop: 14,
    gap: 13,
    zIndex: 3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    zIndex: 3,
  },
  itemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginTop: 6,
    shadowColor: '#6fff94',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  itemText: {
    flex: 1,
    color: 'rgba(241,245,249,0.98)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
    textShadowColor: 'rgba(59,130,246,0.10)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 0 },
  },
  footerRow: {
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(110,231,183,0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  footerText: {
    flex: 1,
    color: 'rgba(148,163,184,0.92)',
    fontSize: 12,
    fontWeight: '800',
    paddingRight: 10,
    textShadowColor: 'rgba(110,231,183,0.10)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  refreshButton: {
    minWidth: 78,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(147,197,253,0.28)',
    backgroundColor: 'rgba(30,64,175,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  refreshText: {
    color: '#eff6ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textShadowColor: '#fff',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 0 },
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});

