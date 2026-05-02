import { BottomNav } from '@/components/BottomNav';
import { DailyPulseCard } from '@/components/DailyPulseCard';
import { TopBrandHeader } from '@/components/TopBrandHeader';
import { supabase } from '@/lib/supabase';
import { buildDailyPulse, learnFromProfileView, learnFromStory, learnFromVenueClick, trackAiSignal } from '@/lib/vibesAiBrain';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type NavTabKey = 'search' | 'dating' | 'map' | 'profile' | 'messages';
type ScreenKey = 'home' | 'search' | 'dating' | 'map' | 'profile' | 'messages' | 'chat';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  birth_date?: string | null;
  looking_for?: string | null;
  updated_at?: string | null;
};

type ConversationListItem = {
  id: string;
  name: string;
  initials: string;
  message: string;
  time: string;
  unread?: boolean;
  status?: 'green' | 'blue';
};

const BG = '#020617';
const TEXT = '#ffffff';
const MUTED = 'rgba(203,213,225,0.72)';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const RED = '#ff4058';
const BORDER = 'rgba(147,197,253,0.22)';
const CARD = 'rgba(8,13,25,0.86)';
const CARD_2 = 'rgba(10,18,34,0.82)';
const CONTENT_BOTTOM_PAD = 118;

const PROFILE_FALLBACK: ProfileRow = {
  id: 'local-profile',
  display_name: 'Duayne Forte',
  avatar_url: null,
  city: 'Miami Beach',
  bio: 'Open to new vibes.',
  birth_date: null,
  looking_for: 'Vibes',
  updated_at: null,
};

const demoProfiles: ProfileRow[] = [
  {
    id: 'camila',
    display_name: 'Camila',
    avatar_url: null,
    city: 'Miami Beach',
    bio: 'Sunset walks, matcha, and spontaneous plans.',
    birth_date: '1998-04-12',
    looking_for: 'Dating',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sofia',
    display_name: 'Sofia',
    avatar_url: null,
    city: 'Brickell',
    bio: 'Coffee dates and city lights. Keeping it real.',
    birth_date: '1997-09-05',
    looking_for: 'Friends',
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'nina',
    display_name: 'Nina',
    avatar_url: null,
    city: 'Wynwood',
    bio: 'Art nights, music, and good conversations.',
    birth_date: '2000-01-21',
    looking_for: 'Vibes',
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

const demoConversations: ConversationListItem[] = [
  {
    id: 'demo-1',
    name: 'Camila',
    initials: 'CA',
    message: 'See you around the city.',
    time: 'Now',
    unread: true,
    status: 'green',
  },
  {
    id: 'demo-2',
    name: 'Sofia',
    initials: 'SO',
    message: 'That place has good energy.',
    time: '8:22',
    unread: false,
    status: 'blue',
  },
];

const mapPoints = [
  { id: 'you', kind: 'you', top: '52%', left: '48%', label: 'You' },
  { id: 'active-1', kind: 'active', top: '30%', left: '62%', label: 'Live' },
  { id: 'energy-1', kind: 'energy', top: '68%', left: '30%', label: 'Hot' },
  { id: 'friend-1', kind: 'friend', top: '42%', left: '22%', label: 'Friend' },
  { id: 'active-2', kind: 'active', top: '74%', left: '70%', label: '' },
] as const;

const toSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const emailName = (email: string | null): string => {
  const safe = String(email || '').trim();

  if (!safe || !safe.includes('@')) return 'Vibe';

  return safe
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const computeAge = (birthDate?: string | null): string => {
  const safe = String(birthDate || '').trim();

  if (!safe) return '';

  const parsed = new Date(safe);

  if (Number.isNaN(parsed.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age > 0 ? String(age) : '';
};

export default function IndexScreen() {
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'login' | 'signup' | 'phone'>('login');

  const [activeScreen, setActiveScreen] = React.useState<ScreenKey>('home');
  const [profile, setProfile] = React.useState<ProfileRow>(PROFILE_FALLBACK);
  const [selectedProfile, setSelectedProfile] = React.useState<ProfileRow | null>(null);
  const [viewingOwnProfile, setViewingOwnProfile] = React.useState(true);
  const [activeConversation, setActiveConversation] = React.useState<ConversationListItem | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = React.useState(false);
  const [isVisibilitySheetOpen, setIsVisibilitySheetOpen] = React.useState(false);
  const [profileVisible, setProfileVisible] = React.useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = React.useState(true);
  const [storyCaption, setStoryCaption] = React.useState('');

  const [dailyPulseData, setDailyPulseData] = React.useState<{
    title: string;
    message: string;
    items: string[];
  } | null>(null);
  const [dailyPulseLoading, setDailyPulseLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!supabase) {
        if (!mounted) return;
        setSessionUserId('local-demo-user');
        setAuthLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        const user = data?.session?.user ?? null;
        setSessionUserId(user?.id ?? null);

        if (user?.id) {
          setProfile({
            ...PROFILE_FALLBACK,
            id: user.id,
            display_name: emailName(user.email ?? null),
          });
        }
      } catch {
        if (!mounted) return;
        setSessionUserId(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    boot();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const user = nextSession?.user ?? null;
      setSessionUserId(user?.id ?? null);

      if (user?.id) {
        setProfile({
          ...PROFILE_FALLBACK,
          id: user.id,
          display_name: emailName(user.email ?? null),
        });
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = !!sessionUserId;

  const profileDisplayName = toSafeText((selectedProfile ?? profile).display_name) || 'Vibe';
  const profileAvatarUrl = toSafeText((selectedProfile ?? profile).avatar_url);
  const profileCity = toSafeText((selectedProfile ?? profile).city) || 'Miami Beach';
  const profileBio = toSafeText((selectedProfile ?? profile).bio) || 'Open to new vibes.';
  const profileLookingFor = toSafeText((selectedProfile ?? profile).looking_for) || 'Vibes';
  const profileAge = computeAge((selectedProfile ?? profile).birth_date) || '37';

  const profileInitials =
    profileDisplayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'VB';

  React.useEffect(() => {
    if (!sessionUserId) return;

    trackAiSignal({
      userId: sessionUserId,
      signalType: 'app_opened',
      signalValue: {
        opened_at: new Date().toISOString(),
        screen: activeScreen,
      },
      signalWeight: 1,
      sourceScreen: 'app',
    }).catch(() => {});
  }, [sessionUserId]);

  const loadDailyPulse = React.useCallback(() => {
    if (!sessionUserId) return;

    trackAiSignal({
      userId: sessionUserId,
      signalType: 'recommendation_clicked',
      signalValue: {
        source: 'daily_pulse_refresh',
        clicked_at: new Date().toISOString(),
      },
      signalWeight: 1.5,
      sourceScreen: 'home',
    }).catch(() => {});

    setDailyPulseLoading(true);

    buildDailyPulse(sessionUserId)
      .then((nextPulse) => {
        setDailyPulseData(nextPulse);
      })
      .catch(() => {})
      .finally(() => {
        setDailyPulseLoading(false);
      });
  }, [sessionUserId]);

  React.useEffect(() => {
    if (!sessionUserId) return;
    loadDailyPulse();
  }, [sessionUserId, loadDailyPulse]);

  React.useEffect(() => {
    if (!sessionUserId || activeScreen !== 'map') return;

    trackAiSignal({
      userId: sessionUserId,
      signalType: 'map_hotspot_seen',
      signalValue: {
        city: profileCity || 'Miami Beach',
        hotspot_score: 92,
        seen_at: new Date().toISOString(),
      },
      signalWeight: 1.25,
      sourceScreen: 'map',
    }).catch(() => {});
  }, [sessionUserId, activeScreen, profileCity]);

  React.useEffect(() => {
    if (!sessionUserId || activeScreen !== 'chat') return;

    trackAiSignal({
      userId: sessionUserId,
      signalType: 'message_started',
      signalValue: {
        conversation_id: activeConversation?.id ?? null,
        conversation_name: activeConversation?.name ?? null,
        opened_at: new Date().toISOString(),
      },
      signalWeight: 1.5,
      sourceScreen: 'chat',
    }).catch(() => {});
  }, [sessionUserId, activeScreen, activeConversation]);

  React.useEffect(() => {
    if (!sessionUserId || activeScreen !== 'home') return;

    trackAiSignal({
      userId: sessionUserId,
      signalType: 'daily_pulse_seen',
      signalValue: {
        seen_at: new Date().toISOString(),
        has_daily_pulse: !!dailyPulseData,
      },
      signalWeight: 1.2,
      sourceScreen: 'home',
    }).catch(() => {});
  }, [sessionUserId, activeScreen, dailyPulseData]);

  const handleLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);

    try {
      if (!supabase) {
        setSessionUserId('local-demo-user');
        setActiveScreen('home');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setPassword('');
      setActiveScreen('home');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to login.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignup = async () => {
    setAuthBusy(true);
    setAuthError(null);

    try {
      if (!supabase) {
        setSessionUserId('local-demo-user');
        setProfile({
          ...PROFILE_FALLBACK,
          display_name: fullName.trim() || 'Vibe',
        });
        setActiveScreen('home');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      const userId = data?.session?.user?.id ?? data?.user?.id ?? null;

      if (userId) {
        await supabase.from('profiles').upsert(
          {
            id: userId,
            display_name: fullName.trim() || emailName(email),
            city: 'Miami Beach',
            bio: 'Open to new vibes.',
            looking_for: 'Vibes',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
      }

      setPassword('');
      setFullName('');
      setAuthMode('login');
      setActiveScreen('home');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }

      setSessionUserId(null);
      setActiveScreen('home');
      setProfile(PROFILE_FALLBACK);
    } finally {
      setAuthBusy(false);
    }
  };

  const openOwnProfile = () => {
    setSelectedProfile(null);
    setViewingOwnProfile(true);
    setActiveScreen('profile');
  };

  const openExternalProfile = (nextProfile: ProfileRow) => {
    const previousScreen = activeScreen || 'unknown';

    setSelectedProfile(nextProfile);
    setViewingOwnProfile(false);
    setActiveScreen('profile');

    if (sessionUserId && nextProfile?.id) {
      learnFromProfileView({
        userId: sessionUserId,
        viewedProfileId: nextProfile.id,
        sourceScreen: previousScreen,
        gender: null,
        city: nextProfile.city ?? null,
        lookingFor: nextProfile.looking_for ?? null,
      }).catch(() => {});
    }
  };


  const renderAuth = () => {
    const isSignup = authMode === 'signup';
    const isPhone = authMode === 'phone';

    const handlePrimaryAuthPress = () => {
      if (isPhone) {
        setAuthError('Phone sign in must be configured in Supabase Auth.');
        return;
      }

      if (isSignup) {
        handleSignup();
        return;
      }

      handleLogin();
    };

    return (
      <View style={styles.authPremiumRoot}>
        <ImageBackground
          source={require('@/assets/images/auth-city-bg.png')}
          style={styles.authCityBackgroundImage}
          imageStyle={styles.authCityBackgroundImageStyle}
          resizeMode="cover"
        >
          <View style={styles.authImageDarkOverlay} />
        </ImageBackground>

        <View style={styles.authBrandPremiumWrap}>
          <Text style={styles.authVibesText}>VIBES</Text>

          <View style={styles.authCityPulseLogoWrap}>
            <View style={styles.authCityPulseRow}>
              <Text style={styles.authCityText}>City</Text>
              <Text style={styles.authPulseText}>Pulse</Text>
            </View>
          </View>
        </View>

        <View style={styles.authPremiumCard}>
          <View style={styles.authPremiumCardGlowLeft} />
          <View style={styles.authPremiumCardGlowRight} />

          {isSignup ? (
            <View style={styles.authInputWrap}>
              <Text style={styles.authInputIcon}>✦</Text>
              <TextInput
                autoCapitalize="words"
                placeholder="Name"
                placeholderTextColor="rgba(178,188,214,0.68)"
                value={fullName}
                onChangeText={setFullName}
                editable={!authBusy}
                style={styles.authInputPremium}
              />
            </View>
          ) : null}

          {isPhone ? (
            <View style={styles.authInputWrap}>
              <Text style={styles.authInputIcon}>☎</Text>
              <TextInput
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor="rgba(178,188,214,0.68)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!authBusy}
                style={styles.authInputPremium}
              />
            </View>
          ) : (
            <>
              <View style={styles.authInputWrap}>
                <Text style={styles.authInputIcon}>✉</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="rgba(178,188,214,0.68)"
                  value={email}
                  onChangeText={setEmail}
                  editable={!authBusy}
                  style={styles.authInputPremium}
                />
              </View>

              <View style={styles.authInputWrap}>
                <Text style={styles.authInputIcon}>⌁</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Password"
                  placeholderTextColor="rgba(178,188,214,0.68)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!authBusy}
                  style={styles.authInputPremium}
                />

                <Pressable style={styles.authPasswordShowButton} onPress={() => setShowPassword((prev) => !prev)}>
                  <Text style={styles.authPasswordShowText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.authPrimaryPremiumButton,
              pressed && styles.buttonPressed,
              authBusy && styles.disabledButton,
            ]}
            onPress={handlePrimaryAuthPress}
            disabled={
              authBusy ||
              (isPhone ? !phoneNumber.trim() : !email.trim() || password.length < 6) ||
              (isSignup && !fullName.trim())
            }
          >
            {authBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.authPrimaryPremiumText}>
                  {isSignup ? 'Create My Account' : isPhone ? 'Continue with Phone' : 'Log In'}
                </Text>
                <Text style={styles.authPrimaryArrow}>→</Text>
              </>
            )}
          </Pressable>

          {isSignup || isPhone ? (
            <Pressable
              style={({ pressed }) => [styles.authSecondaryPremiumButton, pressed && styles.buttonPressed]}
              onPress={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
            >
              <Text style={styles.authSecondaryPremiumText}>Back to Login</Text>
              <Text style={styles.authSecondaryIcon}>↩</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.authSecondaryPremiumButton, pressed && styles.buttonPressed]}
              onPress={() => {
                setAuthMode('signup');
                setAuthError(null);
              }}
            >
              <Text style={styles.authSecondaryPremiumText}>Create Account</Text>
              <Text style={styles.authSecondaryIcon}>＋</Text>
            </Pressable>
          )}

          <View style={styles.authDividerRow}>
            <View style={styles.authDividerLine} />
            <Text style={styles.authDividerText}>OR CONTINUE WITH</Text>
            <View style={styles.authDividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.authProviderButton, pressed && styles.buttonPressed]}
            onPress={() => setAuthError('Apple sign in must be configured in Supabase Auth.')}
          >
            <Text style={styles.authProviderIcon}></Text>
            <Text style={styles.authProviderText}>Continue with Apple</Text>
            <Text style={styles.authProviderArrow}>›</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.authProviderButton, pressed && styles.buttonPressed]}
            onPress={() => {
              setAuthMode('phone');
              setAuthError(null);
            }}
          >
            <Text style={[styles.authProviderIcon, styles.authProviderPhoneIcon]}>☎</Text>
            <Text style={styles.authProviderText}>Continue with Phone</Text>
            <Text style={styles.authProviderArrow}>›</Text>
          </Pressable>

          {authError ? <Text style={styles.authErrorPremiumText}>{authError}</Text> : null}
        </View>

        <View style={styles.authLegalWrap}>
          <Text style={styles.authLegalText}>By continuing, you agree to our</Text>
          <Text style={styles.authLegalLinks}>Terms of Service, Privacy Policy, and Cookies Policy.</Text>
        </View>
      </View>
    );
  };

const renderTopBrandHeader = (options?: { compact?: boolean; showStory?: boolean }) => {
  return (
    <TopBrandHeader
      compact={!!options?.compact}
      showStory={options?.showStory ?? true}
      profileVisible={profileVisible}
      profileAvatarUrl={profileAvatarUrl}
      profileInitials={profileInitials}
      onPressAvatar={openOwnProfile}
      onPressStory={() => setIsStoryCreatorOpen(true)}
      onPressLiveStatus={() => setIsVisibilitySheetOpen(true)}
    />
  );
};

const renderHome = () => {
  return (
    <View style={styles.homeRoot}>
      {renderTopBrandHeader()}

      <View style={styles.homeHeroCard}>

        <View style={styles.homeHeroTopRow}>
          <View style={styles.homeHeroLivePill}>
            <View style={styles.homeHeroLiveDot} />
            <Text style={styles.homeHeroLiveText}>CITY IS LIVE</Text>
          </View>

          <View style={styles.homeHeroAiPill}>
            <Text style={styles.homeHeroAiText}>AI ON</Text>
          </View>
        </View>

        <Text style={styles.homeHeroTitle}>Your city is moving.</Text>
        <Text style={styles.homeHeroSubtitle}>
          Discover nearby people, live energy and moments around Miami Beach.
        </Text>

        <View style={styles.homeHeroStatsRow}>
          <View style={styles.homeHeroStatBox}>
            <Text style={styles.homeHeroStatValue}>7</Text>
            <Text style={styles.homeHeroStatLabel}>Live vibes</Text>
          </View>

          <View style={styles.homeHeroStatBox}>
            <Text style={styles.homeHeroStatValue}>3</Text>
            <Text style={styles.homeHeroStatLabel}>Nearby</Text>
          </View>

          <View style={styles.homeHeroStatBox}>
            <Text style={styles.homeHeroStatValue}>92</Text>
            <Text style={styles.homeHeroStatLabel}>Energy</Text>
          </View>
        </View>
      </View>

      <DailyPulseCard data={dailyPulseData} loading={dailyPulseLoading} onRefresh={loadDailyPulse} />

      <View style={styles.aiInsightCard}>
        <View style={styles.aiInsightDot} />
        <View style={styles.aiInsightTextWrap}>
          <Text style={styles.aiInsightKicker}>AI INSIGHT</Text>
          <Text style={styles.aiInsightTitle}>Your city rhythm is being learned.</Text>
          <Text style={styles.aiInsightSubtitle}>
            Vibes AI uses your live signals to personalize people, places and moments around you.
          </Text>
        </View>
      </View>

      <View style={styles.homeQuickActionsGrid}>
        <Pressable
          style={({ pressed }) => [styles.homeQuickActionCard, pressed && styles.buttonPressed]}
          onPress={() => setActiveScreen('map')}
        >
          <Text style={styles.homeQuickActionIcon}>◎</Text>
          <Text style={styles.homeQuickActionTitle}>Open Map</Text>
          <Text style={styles.homeQuickActionSub}>See live energy</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.homeQuickActionCard, pressed && styles.buttonPressed]}
          onPress={() => setActiveScreen('dating')}
        >
          <Text style={styles.homeQuickActionIcon}>♡</Text>
          <Text style={styles.homeQuickActionTitle}>Dating</Text>
          <Text style={styles.homeQuickActionSub}>Meet nearby</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.homeQuickActionCard, pressed && styles.buttonPressed]}
          onPress={() => setActiveScreen('search')}
        >
          <Text style={styles.homeQuickActionIcon}>⌕</Text>
          <Text style={styles.homeQuickActionTitle}>Search</Text>
          <Text style={styles.homeQuickActionSub}>Find vibes</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.homeQuickActionCard, pressed && styles.buttonPressed]}
          onPress={() => setActiveScreen('messages')}
        >
          <Text style={styles.homeQuickActionIcon}>▱</Text>
          <Text style={styles.homeQuickActionTitle}>Messages</Text>
          <Text style={styles.homeQuickActionSub}>Open chats</Text>
        </Pressable>
      </View>
    </View>
  );
};

  const renderMap = () => {
    const handleMapPointPress = (point: (typeof mapPoints)[number]) => {
      if (!sessionUserId || point.kind === 'you') return;

      learnFromVenueClick({
        userId: sessionUserId,
        venueId: point.id,
        venueName: point.label || point.id || 'Unknown venue',
        venueType: point.kind || null,
        dominantVibe: point.kind === 'energy' ? 'hotspot' : point.kind || null,
        sourceScreen: 'map',
      }).catch(() => {});
    };

    return (
      <View>
        {renderTopBrandHeader({ compact: true, showStory: true })}

        <View style={styles.screenHeaderWrap}>
          <View style={styles.mapChip}>
            <Text style={styles.mapChipText}>MIAMI BEACH</Text>
          </View>
          <Text style={styles.screenTitle}>Live Map</Text>
          <Text style={styles.screenSubtitle}>Energy around you</Text>
        </View>

        <View style={styles.liveEnergyTopCard}>
          <View>
            <Text style={styles.liveEnergyTopLabel}>LIVE ENERGY</Text>
            <Text style={styles.liveEnergyTopCount}>7</Text>
          </View>

          <View style={styles.liveEnergyTopRight}>
            <Text style={styles.liveEnergyTopMain}>Friends now</Text>
            <Text style={styles.liveEnergyTopSub}>3 nearby</Text>
          </View>
        </View>

        <View style={styles.aiHotspotCard}>
          <View>
            <Text style={styles.aiHotspotKicker}>AI HOTSPOT</Text>
            <Text style={styles.aiHotspotTitle}>Miami Beach is heating up</Text>
          </View>

          <View style={styles.aiHotspotScorePill}>
            <Text style={styles.aiHotspotScoreText}>92</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapShadeTop} />
          <View style={styles.mapShadeBottom} />
          <View style={styles.mapRoadMain} />
          <View style={styles.mapRoadDiagonalA} />
          <View style={styles.mapRoadDiagonalB} />
          <View style={styles.gridLineVerticalLeft} />
          <View style={styles.gridLineVerticalMiddle} />
          <View style={styles.gridLineVerticalRight} />
          <View style={styles.gridLineHorizontalTop} />
          <View style={styles.gridLineHorizontalMiddle} />
          <View style={styles.gridLineHorizontalBottom} />
          <View style={styles.mapCircleLarge} />
          <View style={styles.mapCircleSmall} />

          {mapPoints.map((point) => {
            const isYou = point.kind === 'you';
            const isActive = point.kind === 'active';
            const isEnergy = point.kind === 'energy';
            const isFriend = point.kind === 'friend';

            return (
              <Pressable
                key={point.id}
                style={[styles.pointWrap, { top: point.top, left: point.left }]}
                onPress={() => handleMapPointPress(point)}
              >
                <View
                  style={[
                    styles.vibePoint,
                    isYou && styles.vibePointYou,
                    isActive && styles.vibePointActive,
                    isEnergy && styles.vibePointEnergy,
                    isFriend && styles.vibePointFriend,
                  ]}
                />
                {point.label ? <Text style={styles.pointLabel}>{point.label}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSearch = () => {
    return (
      <View>
        {renderTopBrandHeader({ compact: true, showStory: false })}

        <View style={styles.searchHeaderWrap}>
          <Text style={styles.searchTitle}>Search</Text>
          <Text style={styles.searchSubtitle}>Find nearby energy</Text>
        </View>

        <View style={styles.searchInputCard}>
          <Text style={styles.searchInputPlaceholder}>Search by city, vibe or name</Text>
        </View>

        <View style={styles.searchChipsWrap}>
          {['Nearby', 'Friends', 'Dating', 'Online'].map((chip, index) => (
            <View key={chip} style={[styles.searchChip, index === 0 && styles.searchChipActive]}>
              <Text style={[styles.searchChipText, index === 0 && styles.searchChipTextActive]}>{chip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.aiSearchSignalCard}>
          <View style={styles.aiSearchSignalPulse} />
          <View style={styles.aiSearchSignalTextWrap}>
            <Text style={styles.aiSearchSignalKicker}>AI SEARCH SIGNAL</Text>
            <Text style={styles.aiSearchSignalTitle}>
              Vibes AI is learning who you open, skip and search around the city.
            </Text>
          </View>
        </View>

        <View style={styles.searchResultsWrap}>
          {demoProfiles.map((item) => {
            const name = toSafeText(item.display_name) || 'Vibe';
            const initials =
              name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || '')
                .join('') || 'VB';

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.searchResultCard, pressed && styles.buttonPressed]}
                onPress={() => openExternalProfile(item)}
              >
                <View style={styles.searchResultAvatar}>
                  <Text style={styles.searchResultAvatarText}>{initials}</Text>
                </View>

                <View style={styles.searchResultTextWrap}>
                  <Text style={styles.searchResultName}>{name}</Text>
                  <Text style={styles.searchResultMeta}>{item.city} - Active recently</Text>
                </View>

                <View style={styles.searchResultRightWrap}>
                  <View style={styles.searchResultStatusDotGreen} />
                  <Text style={styles.searchResultDistance}>View</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDating = () => {
    const heroProfile = demoProfiles[0];
    const heroName = toSafeText(heroProfile.display_name) || 'Vibe';
    const heroCity = toSafeText(heroProfile.city) || 'Nearby';
    const heroQuote = toSafeText(heroProfile.bio) || 'Open to new vibes.';

    const heroInitials =
      heroName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'VB';

    const handleSwipe = (liked: boolean) => {
      if (!sessionUserId || !heroProfile?.id) return;

      trackAiSignal({
        userId: sessionUserId,
        signalType: liked ? 'dating_swipe_right' : 'dating_swipe_left',
        signalValue: {
          swipedProfileId: heroProfile.id,
          swipedAt: new Date().toISOString(),
        },
        signalWeight: 1,
        sourceScreen: 'dating',
      }).catch(() => {});
    };

    return (
      <View>
        {renderTopBrandHeader({ compact: true, showStory: false })}

        <View style={styles.searchHeaderWrap}>
          <Text style={styles.searchTitle}>Dating</Text>
          <Text style={styles.searchSubtitle}>Meet people around your vibe</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.datingHeroCard, pressed && styles.buttonPressed]}
          onPress={() => openExternalProfile(heroProfile)}
        >
          <View style={styles.datingCounterPill}>
            <Text style={styles.datingCounterPillText}>1 of 7 nearby</Text>
          </View>

          <View style={styles.datingHeroAvatarWrap}>
            <View style={styles.datingHeroAvatar}>
              <Text style={styles.datingHeroAvatarText}>{heroInitials}</Text>
            </View>
          </View>

          <Text style={styles.datingHeroName}>{heroName}</Text>
          <Text style={styles.datingHeroCity}>{heroCity}</Text>
          <Text style={styles.datingHeroQuote}>{heroQuote}</Text>
          <Text style={styles.datingHeroSubline}>Active now near {heroCity}</Text>

          <View style={styles.aiMatchScoreCard}>
            <View style={styles.aiMatchScoreTopRow}>
              <Text style={styles.aiMatchScoreKicker}>AI MATCH</Text>
              <Text style={styles.aiMatchScorePercent}>87%</Text>
            </View>

            <View style={styles.aiMatchScoreTrack}>
              <View style={styles.aiMatchScoreFill} />
            </View>

            <Text style={styles.aiMatchScoreText}>Strong nearby vibe based on your live signals.</Text>
          </View>

          <View style={styles.datingChipsWrap}>
            <View style={styles.datingChip}>
              <Text style={styles.datingChipText}>Nearby</Text>
            </View>
            <View style={styles.datingChip}>
              <Text style={styles.datingChipText}>Online</Text>
            </View>
            <View style={styles.datingChip}>
              <Text style={styles.datingChipText}>Dating</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.datingActionsRow}>
          <Pressable style={[styles.datingActionButton, styles.datingActionPass]} onPress={() => handleSwipe(false)}>
            <Text style={styles.datingActionText}>Pass</Text>
          </Pressable>

          <Pressable style={[styles.datingActionButton, styles.datingActionLike]} onPress={() => handleSwipe(true)}>
            <Text style={styles.datingActionText}>Like</Text>
          </Pressable>

          <Pressable style={[styles.datingActionButton, styles.datingActionMessage]}>
            <Text style={styles.datingActionText}>Message</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderProfile = () => {
    return (
      <View>
        {renderTopBrandHeader({ compact: true, showStory: false })}

        <View style={styles.profileCard}>
          <View style={styles.profileCardTopActions}>
            <Pressable style={styles.settingsPill} onPress={() => setIsSettingsOpen(true)}>
              <Text style={styles.settingsPillText}>Settings</Text>
            </Pressable>

            {viewingOwnProfile ? (
              <Pressable style={styles.logoutPill} onPress={handleLogout}>
                <Text style={styles.logoutPillText}>Log Out</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.logoutPill} onPress={openOwnProfile}>
                <Text style={styles.logoutPillText}>Back</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.avatarGlowRing}>
            <View style={styles.avatarCircle}>
              {profileAvatarUrl ? (
                <Image source={{ uri: profileAvatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profileInitials}</Text>
              )}
            </View>
          </View>

          <Text style={styles.profileName}>{profileDisplayName}</Text>
          <Text style={styles.profileCity}>{profileCity}</Text>

          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{profileVisible ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <View style={styles.premiumSectionCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>AGE</Text>
              <Text style={styles.statValue}>{profileAge}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>VIBE</Text>
              <Text style={styles.statValue}>{profileLookingFor}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>CITY</Text>
              <Text style={styles.statValue}>{profileCity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.premiumSectionCard}>
          <Text style={styles.bioText}>{profileBio}</Text>
        </View>

        <View style={styles.aiProfileStatusCard}>
          <View style={styles.aiProfileStatusIcon}>
            <Text style={styles.aiProfileStatusIconText}>AI</Text>
          </View>

          <View style={styles.aiProfileStatusTextWrap}>
            <Text style={styles.aiProfileStatusKicker}>VIBES AI STATUS</Text>
            <Text style={styles.aiProfileStatusTitle}>Learning your vibe</Text>
            <Text style={styles.aiProfileStatusSubtitle}>Profile, dating, stories and map signals are active.</Text>
          </View>
        </View>

        <View style={styles.profileActionWrap}>
          <Pressable
            style={({ pressed }) => [styles.profileEditButton, pressed && styles.buttonPressed]}
            onPress={() => {
              if (viewingOwnProfile) {
                setIsSettingsOpen(true);
              } else {
                setActiveConversation({
                  id: 'demo-chat',
                  name: profileDisplayName,
                  initials: profileInitials,
                  message: 'Connected on Vibes',
                  time: 'Now',
                  status: 'green',
                });
                setActiveScreen('chat');
              }
            }}
          >
            <Text style={styles.profileEditButtonText}>{viewingOwnProfile ? 'Edit Profile' : 'Message'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMessages = () => {
    return (
      <View>
        {renderTopBrandHeader({ compact: true, showStory: false })}

        <View style={styles.messagesPanel}>
          <View style={styles.messagesHeaderWrap}>
            <Text style={styles.messagesTitle}>Messages</Text>
            <Text style={styles.messagesSubtitle}>Your live connections</Text>
          </View>

          <View style={styles.searchBarCard}>
            <TextInput
              style={styles.searchInput}
              value=""
              placeholder="Search conversations"
              placeholderTextColor="rgba(148,163,184,0.64)"
              editable={false}
            />
          </View>

          <View style={styles.aiMessagesSummaryCard}>
            <View style={styles.aiMessagesSummaryIcon}>
              <Text style={styles.aiMessagesSummaryIconText}>AI</Text>
            </View>

            <View style={styles.aiMessagesSummaryTextWrap}>
              <Text style={styles.aiMessagesSummaryKicker}>AI ACTIVITY SUMMARY</Text>
              <Text style={styles.aiMessagesSummaryTitle}>Your conversations are part of your live vibe.</Text>
              <Text style={styles.aiMessagesSummarySubtitle}>
                Vibes AI will use messages, matches and profile signals to improve future suggestions.
              </Text>
            </View>
          </View>

          <View style={styles.messagesListWrap}>
            {demoConversations.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.messageCard, item.unread && styles.messageCardUnread]}
                onPress={() => {
                  setActiveConversation(item);
                  setActiveScreen('chat');
                }}
              >
                <View style={styles.messageLeft}>
                  <View style={styles.messageAvatar}>
                    <Text style={styles.messageAvatarText}>{item.initials}</Text>
                  </View>

                  <View style={styles.messageTextWrap}>
                    <Text style={styles.messageName}>{item.name}</Text>
                    <Text style={styles.messagePreview}>{item.message}</Text>
                  </View>
                </View>

                <View style={styles.messageMeta}>
                  <Text style={styles.messageTime}>{item.time}</Text>
                  {item.unread ? <View style={styles.unreadDot} /> : <View style={styles.metaSpacer} />}
                  {item.status === 'green' ? <View style={styles.onlineDotGreen} /> : null}
                  {item.status === 'blue' ? <View style={styles.onlineDotBlue} /> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderChat = () => {
    const name = activeConversation?.name || 'Vibe';

    return (
      <View>
        <View style={styles.chatPanel}>
          <View style={styles.chatHeaderWrap}>
            <Pressable
              style={styles.chatBackButton}
              onPress={() => {
                setActiveScreen('messages');
                setActiveConversation(null);
              }}
            >
              <Text style={styles.chatBackButtonText}>Back</Text>
            </Pressable>

            <View style={styles.chatHeaderTextWrap}>
              <Text style={styles.chatTitle}>{name}</Text>
              <Text style={styles.chatSubtitle}>Connected on Vibes</Text>
            </View>
          </View>

          <View style={styles.aiIcebreakerCard}>
            <Text style={styles.aiIcebreakerKicker}>AI ICEBREAKER</Text>
            <Text style={styles.aiIcebreakerText}>
              Start with something simple: “What’s your favorite spot around the city tonight?”
            </Text>
          </View>

          <View style={styles.chatMessagesWrap}>
            <View style={[styles.chatBubbleRow, styles.chatBubbleRowOther]}>
              <View style={[styles.chatBubble, styles.chatBubbleOther]}>
                <Text style={styles.chatBubbleTextOther}>Hey, welcome to Vibes.</Text>
              </View>
            </View>

            <View style={[styles.chatBubbleRow, styles.chatBubbleRowMine]}>
              <View style={[styles.chatBubble, styles.chatBubbleMine]}>
                <Text style={styles.chatBubbleTextMine}>This chat is ready.</Text>
              </View>
            </View>
          </View>

          <View style={styles.chatComposerWrap}>
            <TextInput
              style={styles.chatInput}
              placeholder="Message..."
              placeholderTextColor="rgba(148,163,184,0.7)"
            />

            <Pressable style={styles.chatSendButton}>
              <Text style={styles.chatSendButtonText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderSettingsPanel = () => {
    if (!isSettingsOpen) return null;

    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />

        <View style={styles.settingsPanelCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Settings</Text>

            <Pressable style={styles.modalCloseButton} onPress={() => setIsSettingsOpen(false)}>
              <Text style={styles.modalCloseButtonText}>X</Text>
            </Pressable>
          </View>

          <View style={styles.settingsSectionCard}>
            <Text style={styles.settingsSectionTitle}>Notifications</Text>

            <Pressable style={styles.settingsToggleRow} onPress={() => setNotificationsEnabled((prev) => !prev)}>
              <Text style={styles.settingsToggleLabel}>Message Notifications</Text>

              <View style={[styles.settingsTogglePill, notificationsEnabled && styles.settingsTogglePillOn]}>
                <Text style={styles.settingsToggleText}>{notificationsEnabled ? 'ON' : 'OFF'}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.settingsSectionCard}>
            <Text style={styles.settingsSectionTitle}>Privacy</Text>

            <Pressable style={styles.settingsToggleRow} onPress={() => setProfileVisible((prev) => !prev)}>
              <Text style={styles.settingsToggleLabel}>Profile Visibility</Text>

              <View style={[styles.settingsTogglePill, profileVisible && styles.settingsTogglePillOn]}>
                <Text style={styles.settingsToggleText}>{profileVisible ? 'VISIBLE' : 'HIDDEN'}</Text>
              </View>
            </Pressable>

            <Pressable style={styles.settingsToggleRow} onPress={() => setLocationSharingEnabled((prev) => !prev)}>
              <Text style={styles.settingsToggleLabel}>Location Sharing</Text>

              <View style={[styles.settingsTogglePill, locationSharingEnabled && styles.settingsTogglePillOn]}>
                <Text style={styles.settingsToggleText}>{locationSharingEnabled ? 'ON' : 'OFF'}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.settingsDangerRow}>
            <Pressable style={styles.settingsLogoutButton} onPress={handleLogout}>
              <Text style={styles.settingsLogoutButtonText}>Log Out</Text>
            </Pressable>

            <Pressable style={styles.settingsDeleteButton}>
              <Text style={styles.settingsDeleteButtonText}>Delete Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderStoryCreatorPanel = () => {
    if (!isStoryCreatorOpen) return null;

    const handleStoryComplete = () => {
      if (sessionUserId) {
        learnFromStory({
          userId: sessionUserId,
          storyId: `local-story-${Date.now()}`,
          completed: true,
          skipped: false,
          sourceScreen: 'story_creator',
          vibeTag: storyCaption?.trim() ? 'caption_story' : null,
        }).catch(() => {});
      }

      setIsStoryCreatorOpen(false);
      setStoryCaption('');
    };

    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsStoryCreatorOpen(false)} />

        <View style={styles.storyPanelCard}>
          <View style={styles.modalHeaderRow}>
            <Pressable style={styles.storyHeaderButton} onPress={() => setIsStoryCreatorOpen(false)}>
              <Text style={styles.storyHeaderButtonText}>Cancel</Text>
            </Pressable>

            <Text style={styles.modalTitle}>NEW STORY</Text>

            <Pressable style={styles.storyHeaderButton} onPress={handleStoryComplete}>
              <Text style={styles.storyHeaderButtonText}>Post</Text>
            </Pressable>
          </View>

          <View style={styles.storyUploadCard}>
            <Text style={styles.storyUploadTitle}>Upload your moment</Text>
            <Text style={styles.storyUploadSub}>PHOTO / VIDEO / GALLERY</Text>
          </View>

          <TextInput
            value={storyCaption}
            onChangeText={setStoryCaption}
            placeholder="Caption"
            placeholderTextColor="rgba(148,163,184,0.8)"
            style={styles.storyCaptionInput}
          />
        </View>
      </View>
    );
  };

  const renderVisibilitySheet = () => {
    if (!isVisibilitySheetOpen) return null;

    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsVisibilitySheetOpen(false)} />

        <View style={styles.visibilitySheetCard}>
          <Text style={styles.modalTitle}>Live Status</Text>
          <Text style={styles.visibilitySubtitle}>Choose how you appear on the map</Text>

          <View style={styles.visibilityOptionRow}>
            <Pressable
              style={[styles.visibilityOption, profileVisible && styles.visibilityOptionActiveGreen]}
              onPress={() => {
                setProfileVisible(true);
                setIsVisibilitySheetOpen(false);
              }}
            >
              <Text style={styles.visibilityOptionTitle}>VISIBLE</Text>
              <Text style={styles.visibilityOptionText}>Friends can see your live vibe.</Text>
            </Pressable>

            <Pressable
              style={[styles.visibilityOption, !profileVisible && styles.visibilityOptionActiveBlue]}
              onPress={() => {
                setProfileVisible(false);
                setIsVisibilitySheetOpen(false);
              }}
            >
              <Text style={styles.visibilityOptionTitle}>INVISIBLE</Text>
              <Text style={styles.visibilityOptionText}>Hide from map while staying connected.</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#93c5fd" />
          <Text style={styles.loadingText}>Connecting to City Pulse...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>{renderAuth()}</View>
      </SafeAreaView>
    );
  }

  const isHome = activeScreen === 'home';
  const isSearch = activeScreen === 'search';
  const isDating = activeScreen === 'dating';
  const isMap = activeScreen === 'map';
  const isProfile = activeScreen === 'profile';
  const isMessages = activeScreen === 'messages';
  const isChat = activeScreen === 'chat';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {isHome ? renderHome() : null}
          {isSearch ? renderSearch() : null}
          {isDating ? renderDating() : null}
          {isMap ? renderMap() : null}
          {isProfile ? renderProfile() : null}
          {isMessages ? renderMessages() : null}
          {isChat ? renderChat() : null}
        </ScrollView>

        {!isChat ? (
          <BottomNav
            activeTab={
              isSearch
                ? 'search'
                : isDating
                  ? 'dating'
                  : isMap
                    ? 'map'
                    : isProfile
                      ? 'profile'
                      : 'messages'
            }
            onPressSearch={() => setActiveScreen('search')}
            onPressDating={() => setActiveScreen('dating')}
            onPressMap={() => setActiveScreen('map')}
            onPressProfile={openOwnProfile}
            onPressMessages={() => setActiveScreen('messages')}
          />
        ) : null}

        {renderSettingsPanel()}
        {renderStoryCreatorPanel()}
        {renderVisibilitySheet()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  homeHeroCard: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(7,13,26,0.88)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  homeHeroGlowOne: {
    display: 'none',
  },
  homeHeroGlowTwo: {
    display: 'none',
  },
  homeHeroTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  homeHeroLivePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.34)',
    backgroundColor: 'rgba(8,30,22,0.62)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  homeHeroLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  homeHeroLiveText: {
    color: 'rgba(220,252,231,0.94)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  homeHeroAiPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.26)',
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  homeHeroAiText: {
    color: 'rgba(219,234,254,0.92)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  homeHeroTitle: {
    width: '100%',
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 7,
    textAlign: 'left',
  },
  homeHeroSubtitle: {
    width: '100%',
    color: 'rgba(203,213,225,0.74)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'left',
  },
  homeHeroStatsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 15,
  },
  homeHeroStatBox: {
    flex: 1,
    minWidth: 0,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(2,8,20,0.54)',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeHeroStatValue: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
  },
  homeHeroStatLabel: {
    color: 'rgba(203,213,225,0.62)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  homeQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  homeQuickActionCard: {
    width: '48.5%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(7,13,26,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  homeQuickActionIcon: {
    color: 'rgba(219,234,254,0.9)',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  homeQuickActionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  homeQuickActionSub: {
    color: 'rgba(203,213,225,0.62)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  vibesAiPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.24)',
    backgroundColor: 'rgba(6,18,28,0.58)',
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#22c55e',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  vibesAiOrbWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.42)',
    backgroundColor: 'rgba(20,83,45,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibesAiOrbText: {
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  vibesAiCopy: {
    flex: 1,
  },
  vibesAiKicker: {
    color: 'rgba(110,231,183,0.9)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 4,
  },
  vibesAiTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  vibesAiSubtitle: {
    color: 'rgba(203,213,225,0.74)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 18,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(191,219,254,0.88)',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: CONTENT_BOTTOM_PAD,
    flexGrow: 1,
  },

  authPremiumRoot: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 8,
  },
  authCityBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  authCityBackgroundImageStyle: {
    opacity: 1,
    width: '100%',
    height: '100%',
  },
  authImageDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  authBrandPremiumWrap: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 4,
    transform: [{ translateY: -30 }],
  },
  authVibesText: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: 8.8,
    textAlign: 'center',
    marginLeft: 8,
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.72)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
  },
  authCityPulseLogoWrap: {
    position: 'relative',
    width: 300,
    height: 58,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    overflow: 'visible',
  },
  authCityPulseRow: {
    position: 'relative',
    width: 300,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
    overflow: 'visible',
  },
  authCityText: {
    color: '#62ff8d',
    fontSize: 45,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -3.2,
    textShadowColor: 'rgba(98,255,141,0.72)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
    transform: [{ translateY: -4 }],
  },
  authPulseText: {
    color: '#ff4058',
    fontSize: 45,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -3.2,
    textShadowColor: 'rgba(255,64,88,0.72)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
    transform: [{ translateY: -4 }],
  },
  authPremiumCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(3,7,17,0.56)',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  authPremiumCardGlowLeft: {
    position: 'absolute',
    left: -90,
    top: -30,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(98,255,141,0.07)',
  },
  authPremiumCardGlowRight: {
    position: 'absolute',
    right: -90,
    bottom: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,64,88,0.08)',
  },
  authInputWrap: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(3,7,17,0.42)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authInputIcon: {
    width: 22,
    color: '#62ff8d',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '900',
    textShadowColor: '#62ff8d',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  authInputPremium: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  authPasswordShowButton: {
    minWidth: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authPasswordShowText: {
    color: 'rgba(224,230,248,0.7)',
    fontSize: 11,
    fontWeight: '900',
  },
  authPrimaryPremiumButton: {
    height: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(140,255,170,0.62)',
    backgroundColor: 'rgba(6,18,28,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#62ff8d',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  authPrimaryPremiumText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(98,255,141,0.55)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  authPrimaryArrow: {
    position: 'absolute',
    right: 18,
    color: '#62ff8d',
    fontSize: 30,
    fontWeight: '700',
  },
  authSecondaryPremiumButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(7,12,25,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  authSecondaryPremiumText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  authSecondaryIcon: {
    position: 'absolute',
    right: 18,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 19,
    fontWeight: '900',
  },
  authDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  authDividerText: {
    color: 'rgba(190,199,224,0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  authProviderButton: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(8,13,27,0.42)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authProviderIcon: {
    width: 32,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  authProviderPhoneIcon: {
    color: '#62ff8d',
  },
  authProviderText: {
    flex: 1,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
  },
  authProviderArrow: {
    width: 22,
    color: 'rgba(255,255,255,0.64)',
    fontSize: 28,
    fontWeight: '300',
    textAlign: 'right',
  },
  authErrorPremiumText: {
    color: 'rgba(248,113,113,0.95)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 2,
  },
  authLegalWrap: {
    marginTop: 22,
    alignItems: 'center',
    zIndex: 6,
  },
  authLegalText: {
    color: 'rgba(211,218,240,0.68)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  authLegalLinks: {
    color: '#6fff94',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
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

  homeRoot: {
    flex: 1,
  },
  homeBodyCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  aiInsightCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.22)',
    backgroundColor: 'rgba(6,18,28,0.54)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  aiInsightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  aiInsightTextWrap: {
    flex: 1,
  },
  aiInsightKicker: {
    color: 'rgba(110,231,183,0.88)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 3,
  },
  aiInsightTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  aiInsightSubtitle: {
    color: 'rgba(203,213,225,0.72)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingVertical: 32,
    paddingHorizontal: 22,
    marginTop: 12,
    marginBottom: 16,
  },
  cardText: {
    color: TEXT,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '900',
  },
  cardSubText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  actionsWrap: {
    gap: 12,
  },
  buttonPrimary: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.45)',
    backgroundColor: 'rgba(30,58,138,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(10,18,34,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: '#eff6ff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonSecondaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  screenHeaderWrap: {
    marginTop: 6,
    marginBottom: 10,
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  screenSubtitle: {
    color: MUTED,
    fontSize: 17,
    marginTop: 6,
  },
  mapChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.40)',
    backgroundColor: 'rgba(15,23,42,0.66)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  mapChipText: {
    color: 'rgba(226,232,240,0.92)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveEnergyTopCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    backgroundColor: 'rgba(245,250,255,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveEnergyTopLabel: {
    color: 'rgba(15,23,42,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  liveEnergyTopCount: {
    color: '#0f172a',
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 2,
  },
  liveEnergyTopRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  liveEnergyTopMain: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  liveEnergyTopSub: {
    color: 'rgba(15,23,42,0.64)',
    fontSize: 12,
    fontWeight: '700',
  },
  aiHotspotCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,64,88,0.24)',
    backgroundColor: 'rgba(40,8,18,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiHotspotKicker: {
    color: 'rgba(255,64,88,0.92)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  aiHotspotTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  aiHotspotScorePill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,64,88,0.45)',
    backgroundColor: 'rgba(255,64,88,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHotspotScoreText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  mapCard: {
    height: 376,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    backgroundColor: '#040b1a',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
  },
  mapShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  mapShadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(4,9,20,0.86)',
  },
  mapRoadMain: {
    position: 'absolute',
    top: '48%',
    left: -22,
    right: -22,
    height: 2,
    backgroundColor: 'rgba(148,163,184,0.15)',
    transform: [{ rotate: '-7deg' }],
  },
  mapRoadDiagonalA: {
    position: 'absolute',
    top: '30%',
    left: -30,
    right: -30,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.11)',
    transform: [{ rotate: '24deg' }],
  },
  mapRoadDiagonalB: {
    position: 'absolute',
    top: '66%',
    left: -26,
    right: -26,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.12)',
    transform: [{ rotate: '-24deg' }],
  },
  gridLineVerticalLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  gridLineVerticalMiddle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineVerticalRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  gridLineHorizontalTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridLineHorizontalMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineHorizontalBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  mapCircleLarge: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.13)',
    top: 38,
    left: 30,
  },
  mapCircleSmall: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.16)',
    bottom: 84,
    right: 20,
  },
  pointWrap: {
    position: 'absolute',
    alignItems: 'center',
    marginTop: -8,
    marginLeft: -8,
  },
  vibePoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
  },
  vibePointYou: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0ecff',
    borderColor: '#60a5fa',
    borderWidth: 2,
  },
  vibePointActive: {
    backgroundColor: BLUE,
  },
  vibePointEnergy: {
    backgroundColor: '#ef4444',
  },
  vibePointFriend: {
    backgroundColor: GREEN,
  },
  pointLabel: {
    color: '#dbeafe',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.30)',
  },

  searchHeaderWrap: {
    marginTop: 6,
    marginBottom: 10,
  },
  searchTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  searchSubtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 5,
    fontWeight: '600',
  },
  searchInputCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.2)',
    backgroundColor: 'rgba(9,17,32,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  searchInputPlaceholder: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  searchChipsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    backgroundColor: 'rgba(7,14,28,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchChipActive: {
    borderColor: 'rgba(147,197,253,0.45)',
    backgroundColor: 'rgba(30,64,175,0.42)',
  },
  searchChipText: {
    color: 'rgba(203,213,225,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  searchChipTextActive: {
    color: '#eff6ff',
  },
  aiSearchSignalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.22)',
    backgroundColor: 'rgba(8,16,30,0.64)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  aiSearchSignalPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.72,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  aiSearchSignalTextWrap: {
    flex: 1,
  },
  aiSearchSignalKicker: {
    color: 'rgba(147,197,253,0.9)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 3,
  },
  aiSearchSignalTitle: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  searchResultsWrap: {
    marginTop: 12,
    gap: 10,
  },
  searchResultCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.17)',
    backgroundColor: 'rgba(10,18,34,0.84)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
    backgroundColor: 'rgba(10,18,34,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultAvatarText: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800',
  },
  searchResultTextWrap: {
    flex: 1,
  },
  searchResultName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  searchResultMeta: {
    color: MUTED,
    fontSize: 12,
  },
  searchResultRightWrap: {
    marginLeft: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  searchResultStatusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  searchResultDistance: {
    color: 'rgba(148,163,184,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },

  datingHeroCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.24)',
    backgroundColor: 'rgba(9,17,32,0.86)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  datingCounterPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.36)',
    backgroundColor: 'rgba(30,58,138,0.34)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  datingCounterPillText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  datingHeroAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(96,165,250,0.4)',
  },
  datingHeroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.35)',
    backgroundColor: 'rgba(10,18,34,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datingHeroAvatarText: {
    color: '#eff6ff',
    fontSize: 26,
    fontWeight: '900',
  },
  datingHeroName: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  datingHeroCity: {
    marginTop: 4,
    color: 'rgba(203,213,225,0.84)',
    fontSize: 14,
    fontWeight: '700',
  },
  datingHeroQuote: {
    marginTop: 10,
    color: 'rgba(226,232,240,0.86)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  datingHeroSubline: {
    marginTop: 6,
    color: 'rgba(148,163,184,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  aiMatchScoreCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.24)',
    backgroundColor: 'rgba(6,18,28,0.48)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 12,
  },
  aiMatchScoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiMatchScoreKicker: {
    color: 'rgba(110,231,183,0.9)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  aiMatchScorePercent: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  aiMatchScoreTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.18)',
    overflow: 'hidden',
  },
  aiMatchScoreFill: {
    width: '87%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  aiMatchScoreText: {
    color: 'rgba(203,213,225,0.76)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  datingChipsWrap: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  datingChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    backgroundColor: 'rgba(7,14,28,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  datingChipText: {
    color: 'rgba(226,232,240,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },
  datingActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 9,
  },
  datingActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datingActionPass: {
    borderColor: 'rgba(248,113,113,0.42)',
    backgroundColor: 'rgba(69,10,10,0.34)',
  },
  datingActionLike: {
    borderColor: 'rgba(96,165,250,0.46)',
    backgroundColor: 'rgba(30,64,175,0.42)',
  },
  datingActionMessage: {
    borderColor: 'rgba(148,163,184,0.28)',
    backgroundColor: 'rgba(7,14,28,0.72)',
  },
  datingActionText: {
    color: '#eff6ff',
    fontSize: 13,
    fontWeight: '800',
  },

  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.20)',
    backgroundColor: 'rgba(10,18,34,0.7)',
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 386,
  },
  profileCardTopActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.28)',
    backgroundColor: 'rgba(10,18,34,0.84)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  settingsPillText: {
    color: 'rgba(226,232,240,0.90)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  logoutPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.55)',
    backgroundColor: 'rgba(69,10,10,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  logoutPillText: {
    color: 'rgba(254,202,202,0.95)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  avatarGlowRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.11)',
    borderWidth: 2,
    borderColor: 'rgba(96,165,250,0.45)',
  },
  avatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(12,17,31,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  profileCity: {
    color: 'rgba(219,234,254,0.82)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  statusChip: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.40)',
    backgroundColor: 'rgba(20,83,45,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusChipText: {
    color: 'rgba(187,247,208,0.95)',
    fontSize: 11,
    fontWeight: '800',
  },
  premiumSectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(10,18,34,0.66)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    backgroundColor: 'rgba(10,15,28,0.82)',
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(191,219,254,0.62)',
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  bioText: {
    color: 'rgba(226,232,240,0.86)',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    textAlign: 'center',
  },
  aiProfileStatusCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.24)',
    backgroundColor: 'rgba(6,18,28,0.52)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiProfileStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.42)',
    backgroundColor: 'rgba(20,83,45,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiProfileStatusIconText: {
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiProfileStatusTextWrap: {
    flex: 1,
  },
  aiProfileStatusKicker: {
    color: 'rgba(110,231,183,0.9)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 3,
  },
  aiProfileStatusTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  aiProfileStatusSubtitle: {
    color: 'rgba(203,213,225,0.72)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  profileActionWrap: {
    marginTop: 14,
    marginBottom: 20,
  },
  profileEditButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.5)',
    backgroundColor: 'rgba(30,64,175,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEditButtonText: {
    color: 'rgba(241,245,249,0.96)',
    fontSize: 16,
    fontWeight: '800',
  },

  messagesPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messagesHeaderWrap: {
    marginTop: 6,
    marginBottom: 10,
  },
  messagesTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  messagesSubtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 5,
    fontWeight: '600',
  },
  searchBarCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.2)',
    backgroundColor: 'rgba(9,17,32,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 6,
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(5,12,24,0.76)',
    color: 'rgba(226,232,240,0.94)',
    paddingHorizontal: 13,
    fontSize: 14,
  },
  aiMessagesSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.22)',
    backgroundColor: 'rgba(8,16,30,0.64)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiMessagesSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.38)',
    backgroundColor: 'rgba(30,64,175,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMessagesSummaryIconText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiMessagesSummaryTextWrap: {
    flex: 1,
  },
  aiMessagesSummaryKicker: {
    color: 'rgba(147,197,253,0.9)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 3,
  },
  aiMessagesSummaryTitle: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  aiMessagesSummarySubtitle: {
    color: 'rgba(203,213,225,0.72)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  messagesListWrap: {
    gap: 12,
    marginTop: 12,
  },
  messageCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.17)',
    backgroundColor: 'rgba(10,18,34,0.84)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageCardUnread: {
    borderColor: 'rgba(147,197,253,0.32)',
  },
  messageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
    backgroundColor: 'rgba(10,18,34,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  messageAvatarText: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800',
  },
  messageTextWrap: {
    flex: 1,
  },
  messageName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  messagePreview: {
    color: MUTED,
    fontSize: 12,
  },
  messageMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
    gap: 5,
  },
  messageTime: {
    color: 'rgba(148,163,184,0.84)',
    fontSize: 11,
    fontWeight: '700',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#60a5fa',
  },
  metaSpacer: {
    width: 7,
    height: 7,
  },
  onlineDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GREEN,
  },
  onlineDotBlue: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BLUE,
  },

  chatPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_2,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  chatHeaderWrap: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatBackButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.25)',
    backgroundColor: 'rgba(8,16,30,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBackButtonText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '800',
  },
  chatHeaderTextWrap: {
    flex: 1,
  },
  chatTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  chatSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  aiIcebreakerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.24)',
    backgroundColor: 'rgba(8,16,30,0.76)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  aiIcebreakerKicker: {
    color: 'rgba(110,231,183,0.9)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  aiIcebreakerText: {
    color: 'rgba(241,245,249,0.92)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  chatMessagesWrap: {
    marginTop: 10,
    gap: 8,
  },
  chatBubbleRow: {
    width: '100%',
    flexDirection: 'row',
  },
  chatBubbleRowMine: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowOther: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatBubbleMine: {
    backgroundColor: 'rgba(37,99,235,0.95)',
    borderColor: 'rgba(96,165,250,0.32)',
  },
  chatBubbleOther: {
    backgroundColor: 'rgba(10,18,34,0.86)',
    borderColor: 'rgba(148,163,184,0.24)',
  },
  chatBubbleTextMine: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTextOther: {
    color: 'rgba(226,232,240,0.94)',
    fontSize: 14,
    lineHeight: 20,
  },
  chatComposerWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(5,12,24,0.78)',
    color: 'rgba(226,232,240,0.96)',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chatSendButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
    backgroundColor: 'rgba(37,99,235,0.92)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

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

  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 60,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,16,0.72)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '900',
  },
  modalCloseButton: {
    height: 30,
    width: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(15,23,42,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '900',
  },
  settingsPanelCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(7,14,28,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    maxHeight: '84%',
  },
  settingsSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.20)',
    backgroundColor: 'rgba(11,18,36,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  settingsSectionTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingsToggleRow: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.20)',
    backgroundColor: 'rgba(7,14,28,0.9)',
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsToggleLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  settingsTogglePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  settingsTogglePillOn: {
    borderColor: 'rgba(24,212,123,0.45)',
    backgroundColor: 'rgba(6,78,59,0.65)',
  },
  settingsToggleText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '800',
  },
  settingsDangerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  settingsLogoutButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.20)',
    backgroundColor: 'rgba(15,23,42,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLogoutButtonText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
  },
  settingsDeleteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.45)',
    backgroundColor: 'rgba(76,5,25,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsDeleteButtonText: {
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '700',
  },
  storyPanelCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(7,14,28,0.97)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  storyHeaderButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(11,18,36,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  storyHeaderButtonText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
  },
  storyUploadCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(11,18,36,0.9)',
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  storyUploadTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  storyUploadSub: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  storyCaptionInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(9,16,30,0.9)',
    color: TEXT,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  visibilitySheetCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(7,14,28,0.97)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  visibilitySubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  visibilityOptionRow: {
    gap: 8,
  },
  visibilityOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(11,18,36,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  visibilityOptionActiveGreen: {
    borderColor: 'rgba(24,212,123,0.5)',
    backgroundColor: 'rgba(6,78,59,0.58)',
  },
  visibilityOptionActiveBlue: {
    borderColor: 'rgba(59,130,246,0.5)',
    backgroundColor: 'rgba(29,78,216,0.45)',
  },
  visibilityOptionTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  visibilityOptionText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
});