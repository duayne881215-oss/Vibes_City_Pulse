export const getLocalMessagesStorageKey = (userId) => `vibes_messages_state_${String(userId || 'guest')}`;

export const readLocalMessagesState = (userId) => {
  if (typeof localStorage === 'undefined') return { conversations: [] };

  try {
    const raw = localStorage.getItem(getLocalMessagesStorageKey(userId));
    if (!raw) return { conversations: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { conversations: [] };
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : []
    };
  } catch (e) {
    return { conversations: [] };
  }
};

export const writeLocalMessagesState = (userId, nextState) => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(
      getLocalMessagesStorageKey(userId),
      JSON.stringify({
        conversations: Array.isArray(nextState?.conversations) ? nextState.conversations : []
      })
    );
  } catch (e) {}
};

const normalizeConversationShape = (conversation) => {
  if (!conversation?.id || !conversation?.otherUser?.id) return null;

  const safeMessages = Array.isArray(conversation.messages) ? conversation.messages : [];

  return {
    id: conversation.id,
    created_at: conversation.created_at || null,
    unreadCount: Number(conversation.unreadCount || 0),
    last_message:
      conversation.last_message ||
      safeMessages[safeMessages.length - 1]?.body ||
      '',
    last_message_at:
      conversation.last_message_at ||
      safeMessages[safeMessages.length - 1]?.created_at ||
      null,
    otherUser: {
      id: conversation.otherUser.id,
      display_name: conversation.otherUser.display_name || conversation.otherUser.displayName || 'Vibe',
      avatar_url: conversation.otherUser.avatar_url || conversation.otherUser.avatarUrl || '',
      city: conversation.otherUser.city || '',
      bio: conversation.otherUser.bio || '',
      birth_date: conversation.otherUser.birth_date || conversation.otherUser.birthday || '',
      looking_for: conversation.otherUser.looking_for || conversation.otherUser.lookingFor || [],
      is_online:
        typeof conversation.otherUser.is_online === 'boolean'
          ? conversation.otherUser.is_online
          : !!conversation.otherUser.isOnline,
      last_seen: conversation.otherUser.last_seen || conversation.otherUser.lastSeen || null,
      energy: conversation.otherUser.energy || 'Vibes'
    },
    messages: safeMessages
  };
};

export const upsertLocalConversation = (userId, conversation) => {
  if (!userId) return [];
  const safeConversation = normalizeConversationShape(conversation);
  if (!safeConversation) return readLocalMessagesState(userId).conversations;

  const prevState = readLocalMessagesState(userId);
  const filtered = prevState.conversations.filter((item) => item?.id !== safeConversation.id);
  const nextConversations = [safeConversation, ...filtered].sort((a, b) => {
    const aTime = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  writeLocalMessagesState(userId, { conversations: nextConversations });
  return nextConversations;
};

export const appendLocalMessage = (userId, conversation, message, options = {}) => {
  if (!userId || !conversation?.id || !message?.id) return [];
  const prevState = readLocalMessagesState(userId);
  const existing = prevState.conversations.find((item) => item?.id === conversation.id);

  const prevMessages = Array.isArray(existing?.messages)
    ? existing.messages
    : Array.isArray(conversation?.messages)
      ? conversation.messages
      : [];

  const hasMessage = prevMessages.some((item) => item?.id === message.id);
  const nextMessages = hasMessage ? prevMessages : [...prevMessages, message];

  return upsertLocalConversation(userId, {
    ...(existing || conversation),
    messages: nextMessages,
    unreadCount: Number(options.unreadCount ?? existing?.unreadCount ?? conversation?.unreadCount ?? 0),
    last_message: message.body || existing?.last_message || conversation?.last_message || '',
    last_message_at: message.created_at || existing?.last_message_at || conversation?.last_message_at || null
  });
};

export const markConversationReadLocal = (userId, conversationId) => {
  if (!userId || !conversationId) return [];
  const prevState = readLocalMessagesState(userId);
  const nextConversations = prevState.conversations.map((item) => {
    if (item?.id !== conversationId) return item;
    return { ...item, unreadCount: 0 };
  });
  writeLocalMessagesState(userId, { conversations: nextConversations });
  return nextConversations;
};

export const getLocalConversationByOtherUser = (userId, otherUserId) => {
  const state = readLocalMessagesState(userId);
  return (state.conversations || []).find((item) => item?.otherUser?.id === otherUserId) || null;
};

export const mergeInboxConversations = (dbConversations, localConversations) => {
  const map = new Map();

  (Array.isArray(dbConversations) ? dbConversations : []).forEach((item) => {
    if (!item?.id) return;
    const normalized = normalizeConversationShape(item);
    if (!normalized) return;
    map.set(item.id, normalized);
  });

  (Array.isArray(localConversations) ? localConversations : []).forEach((item) => {
    if (!item?.id) return;

    const normalizedLocal = normalizeConversationShape(item);
    if (!normalizedLocal) return;

    const existing = map.get(item.id);

    if (!existing) {
      map.set(item.id, normalizedLocal);
      return;
    }

    const existingMessages = Array.isArray(existing.messages) ? existing.messages : [];
    const localMessages = Array.isArray(normalizedLocal.messages) ? normalizedLocal.messages : [];

    map.set(item.id, {
      ...existing,
      unreadCount: Math.max(
        Number(existing.unreadCount || 0),
        Number(normalizedLocal.unreadCount || 0)
      ),
      last_message:
        existing.last_message ||
        normalizedLocal.last_message ||
        '',
      last_message_at:
        existing.last_message_at ||
        normalizedLocal.last_message_at ||
        null,
      messages: existingMessages.length ? existingMessages : localMessages,
      otherUser: {
        ...existing.otherUser,
        display_name:
          existing?.otherUser?.display_name ||
          normalizedLocal?.otherUser?.display_name ||
          'Vibe',
        avatar_url:
          existing?.otherUser?.avatar_url ||
          normalizedLocal?.otherUser?.avatar_url ||
          '',
        city:
          existing?.otherUser?.city ||
          normalizedLocal?.otherUser?.city ||
          '',
        bio:
          existing?.otherUser?.bio ||
          normalizedLocal?.otherUser?.bio ||
          '',
        birth_date:
          existing?.otherUser?.birth_date ||
          normalizedLocal?.otherUser?.birth_date ||
          '',
        looking_for:
          (Array.isArray(existing?.otherUser?.looking_for) && existing.otherUser.looking_for.length)
            ? existing.otherUser.looking_for
            : (normalizedLocal?.otherUser?.looking_for || []),
        is_online:
          typeof existing?.otherUser?.is_online === 'boolean'
            ? existing.otherUser.is_online
            : !!normalizedLocal?.otherUser?.is_online,
        last_seen:
          existing?.otherUser?.last_seen ||
          normalizedLocal?.otherUser?.last_seen ||
          null,
        energy:
          existing?.otherUser?.energy ||
          normalizedLocal?.otherUser?.energy ||
          'Vibes'
      }
    });
  });

  return Array.from(map.values()).filter(Boolean).sort((a, b) => {
    const aTime = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
};