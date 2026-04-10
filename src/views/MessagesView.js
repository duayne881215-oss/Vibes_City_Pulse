/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import {
  readLocalMessagesState,
  upsertLocalConversation,
  appendLocalMessage,
  markConversationReadLocal,
  getLocalConversationByOtherUser,
  mergeInboxConversations
} from '../lib/messagesLocalStore.js';

const CHAT_ALERT_SOUND =
  'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA' +
  '///////////////////////////////8AAAA8TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnE0J' +
  '4fQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const formatChatTime = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const normalizeIso = (value) => {
  try {
    return new Date(value).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

const buildOptimisticMessage = ({ conversationId, senderId, body }) => {
  const nowIso = new Date().toISOString();
  return {
    id: `optimistic_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    conversation_id: conversationId,
    sender_id: senderId,
    body,
    created_at: nowIso,
    optimistic: true
  };
};

const replaceOptimisticMessage = (prev, optimisticId, realMessage) => {
  let replaced = false;

  const next = (Array.isArray(prev) ? prev : []).map((msg) => {
    if (msg?.id === optimisticId) {
      replaced = true;
      return realMessage;
    }
    return msg;
  });

  if (!replaced) {
    const exists = next.some((msg) => msg?.id === realMessage?.id);
    if (!exists) next.push(realMessage);
  }

  next.sort((a, b) => {
    const at = new Date(a?.created_at || 0).getTime();
    const bt = new Date(b?.created_at || 0).getTime();
    return at - bt;
  });

  return next;
};

export default function MessagesView({
  supabase,
  currentUser,
  activeConversationVibe,
  onClose,
  onBackToInbox,
  onSelectConversation,
  onViewProfile,
  onGoToMap,
  blockedUserIds = [],
  hiddenConversationIds = [],
  onBlockUser,
  onReportUser,
  onRemoveConversation
}) {
  const [conversations, setConversations] = React.useState([]);
  const [incomingRequests, setIncomingRequests] = React.useState([]);
  const [outgoingRequests, setOutgoingRequests] = React.useState([]);
  const [activeConversation, setActiveConversation] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showSentRequests, setShowSentRequests] = React.useState(false);
  const messagesEndRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const inboxAudioRef = React.useRef(null);
  const lastPlayedMessageIdRef = React.useRef('');
  const fetchConversationsRef = React.useRef(null);

  React.useEffect(() => {
    try {
      const audio = new Audio(CHAT_ALERT_SOUND);
      audio.preload = 'auto';
      audio.volume = 0.9;
      inboxAudioRef.current = audio;
    } catch (e) {
      inboxAudioRef.current = null;
    }

    return () => {
      try {
        if (inboxAudioRef.current) {
          inboxAudioRef.current.pause?.();
          inboxAudioRef.current.src = '';
        }
      } catch (e) {}
      inboxAudioRef.current = null;
    };
  }, []);

  const playInboxSound = React.useCallback(() => {
    try {
      const audio = inboxAudioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      const p = audio.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }, []);

  const normalizeDemoUserForChat = React.useCallback((raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = (src.id ?? src.userId ?? src.user_id ?? '').toString().trim();
    if (!id) return null;

    const lookingForRaw = src.lookingFor ?? src.looking_for;

    return {
      id,
      displayName: (src.displayName ?? src.display_name ?? src.label ?? '').toString().trim() || 'Vibe',
      avatarUrl: (src.avatarUrl ?? src.avatar_url ?? '').toString(),
      city: (src.city ?? '').toString(),
      bio: (src.bio ?? '').toString(),
      birthday: (src.birthday ?? src.birth_date ?? '').toString(),
      lookingFor: Array.isArray(lookingForRaw) ? lookingForRaw : (lookingForRaw ? [lookingForRaw] : []),
      energy: (src.energy ?? '').toString() || 'Chill',
      isOnline:
        typeof (src.isOnline ?? src.is_online) === 'boolean'
          ? (src.isOnline ?? src.is_online)
          : !!(src.isOnline ?? src.is_online),
      lastSeen: (src.lastSeen ?? src.last_seen ?? '').toString()
    };
  }, []);

  const [localStateVersion, setLocalStateVersion] = React.useState(0);

  React.useEffect(() => {
    const syncLocalMessagesState = () => {
      setLocalStateVersion((v) => v + 1);
    };

    const storageKey = `vibes_messages_state_${String(currentUser?.id || 'guest')}`;

    const onStorage = (event) => {
      if (!event?.key || event.key === storageKey) {
        syncLocalMessagesState();
      }
    };

    const onFocus = () => syncLocalMessagesState();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncLocalMessagesState();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser?.id]);

  const localState = React.useMemo(() => {
    return readLocalMessagesState(currentUser?.id);
  }, [currentUser?.id, localStateVersion]);

  const mergedInboxConversations = React.useMemo(() => {
    return mergeInboxConversations(conversations, localState?.conversations || []);
  }, [conversations, localState]);

  const activeConversationRef = React.useRef(activeConversation);
  const activeConversationVibeRef = React.useRef(activeConversationVibe);
  const mergedInboxConversationsRef = React.useRef(mergedInboxConversations);
  const localConversationsRef = React.useRef(localState?.conversations || []);

  React.useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  React.useEffect(() => {
    activeConversationVibeRef.current = activeConversationVibe;
  }, [activeConversationVibe]);

  React.useEffect(() => {
    mergedInboxConversationsRef.current = mergedInboxConversations;
  }, [mergedInboxConversations]);

  React.useEffect(() => {
    localConversationsRef.current = localState?.conversations || [];
  }, [localState]);

  React.useEffect(() => {
    const handleMessagesUpdated = async (event) => {
      const detail = event?.detail || {};
      if (!currentUser?.id) return;
      if (detail?.userId && String(detail.userId) !== String(currentUser.id)) return;

      const activeNow = activeConversationRef.current;
      const activeNowVibe = activeConversationVibeRef.current;

      const activeOtherUserId = String(
        activeNow?.otherUser?.id ||
        activeNowVibe?.id ||
        activeNowVibe?.userId ||
        ''
      );

      const updatedOtherUserId = String(detail?.otherUserId || '');

      const sameOpenUser =
        activeOtherUserId &&
        updatedOtherUserId &&
        activeOtherUserId === updatedOtherUserId;

      const sameOpenConversation =
        activeNow?.id &&
        detail?.conversationId &&
        String(activeNow.id) === String(detail.conversationId);

      if (sameOpenUser || sameOpenConversation) {
        const localConversation =
          getLocalConversationByOtherUser(currentUser.id, updatedOtherUserId) ||
          (localConversationsRef.current || []).find(
            (item) => String(item?.id || '') === String(detail?.conversationId || '')
          ) ||
          null;

        if (localConversation) {
          setActiveConversation(localConversation);
          setMessages(Array.isArray(localConversation.messages) ? localConversation.messages : []);
        }

        if (detail?.conversationId) {
          markConversationReadLocal(currentUser.id, detail.conversationId);
        }
      }

      fetchConversationsRef.current?.();
    };

    window.addEventListener('vibes:messages-updated', handleMessagesUpdated);

    return () => {
      window.removeEventListener('vibes:messages-updated', handleMessagesUpdated);
    };
  }, [currentUser?.id]);

  const buildConversationShellFromMessage = React.useCallback((msg) => {
    const currentActiveConversation = activeConversationRef.current;
    const currentActiveConversationVibe = activeConversationVibeRef.current;
    const currentMergedInbox = mergedInboxConversationsRef.current || [];

    const otherUserId =
      String(msg?.sender_id || '') === String(currentUser?.id)
        ? String(currentActiveConversation?.otherUser?.id || currentActiveConversationVibe?.id || '')
        : String(msg?.sender_id || '');

    const existing =
      currentMergedInbox.find((item) => String(item?.otherUser?.id || '') === otherUserId) ||
      getLocalConversationByOtherUser(currentUser?.id, otherUserId);

    if (existing) return existing;

    return {
      id: msg?.conversation_id,
      unreadCount: 0,
      last_message: msg?.body || '',
      last_message_at: normalizeIso(msg.created_at),
      messages: [],
      otherUser: {
        id: otherUserId,
        display_name:
          currentActiveConversation?.otherUser?.display_name ||
          currentActiveConversationVibe?.displayName ||
          'Vibe',
        avatar_url:
          currentActiveConversation?.otherUser?.avatar_url ||
          currentActiveConversationVibe?.avatarUrl ||
          '',
        city:
          currentActiveConversation?.otherUser?.city ||
          currentActiveConversationVibe?.city ||
          '',
        bio:
          currentActiveConversation?.otherUser?.bio ||
          currentActiveConversationVibe?.bio ||
          '',
        birth_date:
          currentActiveConversation?.otherUser?.birth_date ||
          currentActiveConversationVibe?.birthday ||
          '',
        looking_for:
          currentActiveConversation?.otherUser?.looking_for ||
          currentActiveConversationVibe?.lookingFor ||
          [],
        energy:
          currentActiveConversation?.otherUser?.energy ||
          currentActiveConversationVibe?.energy ||
          'Vibes',
        is_online:
          currentActiveConversation?.otherUser?.is_online ||
          currentActiveConversationVibe?.isOnline ||
          false,
        last_seen:
          currentActiveConversation?.otherUser?.last_seen ||
          currentActiveConversationVibe?.lastSeen ||
          null
      }
    };
  }, [currentUser?.id]);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isMenuOpen]);

  const getConversationIdWithUser = React.useCallback(async (otherUserId) => {
    if (!supabase || !currentUser?.id || !otherUserId) return null;

    const { data: myRows, error: myRowsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id);

    if (myRowsError) throw myRowsError;

    const ids = Array.from(new Set((myRows || []).map((row) => row.conversation_id).filter(Boolean)));
    if (!ids.length) return null;

    const { data: otherRows, error: otherRowsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', ids);

    if (otherRowsError) throw otherRowsError;

    return (otherRows || [])[0]?.conversation_id || null;
  }, [supabase, currentUser?.id]);

  const createConversationWithUser = React.useCallback(async (otherUserId) => {
    const existingId = await getConversationIdWithUser(otherUserId);
    if (existingId) return existingId;

    const { data: createdConversation, error: createError } = await supabase
      .from('conversations')
      .insert({})
      .select('id, created_at')
      .single();

    if (createError) throw createError;

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: createdConversation.id, user_id: currentUser.id },
        { conversation_id: createdConversation.id, user_id: otherUserId }
      ]);

    if (participantsError) throw participantsError;

    return createdConversation.id;
  }, [supabase, currentUser?.id, getConversationIdWithUser]);

  const fetchRequests = React.useCallback(async () => {
    if (!supabase || !currentUser?.id) return;

    try {
      const { data: incoming } = await supabase
        .from('connection_requests')
        .select('*, sender:profiles!connection_requests_sender_id_fkey(*)')
        .eq('recipient_id', currentUser.id)
        .eq('status', 'pending');

      const { data: outgoing } = await supabase
        .from('connection_requests')
        .select('*, recipient:profiles!connection_requests_recipient_id_fkey(*)')
        .eq('sender_id', currentUser.id)
        .eq('status', 'pending');

      setIncomingRequests(incoming || []);
      setOutgoingRequests(outgoing || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  }, [supabase, currentUser?.id]);

  const fetchConversations = React.useCallback(async () => {
    if (!supabase || !currentUser?.id) return;

    const insideThread = !!activeConversationRef.current || !!activeConversationVibeRef.current;
    if (!insideThread) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data: participantRows, error: participantRowsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);

      if (participantRowsError) throw participantRowsError;

      const conversationIds = Array.from(
        new Set((participantRows || []).map((row) => row.conversation_id).filter(Boolean))
      ).filter((id) => !hiddenConversationIds.includes(id));

      if (!conversationIds.length) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (allParticipantsError) throw allParticipantsError;

      const otherUserIds = Array.from(
        new Set(
          (allParticipants || [])
            .filter((row) => row.user_id && row.user_id !== currentUser.id)
            .map((row) => row.user_id)
        )
      ).filter((id) => !blockedUserIds.includes(id));

      if (!otherUserIds.length) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, city, bio, birth_date, looking_for, updated_at')
        .in('id', otherUserIds);

      if (profilesError) throw profilesError;

      const { data: latestMessages, error: latestError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (latestError) throw latestError;

      const latestByConversation = {};
      (latestMessages || []).forEach((msg) => {
        if (!latestByConversation[msg.conversation_id]) latestByConversation[msg.conversation_id] = msg;
      });

      const freshLocalState = readLocalMessagesState(currentUser?.id);
      const freshLocalConversations = Array.isArray(freshLocalState?.conversations)
        ? freshLocalState.conversations
        : [];

      const nextConversations = conversationIds
        .map((conversationId) => {
          const group = (allParticipants || []).filter((row) => row.conversation_id === conversationId);
          const otherParticipant = group.find((row) => row.user_id && row.user_id !== currentUser.id);
          if (!otherParticipant?.user_id) return null;

          const profile = (profiles || []).find((p) => p.id === otherParticipant.user_id);
          if (!profile) return null;

          const latest = latestByConversation[conversationId] || null;
          const localExisting = freshLocalConversations.find((item) => item?.id === conversationId);

          const rawAvatar =
            typeof profile.avatar_url === 'string' && profile.avatar_url.trim()
              ? profile.avatar_url.trim()
              : (
                  localExisting?.otherUser?.avatar_url ||
                  localExisting?.otherUser?.avatarUrl ||
                  ''
                ).toString().trim();

          const bustedAvatar = rawAvatar
            ? `${rawAvatar}${rawAvatar.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(profile.updated_at || latest?.created_at || Date.now()))}`
            : '';

          const dbConversation = {
            id: conversationId,
            created_at: latest?.created_at || localExisting?.created_at || null,
            unreadCount: Number(localExisting?.unreadCount || 0),
            last_message: latest?.body || localExisting?.last_message || '',
            last_message_at: latest?.created_at || localExisting?.last_message_at || null,
            messages: Array.isArray(localExisting?.messages) ? localExisting.messages : [],
            otherUser: {
              id: profile.id,
              display_name: profile.display_name || localExisting?.otherUser?.display_name || 'Vibe',
              avatar_url: bustedAvatar,
              avatarUrl: bustedAvatar,
              city: profile.city || localExisting?.otherUser?.city || '',
              bio: profile.bio || localExisting?.otherUser?.bio || '',
              birth_date: profile.birth_date || localExisting?.otherUser?.birth_date || '',
              birthday: profile.birth_date || localExisting?.otherUser?.birth_date || '',
              looking_for: profile.looking_for || localExisting?.otherUser?.looking_for || [],
              lookingFor: profile.looking_for || localExisting?.otherUser?.looking_for || [],
              energy: localExisting?.otherUser?.energy || 'Vibes',
              is_online: false,
              last_seen: profile.updated_at || null
            }
          };

          upsertLocalConversation(currentUser?.id, dbConversation);
          return dbConversation;
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aTime = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const bTime = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return bTime - aTime;
        });

      setConversations(nextConversations);
      setLocalStateVersion((v) => v + 1);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (!insideThread) setError('Failed to load conversations');
    } finally {
      if (!insideThread) setIsLoading(false);
    }
  }, [supabase, currentUser?.id, hiddenConversationIds, blockedUserIds]);

  React.useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  const fetchMessages = React.useCallback(async (conversation) => {
    if (!supabase || !conversation?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const nextMessages = data || [];
      setMessages(nextMessages);
      setError(null);
      setConversations((prev) =>
        prev.map((item) => item?.id === conversation.id ? { ...item, unreadCount: 0, messages: nextMessages } : item)
      );
      markConversationReadLocal(currentUser?.id, conversation.id);
      upsertLocalConversation(currentUser?.id, { ...conversation, unreadCount: 0, messages: nextMessages });
    } catch (err) {
      console.error('Error fetching messages:', err);
      const localExisting = getLocalConversationByOtherUser(currentUser?.id, conversation?.otherUser?.id);
      if (localExisting) {
        setMessages(Array.isArray(localExisting.messages) ? localExisting.messages : []);
        setError(null);
      }
    }
  }, [supabase, currentUser?.id]);

  React.useEffect(() => {
    if (activeConversationVibe) {
      const normalized = normalizeDemoUserForChat(activeConversationVibe);
      if (!normalized) return;

      const patchConversationAvatar = (conversation) => {
        if (!conversation) return conversation;

        const currentOtherUser = conversation.otherUser || {};
        const normalizedAvatarBase =
          (
            normalized.avatarUrl ||
            currentOtherUser.avatar_url ||
            currentOtherUser.avatarUrl ||
            ''
          ).toString().trim();

        const normalizedAvatar =
          normalizedAvatarBase
            ? `${normalizedAvatarBase}${normalizedAvatarBase.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(Date.now()))}`
            : '';

        const nextDisplayName =
          (
            normalized.displayName ||
            currentOtherUser.display_name ||
            currentOtherUser.displayName ||
            'Vibe'
          ).toString().trim() || 'Vibe';

        const nextCity =
          (
            normalized.city ||
            currentOtherUser.city ||
            ''
          ).toString();

        const nextBio =
          (
            normalized.bio ||
            currentOtherUser.bio ||
            ''
          ).toString();

        const nextBirthDate =
          (
            normalized.birthday ||
            currentOtherUser.birth_date ||
            currentOtherUser.birthday ||
            ''
          ).toString();

        const nextLookingForRaw =
          normalized.lookingFor ||
          currentOtherUser.looking_for ||
          currentOtherUser.lookingFor ||
          [];

        const nextLookingFor = Array.isArray(nextLookingForRaw)
          ? nextLookingForRaw
          : (nextLookingForRaw ? [nextLookingForRaw] : []);

        return {
          ...conversation,
          otherUser: {
            ...currentOtherUser,
            id: normalized.id || currentOtherUser.id,
            display_name: nextDisplayName,
            displayName: nextDisplayName,
            avatar_url: normalizedAvatar,
            avatarUrl: normalizedAvatar,
            city: nextCity,
            bio: nextBio,
            birth_date: nextBirthDate,
            birthday: nextBirthDate,
            looking_for: nextLookingFor,
            lookingFor: nextLookingFor,
            energy: normalized.energy || currentOtherUser.energy || 'Chill',
            is_online:
              typeof currentOtherUser.is_online === 'boolean'
                ? currentOtherUser.is_online
                : !!normalized.isOnline,
            last_seen: currentOtherUser.last_seen || normalized.lastSeen || null
          }
        };
      };

      const currentActive = activeConversationRef.current;
      const mergedInbox = mergedInboxConversationsRef.current || [];

      if (currentActive?.otherUser?.id === normalized.id) {
        const patchedActive = patchConversationAvatar(currentActive);
        const activeAvatarBefore = (
          currentActive?.otherUser?.avatar_url ||
          currentActive?.otherUser?.avatarUrl ||
          ''
        ).toString().trim();
        const activeAvatarAfter = (
          patchedActive?.otherUser?.avatar_url ||
          patchedActive?.otherUser?.avatarUrl ||
          ''
        ).toString().trim();

        if (activeAvatarAfter && activeAvatarAfter !== activeAvatarBefore) {
          setActiveConversation(patchedActive);
          upsertLocalConversation(currentUser?.id, {
            ...patchedActive,
            messages: Array.isArray(messages) ? messages : []
          });
        }
        return;
      }

      const existing = mergedInbox.find((item) => item?.otherUser?.id === normalized.id);
      if (existing) {
        const patchedExisting = patchConversationAvatar(existing);
        setActiveConversation(patchedExisting);
        setMessages(Array.isArray(patchedExisting?.messages) ? patchedExisting.messages : []);
        setError(null);
        setIsMenuOpen(false);

        upsertLocalConversation(currentUser?.id, patchedExisting);
        fetchMessages(patchedExisting);
        return;
      }

      const localExisting = getLocalConversationByOtherUser(currentUser?.id, normalized.id);
      if (localExisting) {
        const patchedLocal = patchConversationAvatar(localExisting);
        setActiveConversation(patchedLocal);
        setMessages(Array.isArray(patchedLocal.messages) ? patchedLocal.messages : []);
        setError(null);
        setIsMenuOpen(false);

        upsertLocalConversation(currentUser?.id, patchedLocal);
        return;
      }

      const tempConversation = {
        id: `pending_${currentUser?.id || 'me'}_${normalized.id}`,
        unreadCount: 0,
        last_message: '',
        last_message_at: null,
        messages: [],
        otherUser: {
          id: normalized.id,
          display_name: normalized.displayName,
          displayName: normalized.displayName,
          avatar_url: normalized.avatarUrl,
          avatarUrl: normalized.avatarUrl,
          city: normalized.city,
          bio: normalized.bio,
          birth_date: normalized.birthday,
          birthday: normalized.birthday,
          looking_for: normalized.lookingFor,
          lookingFor: normalized.lookingFor,
          energy: normalized.energy,
          is_online: normalized.isOnline,
          last_seen: normalized.lastSeen
        },
        isPending: true
      };

      setActiveConversation(tempConversation);
      setMessages([]);
      setError(null);
      setIsMenuOpen(false);
      return;
    }

    if (supabase) {
      setActiveConversation(null);
      setMessages([]);
      setIsMenuOpen(false);
      fetchConversations();
      fetchRequests();
    } else {
      setIsLoading(false);
    }
  }, [
    activeConversationVibe,
    supabase,
    currentUser?.id,
    fetchMessages,
    fetchConversations,
    fetchRequests,
    normalizeDemoUserForChat
  ]);

  React.useEffect(() => {
    if (!supabase || !currentUser?.id) return;

    const channel = supabase
      .channel(`messages_realtime_${currentUser.id}`)

      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload?.new;
          if (!msg?.conversation_id || !msg?.id) return;

          const currentActiveConversation = activeConversationRef.current;
          const mergedInbox = mergedInboxConversationsRef.current || [];
          const localConversations = localConversationsRef.current || [];

          const isMine = String(msg.sender_id || '') === String(currentUser.id);
          const isOpenThread = String(currentActiveConversation?.id || '') === String(msg.conversation_id);

          if (isOpenThread) {
            setMessages((prev) => {
              const alreadyExists = (prev || []).some((item) => item?.id === msg.id);
              if (alreadyExists) return prev;

              const optimisticMatch = (prev || []).find(
                (item) =>
                  item?.optimistic === true &&
                  String(item?.sender_id || '') === String(msg.sender_id || '') &&
                  String(item?.body || '').trim() === String(msg.body || '').trim()
              );

              const next = optimisticMatch
                ? replaceOptimisticMessage(prev, optimisticMatch.id, msg)
                : [...(prev || []), msg];

              const shell = buildConversationShellFromMessage(msg);
              upsertLocalConversation(currentUser.id, {
                ...shell,
                id: msg.conversation_id,
                unreadCount: 0,
                last_message: msg.body || '',
                last_message_at: normalizeIso(msg.created_at),
                messages: next
              });

              return next;
            });

            if (!isMine) {
              try {
                await supabase
                  .from('messages')
                  .update({ read_at: new Date().toISOString() })
                  .eq('id', msg.id);
              } catch (e) {}
            }

            fetchConversations();
            return;
          }

          const targetConversation =
            mergedInbox.find((item) => item?.id === msg.conversation_id) ||
            localConversations.find((item) => item?.id === msg.conversation_id) ||
            buildConversationShellFromMessage(msg);

          const nextUnread = isMine ? 0 : Number(targetConversation?.unreadCount || 0) + 1;

          appendLocalMessage(
            currentUser.id,
            {
              ...targetConversation,
              id: msg.conversation_id,
              unreadCount: nextUnread,
              last_message: msg.body || '',
              last_message_at: normalizeIso(msg.created_at)
            },
            msg,
            { unreadCount: nextUnread }
          );

          if (!isMine && lastPlayedMessageIdRef.current !== msg.id) {
            lastPlayedMessageIdRef.current = msg.id;
            playInboxSound();
          }

          fetchConversations();
        }
      )

      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload?.new;
          if (!msg?.conversation_id || !msg?.id) return;

          const currentActiveConversation = activeConversationRef.current;

          if (String(currentActiveConversation?.id || '') === String(msg.conversation_id)) {
            setMessages((prev) =>
              (prev || []).map((item) => (item?.id === msg.id ? { ...item, ...msg } : item))
            );
          }

          fetchConversations();
        }
      )

      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connection_requests' },
        () => {
          fetchRequests();
        }
      )

      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('[messages realtime]', status);
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [
    supabase,
    currentUser?.id,
    fetchConversations,
    fetchRequests,
    buildConversationShellFromMessage,
    playInboxSound
  ]);

  const sendMessage = async () => {
    if (!activeConversation || !newMessage.trim() || isSending || !currentUser?.id) return;

    setIsSending(true);
    const body = newMessage.trim();
    const otherUserId = activeConversation?.otherUser?.id || null;
    const uuidLike = (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
    const isTemporaryConversation =
      !!activeConversation?.isPending || String(activeConversation?.id || '').startsWith('pending_');

    let optimisticMessage = null;

    try {
      if (!supabase || !uuidLike(otherUserId)) {
        const localMessage = {
          id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          conversation_id: activeConversation.id,
          sender_id: currentUser.id,
          body,
          created_at: new Date().toISOString()
        };

        const nextMessages = [...messages, localMessage];
        setMessages(nextMessages);
        setNewMessage('');
        setError(null);

        upsertLocalConversation(currentUser.id, {
          ...activeConversation,
          unreadCount: 0,
          last_message: body,
          last_message_at: localMessage.created_at,
          messages: nextMessages
        });
        return;
      }

      let conversationId = activeConversation.id;
      let realConversation = activeConversation;

      if (isTemporaryConversation) {
        conversationId = await createConversationWithUser(otherUserId);
        realConversation = { ...activeConversation, id: conversationId, isPending: false };
        setActiveConversation(realConversation);
      }

      optimisticMessage = buildOptimisticMessage({
        conversationId,
        senderId: currentUser.id,
        body
      });

      const optimisticMessages = [...messages, optimisticMessage];

      setMessages(optimisticMessages);
      setNewMessage('');
      setError(null);

      upsertLocalConversation(currentUser.id, {
        ...realConversation,
        id: conversationId,
        unreadCount: 0,
        last_message: body,
        last_message_at: optimisticMessage.created_at,
        messages: optimisticMessages
      });

      const insertPayload = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        body
      };

      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) throw insertError;

      const finalMessages = replaceOptimisticMessage(
        [...optimisticMessages],
        optimisticMessage.id,
        inserted
      );

      setMessages(finalMessages);

      upsertLocalConversation(currentUser.id, {
        ...realConversation,
        id: conversationId,
        unreadCount: 0,
        last_message: body,
        last_message_at: inserted?.created_at || optimisticMessage.created_at,
        messages: finalMessages
      });

      try {
        await supabase
          .from('conversations')
          .update({
            last_message: body,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      } catch (e) {}

      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);

      if (optimisticMessage?.id) {
        setMessages((prev) => (prev || []).filter((item) => item?.id !== optimisticMessage.id));
      }

      setError(err?.message || 'Message not sent');
      setTimeout(() => setError(null), 2500);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusText = (vibe) => {
    if (!vibe) return '';
    if (vibe.is_online) return 'Live now';
    if (!vibe.last_seen) return 'Seen recently';
    const lastSeen = new Date(vibe.last_seen);
    const now = new Date();
    const diffMins = Math.floor((now - lastSeen) / 60000);
    if (diffMins < 5) return 'Active recently';
    if (diffMins < 60) return `Seen ${diffMins}m ago`;
    if (diffMins < 1440) return `Seen ${Math.floor(diffMins / 60)}h ago`;
    return 'Seen recently';
  };

  const isEmptyInbox =
    !activeConversationVibe &&
    mergedInboxConversations.length === 0 &&
    incomingRequests.length === 0 &&
    outgoingRequests.length === 0;

  if (isLoading && !activeConversation && !activeConversationVibe && mergedInboxConversations.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return html`
      <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-white/40 text-xs font-bold tracking-widest uppercase">Loading vibes...</div>
      </div>
    `;
  }

  if (activeConversation) {
    const otherUser = activeConversation.otherUser;

    return html`
      <div
        className="animate-fade-in relative"
        style=${{
          height: '100%',
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          overflow: 'hidden',
          paddingBottom: '0'
        }}
      >
        <div
          className="shrink-0 mb-1 px-1 pt-1 pb-2"
          style=${{
            borderBottom: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick=${() => {
                setActiveConversation(null);
                setMessages([]);
                setIsMenuOpen(false);
                markConversationReadLocal(currentUser?.id, activeConversation?.id);
                onBackToInbox();
              }}
              className="h-9 w-9 rounded-full border border-white/6 bg-white/[0.025] text-white/35 hover:text-white/70 tap-feedback flex items-center justify-center"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <button
              onClick=${() => onViewProfile?.({
                id: otherUser.id,
                displayName: otherUser.display_name,
                avatarUrl: otherUser.avatar_url,
                city: otherUser.city,
                bio: otherUser.bio,
                birthday: otherUser.birth_date,
                lookingFor: otherUser.looking_for,
                isOnline: otherUser.is_online,
                lastSeen: otherUser.last_seen,
                energy: otherUser.energy
              })}
              className="h-11 w-11 rounded-full overflow-hidden border border-white/10 bg-white/[0.04] shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex items-center justify-center text-sm font-black text-white shrink-0 tap-feedback"
            >
              ${otherUser.avatar_url
                ? html`<img src=${otherUser.avatar_url} className="w-full h-full object-cover" />`
                : otherUser.display_name?.charAt(0)}
            </button>

            <div className="flex-1 min-w-0">
              <button
                onClick=${() => onViewProfile?.({
                  id: otherUser.id,
                  displayName: otherUser.display_name,
                  avatarUrl: otherUser.avatar_url,
                  city: otherUser.city,
                  bio: otherUser.bio,
                  birthday: otherUser.birth_date,
                  lookingFor: otherUser.looking_for,
                  isOnline: otherUser.is_online,
                  lastSeen: otherUser.last_seen,
                  energy: otherUser.energy
                })}
                className="block text-left max-w-full tap-feedback"
              >
                <h3 className="text-[15px] font-black text-white truncate tracking-tight">${otherUser.display_name}</h3>
              </button>

              <div className="flex items-center gap-2 mt-[2px]">
                <div className=${`h-[6px] w-[6px] rounded-full ${
                  otherUser.is_online
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    : 'bg-white/20'
                }`}></div>

                <span className="text-[10px] text-white/30 font-semibold tracking-wide">
                  ${getStatusText(otherUser)}
                </span>
              </div>
            </div>

            <div className="relative" ref=${menuRef}>
              <button
                onClick=${() => setIsMenuOpen((prev) => !prev)}
                className="h-9 w-9 rounded-full border border-white/6 bg-white/[0.025] text-white/35 hover:text-white/70 tap-feedback flex items-center justify-center"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>

              ${isMenuOpen && html`
                <div
                  className="absolute top-11 right-0 w-[190px] rounded-[22px] overflow-hidden z-50"
                  style=${{
                    background: 'linear-gradient(180deg, rgba(17,24,52,0.96), rgba(8,13,34,0.96))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)'
                  }}
                >
                  <button
                    onClick=${() => { onReportUser(otherUser.id); setIsMenuOpen(false); }}
                    className="w-full px-5 py-4 text-left text-[14px] font-black text-white/78 hover:bg-white/[0.04]"
                  >
                    Report
                  </button>

                  <div className="h-px bg-white/[0.05] mx-4"></div>

                  <button
                    onClick=${() => { onBlockUser(otherUser.id); setIsMenuOpen(false); }}
                    className="w-full px-5 py-4 text-left text-[14px] font-black text-rose-400 hover:bg-rose-500/[0.05]"
                  >
                    Block
                  </button>

                  <div className="h-px bg-white/[0.05] mx-4"></div>

                  <button
                    onClick=${() => { onRemoveConversation(activeConversation.id); setIsMenuOpen(false); }}
                    className="w-full px-5 py-4 text-left text-[14px] font-black text-white/42 hover:bg-white/[0.04]"
                  >
                    Remove
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>

        <div
          className="pr-1 scrollbar-hide"
          style=${{
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingBottom: '88px',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          ${messages.length === 0 ? html`
            <div
              className="flex flex-col items-center text-center px-7"
              style=${{
                flex: '1 1 auto',
                justifyContent: 'center',
                transform: 'translateY(20px)'
              }}
            >
              <div
                className="mb-5 h-16 w-16 rounded-[20px] flex items-center justify-center"
                style=${{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.22)'
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <p className="text-[18px] font-black text-white/94 mb-2 tracking-tight">Start the conversation</p>
              <p className="text-[13px] text-white/34 leading-relaxed max-w-[260px]">
                Send a friendly vibe to ${otherUser.display_name} to get things moving.
              </p>
            </div>
          ` : html`
            <div className="space-y-3 px-[2px]">
              ${messages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;
                return html`
                  <div key=${msg.id} className=${`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className=${`max-w-[82%] px-4 py-3 text-[15px] leading-relaxed ${
                        isMe ? 'text-white rounded-[22px] rounded-tr-[10px]' : 'text-white/92 rounded-[22px] rounded-tl-[10px]'
                      }`}
                      style=${isMe
                        ? {
                            background: 'linear-gradient(180deg, rgba(76,134,255,0.98), rgba(36,94,235,0.96))',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 16px 36px rgba(37,99,235,0.28), 0 0 24px rgba(59,130,246,0.14)'
                          }
                        : {
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                            border: '1px solid rgba(255,255,255,0.09)',
                            boxShadow: '0 12px 28px rgba(0,0,0,0.22)'
                          }
                      }
                    >
                      ${msg.body}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <span className="text-[9px] uppercase font-black tracking-[0.22em] text-white/18">
                        ${isMe ? 'Sent' : ''}
                      </span>
                      <span className="text-[10px] font-semibold text-white/20">
                        ${formatChatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                `;
              })}
              <div ref=${messagesEndRef}></div>
            </div>
          `}
        </div>

        <div
          style=${{
            paddingTop: '10px',
            paddingBottom: '0px',
            marginBottom: '20px'
          }}
        >
          ${error && html`
            <div className="mb-2 text-center">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.18em]">${error}</span>
            </div>
          `}

          <div
            className="flex items-end gap-2"
            style=${{
              minHeight: '52px'
            }}
          >
            <div
              className="flex-1 min-w-0 rounded-[22px]"
              style=${{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.028))',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 14px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)',
                padding: '13px 16px'
              }}
            >
              <textarea
                value=${newMessage}
                onInput=${(e) => {
                  setNewMessage(e.currentTarget.value);

                  try {
                    e.currentTarget.style.height = '22px';
                    const nextHeight = Math.min(Math.max(e.currentTarget.scrollHeight, 22), 96);
                    e.currentTarget.style.height = `${nextHeight}px`;
                  } catch (err) {}
                }}
                onFocus=${(e) => {
                  try {
                    e.currentTarget.style.height = '22px';
                    const nextHeight = Math.min(Math.max(e.currentTarget.scrollHeight, 22), 96);
                    e.currentTarget.style.height = `${nextHeight}px`;
                    window.dispatchEvent(new CustomEvent('vibes:composer-focus'));
                  } catch (err) {}
                }}
                onBlur=${() => {
                  try {
                    window.dispatchEvent(new CustomEvent('vibes:composer-blur'));
                  } catch (err) {}
                }}
                onKeyDown=${(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage?.();
                  }
                }}
                rows="1"
                placeholder="Type a message..."
                autocomplete="off"
                autocorrect="off"
                autocapitalize="sentences"
                spellcheck="false"
                inputmode="text"
                enterkeyhint="send"
                name="vibes_message_body"
                data-lpignore="true"
                data-form-type="other"
                className="w-full resize-none bg-transparent text-white placeholder:text-white/38 outline-none border-0 shadow-none overflow-y-auto"
                style=${{
                  minHeight: '22px',
                  maxHeight: '96px',
                  lineHeight: '22px',
                  fontSize: '17px',
                  fontWeight: '500',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              ></textarea>
            </div>

            <button
              onClick=${sendMessage}
              disabled=${!newMessage.trim() || isSending}
              className="h-12 w-12 rounded-[18px] flex items-center justify-center transition-all tap-feedback shrink-0"
              style=${newMessage.trim() && !isSending
                ? {
                    background: 'linear-gradient(180deg, rgba(76,134,255,0.98), rgba(36,94,235,0.96))',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 16px 32px rgba(37,99,235,0.30), 0 0 22px rgba(59,130,246,0.16)',
                    color: '#fff'
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
                    color: 'rgba(255,255,255,0.20)'
                  }
              }
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div
      className=${`flex flex-col animate-fade-in ${isEmptyInbox ? 'vibes-messages-empty' : 'h-full'}`}
      style=${{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <div
        className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide"
        style=${{
          minHeight: 0,
          paddingBottom: '120px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        ${null}

        ${isEmptyInbox ? html`
          <div
            className="vibes-messages-empty-content flex flex-col items-center text-center"
            style=${{
              height: '100%',
              justifyContent: 'center',
              transform: 'translateY(2px)'
            }}
          >
            <div
              className="mb-5 h-16 w-16 rounded-[20px] flex items-center justify-center"
              style=${{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 18px 44px rgba(0,0,0,0.22)'
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-[20px] font-black text-white/95 tracking-tight leading-none">No active chats yet.</h3>
              <p className="text-[13px] text-white/34 leading-[1.45] max-w-[220px] mx-auto">
                Start connecting with nearby vibes.
              </p>
            </div>

            <button
              onClick=${() => { onClose?.(); window.setTimeout(() => onGoToMap?.(), 220); }}
              className="mt-6 px-9 h-11 rounded-full text-[12px] font-black text-white/92 tap-feedback transition-all"
              style=${{
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                boxShadow: '0 14px 28px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)'
              }}
            >
              Start Chatting
            </button>
          </div>
        ` : mergedInboxConversations.map((conv) => {
          const hasUnread = Number(conv.unreadCount || 0) > 0;
          return html`
            <button
              key=${conv.id}
              onClick=${() => onSelectConversation({
                id: conv.otherUser.id,
                displayName: conv.otherUser.display_name,
                energy: conv.otherUser.energy,
                isOnline: conv.otherUser.is_online,
                lastSeen: conv.otherUser.last_seen,
                avatarUrl: conv.otherUser.avatar_url,
                city: conv.otherUser.city,
                bio: conv.otherUser.bio,
                birthday: conv.otherUser.birth_date || conv.otherUser.birthday,
                lookingFor: conv.otherUser.looking_for || []
              })}
              className="w-full p-4 rounded-[24px] transition-all duration-200 active:scale-[0.988] tap-feedback text-left flex items-center gap-4"
              style=${hasUnread
                ? {
                    background: 'linear-gradient(180deg, rgba(44,96,225,0.13), rgba(255,255,255,0.03))',
                    border: '1px solid rgba(59,130,246,0.18)',
                    boxShadow: '0 18px 44px rgba(0,0,0,0.22), 0 0 22px rgba(59,130,246,0.06)'
                  }
                : {
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 14px 36px rgba(0,0,0,0.18)'
                  }
              }
            >
              <div className="relative shrink-0">
                <div
                  className="h-13 w-13 rounded-full overflow-hidden flex items-center justify-center text-[22px] font-black text-white"
                  style=${{
                    width: '52px',
                    height: '52px',
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.20)'
                  }}
                >
                  ${conv.otherUser.avatar_url
                    ? html`<img src=${conv.otherUser.avatar_url} className="w-full h-full object-cover" />`
                    : conv.otherUser.display_name?.charAt(0)}
                </div>

                ${hasUnread && html`
                  <div
                    className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                    style=${{
                      background: 'linear-gradient(180deg, rgba(76,134,255,0.98), rgba(36,94,235,0.96))',
                      border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: '0 0 14px rgba(59,130,246,0.45)'
                    }}
                  >
                    ${conv.unreadCount}
                  </div>
                `}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <h4 className=${`text-[16px] truncate tracking-tight ${hasUnread ? 'font-black text-white' : 'font-bold text-white/92'}`}>
                    ${conv.otherUser.display_name}
                  </h4>
                  <span className="text-[11px] text-white/24 font-semibold tracking-[0.02em] shrink-0">
                    ${formatChatTime(conv.last_message_at)}
                  </span>
                </div>

                <p className=${`text-[13px] truncate ${hasUnread ? 'text-white/78 font-semibold' : 'text-white/40'}`}>
                  ${conv.last_message || `Start a conversation with ${conv.otherUser.display_name}`}
                </p>
              </div>
            </button>
          `;
        })}
      </div>
    </div>
  `;
}
