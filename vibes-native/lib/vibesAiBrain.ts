import { supabase } from './supabase';

export type AiSignalType =
  | 'app_opened'
  | 'profile_view'
  | 'profile_like'
  | 'profile_pass'
  | 'story_view'
  | 'story_skip'
  | 'story_complete'
  | 'match_created'
  | 'message_started'
  | 'event_opened'
  | 'venue_clicked'
  | 'map_hotspot_seen'
  | 'dating_swipe_right'
  | 'dating_swipe_left'
  | 'daily_pulse_seen'
  | 'recommendation_clicked'
  | 'recommendation_dismissed';

export type AiRecommendationType =
  | 'person'
  | 'event'
  | 'venue'
  | 'story'
  | 'hotspot'
  | 'daily_pulse'
  | 'message_icebreaker';

type TrackSignalInput = {
  userId: string;
  signalType: AiSignalType;
  signalValue?: Record<string, any>;
  signalWeight?: number;
  sourceScreen?: string;
  expiresAt?: string | null;
};

type PreferenceInput = {
  userId: string;
  key: string;
  value: Record<string, any>;
  confidence?: number;
};

type RecommendationInput = {
  userId: string;
  type: AiRecommendationType;
  targetId?: string | null;
  score?: number;
  reason?: string;
  metadata?: Record<string, any>;
};

type PlaceSignalInput = {
  placeId?: string | null;
  placeName: string;
  placeType?: string | null;
  activeUsersCount?: number;
  storiesCount?: number;
  dominantVibe?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function getSupabaseClient() {
  if (!supabase) {
    console.warn('Vibes AI Brain: Supabase client is not available.');
    return null;
  }

  return supabase;
}

export async function trackAiSignal(input: TrackSignalInput) {
  if (!input.userId || !input.signalType) {
    return { ok: false, error: 'Missing userId or signalType' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const { error } = await client.from('ai_user_signals').insert({
    user_id: input.userId,
    signal_type: input.signalType,
    signal_value: input.signalValue ?? {},
    signal_weight: input.signalWeight ?? 1,
    source_screen: input.sourceScreen ?? null,
    expires_at: input.expiresAt ?? null,
  });

  if (error) {
    console.warn('Vibes AI signal error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function upsertAiPreference(input: PreferenceInput) {
  if (!input.userId || !input.key) {
    return { ok: false, error: 'Missing userId or preference key' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const { error } = await client.from('ai_user_preferences').upsert(
    {
      user_id: input.userId,
      preference_key: input.key,
      preference_value: input.value ?? {},
      confidence_score: input.confidence ?? 0.2,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,preference_key',
    }
  );

  if (error) {
    console.warn('Vibes AI preference error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getAiPreferences(userId: string) {
  if (!userId) return [];

  const client = getSupabaseClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('ai_user_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false });

  if (error) {
    console.warn('Vibes AI get preferences error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function createAiRecommendation(input: RecommendationInput) {
  if (!input.userId || !input.type) {
    return { ok: false, error: 'Missing userId or recommendation type' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const { data, error } = await client
    .from('ai_recommendations')
    .insert({
      user_id: input.userId,
      recommendation_type: input.type,
      target_id: input.targetId ?? null,
      score: input.score ?? 0,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.warn('Vibes AI recommendation error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

export async function markAiRecommendationClicked(userId: string, recommendationId: string) {
  if (!userId || !recommendationId) {
    return { ok: false, error: 'Missing userId or recommendationId' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const { error: updateError } = await client
    .from('ai_recommendations')
    .update({ clicked: true })
    .eq('id', recommendationId)
    .eq('user_id', userId);

  if (updateError) {
    console.warn('Vibes AI recommendation click error:', updateError.message);
    return { ok: false, error: updateError.message };
  }

  const { error: feedbackError } = await client.from('ai_feedback').insert({
    user_id: userId,
    recommendation_id: recommendationId,
    feedback_type: 'clicked',
  });

  if (feedbackError) {
    console.warn('Vibes AI feedback click error:', feedbackError.message);
  }

  return { ok: true };
}

export async function markAiRecommendationDismissed(userId: string, recommendationId: string) {
  if (!userId || !recommendationId) {
    return { ok: false, error: 'Missing userId or recommendationId' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const { error: updateError } = await client
    .from('ai_recommendations')
    .update({ dismissed: true })
    .eq('id', recommendationId)
    .eq('user_id', userId);

  if (updateError) {
    console.warn('Vibes AI recommendation dismiss error:', updateError.message);
    return { ok: false, error: updateError.message };
  }

  const { error: feedbackError } = await client.from('ai_feedback').insert({
    user_id: userId,
    recommendation_id: recommendationId,
    feedback_type: 'dismissed',
  });

  if (feedbackError) {
    console.warn('Vibes AI feedback dismiss error:', feedbackError.message);
  }

  return { ok: true };
}

export function calculatePlaceVibeScore(input: {
  activeUsersCount?: number;
  storiesCount?: number;
  growthRate?: number;
  nearbyBoost?: number;
  socialBoost?: number;
}) {
  const activeUsers = Math.min(input.activeUsersCount ?? 0, 100);
  const stories = Math.min(input.storiesCount ?? 0, 50);
  const growth = Math.min(input.growthRate ?? 0, 100);
  const nearby = Math.min(input.nearbyBoost ?? 0, 100);
  const social = Math.min(input.socialBoost ?? 0, 100);

  const score =
    activeUsers * 0.3 +
    growth * 0.25 +
    nearby * 0.2 +
    stories * 0.15 +
    social * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function saveAiPlaceSignal(input: PlaceSignalInput) {
  if (!input.placeName) {
    return { ok: false, error: 'Missing placeName' };
  }

  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, error: 'Supabase client is not available' };
  }

  const vibeScore = calculatePlaceVibeScore({
    activeUsersCount: input.activeUsersCount ?? 0,
    storiesCount: input.storiesCount ?? 0,
    growthRate: input.activeUsersCount ?? 0,
    nearbyBoost: 50,
    socialBoost: input.storiesCount ?? 0,
  });

  const { error } = await client.from('ai_place_signals').insert({
    place_id: input.placeId ?? null,
    place_name: input.placeName,
    place_type: input.placeType ?? null,
    active_users_count: input.activeUsersCount ?? 0,
    stories_count: input.storiesCount ?? 0,
    vibe_score: vibeScore,
    dominant_vibe: input.dominantVibe ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });

  if (error) {
    console.warn('Vibes AI place signal error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, vibeScore };
}

export async function getTopAiPlaces(limit = 10) {
  const client = getSupabaseClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('ai_place_signals')
    .select('*')
    .order('vibe_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Vibes AI top places error:', error.message);
    return [];
  }

  return data ?? [];
}

export function calculatePersonMatchScore(input: {
  distanceScore?: number;
  interestScore?: number;
  recentActivityScore?: number;
  responseProbability?: number;
  interactionHistoryScore?: number;
}) {
  const distance = Math.min(input.distanceScore ?? 0, 100);
  const interests = Math.min(input.interestScore ?? 0, 100);
  const activity = Math.min(input.recentActivityScore ?? 0, 100);
  const response = Math.min(input.responseProbability ?? 0, 100);
  const history = Math.min(input.interactionHistoryScore ?? 0, 100);

  const score =
    distance * 0.35 +
    interests * 0.25 +
    activity * 0.2 +
    response * 0.1 +
    history * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function buildDailyPulse(userId: string) {
  if (!userId) {
    return {
      title: 'City Pulse',
      message: 'Open Vibes to see what is moving around you.',
      items: [],
    };
  }

  const client = getSupabaseClient();

  if (!client) {
    return {
      title: 'Daily Pulse',
      message: 'Vibes AI is waiting for Supabase connection.',
      items: ['The city is waking up. Vibes will learn what you like as you use the app.'],
    };
  }

  const [preferences, topPlaces] = await Promise.all([
    getAiPreferences(userId),
    getTopAiPlaces(5),
  ]);

  const strongestPreference = preferences?.[0];
  const hottestPlace = topPlaces?.[0];

  const items: string[] = [];

  if (hottestPlace) {
    items.push(
      `${hottestPlace.place_name} is heating up with a Vibe Score of ${Math.round(
        Number(hottestPlace.vibe_score ?? 0)
      )}.`
    );
  }

  if (strongestPreference) {
    items.push(`Your AI is learning your vibe: ${strongestPreference.preference_key}.`);
  }

  if (!items.length) {
    items.push('The city is waking up. Vibes will learn what you like as you use the app.');
  }

  await trackAiSignal({
    userId,
    signalType: 'daily_pulse_seen',
    signalValue: {
      generated_at: new Date().toISOString(),
      items,
    },
    signalWeight: 1,
    sourceScreen: 'home',
  });

  return {
    title: 'Daily Pulse',
    message: 'What is moving around you right now.',
    items,
  };
}

export async function learnFromProfileView(input: {
  userId: string;
  viewedProfileId: string;
  sourceScreen?: string;
  gender?: string | null;
  city?: string | null;
  lookingFor?: string | null;
}) {
  await trackAiSignal({
    userId: input.userId,
    signalType: 'profile_view',
    signalValue: {
      viewed_profile_id: input.viewedProfileId,
      gender: input.gender ?? null,
      city: input.city ?? null,
      looking_for: input.lookingFor ?? null,
    },
    signalWeight: 1,
    sourceScreen: input.sourceScreen ?? 'profile',
  });

  if (input.gender) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'interested_profile_gender',
      value: { gender: input.gender },
      confidence: 0.25,
    });
  }

  if (input.city) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'interested_city',
      value: { city: input.city },
      confidence: 0.2,
    });
  }

  if (input.lookingFor) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'interested_vibe_type',
      value: { looking_for: input.lookingFor },
      confidence: 0.2,
    });
  }

  return { ok: true };
}

export async function learnFromSwipe(input: {
  userId: string;
  targetProfileId: string;
  liked: boolean;
  sourceScreen?: string;
}) {
  await trackAiSignal({
    userId: input.userId,
    signalType: input.liked ? 'dating_swipe_right' : 'dating_swipe_left',
    signalValue: {
      target_profile_id: input.targetProfileId,
      liked: input.liked,
    },
    signalWeight: input.liked ? 2 : 0.5,
    sourceScreen: input.sourceScreen ?? 'dating',
  });

  return { ok: true };
}

export async function learnFromVenueClick(input: {
  userId: string;
  venueId?: string | null;
  venueName: string;
  venueType?: string | null;
  dominantVibe?: string | null;
  sourceScreen?: string;
}) {
  await trackAiSignal({
    userId: input.userId,
    signalType: 'venue_clicked',
    signalValue: {
      venue_id: input.venueId ?? null,
      venue_name: input.venueName,
      venue_type: input.venueType ?? null,
      dominant_vibe: input.dominantVibe ?? null,
    },
    signalWeight: 2,
    sourceScreen: input.sourceScreen ?? 'map',
  });

  if (input.venueType) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'preferred_venue_type',
      value: { venue_type: input.venueType },
      confidence: 0.25,
    });
  }

  if (input.dominantVibe) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'preferred_vibe',
      value: { vibe: input.dominantVibe },
      confidence: 0.25,
    });
  }

  return { ok: true };
}

export async function learnFromStory(input: {
  userId: string;
  storyId: string;
  completed?: boolean;
  skipped?: boolean;
  sourceScreen?: string;
  vibeTag?: string | null;
}) {
  let signalType: AiSignalType = 'story_view';
  let weight = 1;

  if (input.completed) {
    signalType = 'story_complete';
    weight = 2;
  }

  if (input.skipped) {
    signalType = 'story_skip';
    weight = 0.3;
  }

  await trackAiSignal({
    userId: input.userId,
    signalType,
    signalValue: {
      story_id: input.storyId,
      completed: !!input.completed,
      skipped: !!input.skipped,
      vibe_tag: input.vibeTag ?? null,
    },
    signalWeight: weight,
    sourceScreen: input.sourceScreen ?? 'story',
  });

  if (input.vibeTag && input.completed) {
    await upsertAiPreference({
      userId: input.userId,
      key: 'preferred_story_vibe',
      value: { vibe: input.vibeTag },
      confidence: 0.25,
    });
  }

  return { ok: true };
}