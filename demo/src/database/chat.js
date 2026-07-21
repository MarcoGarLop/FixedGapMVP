import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

/**
 * Creates a new conversation (direct or group) and adds the participants.
 * For direct chats, checks if one already exists to avoid duplicates.
 */
export async function createConversation(type, name, participantIds) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No authenticated user' };

  const allParticipants = [...new Set([...participantIds, user.id])];

  // For direct chats, check if a conversation already exists between these two users
  if (type === 'direct' && allParticipants.length === 2) {
    const existing = await findExistingDirectChat(user.id, participantIds[0]);
    if (existing) return { ok: true, conversation: existing };
  }

  const convId = crypto.randomUUID();
  const { error: convError } = await supabase
    .from('conversations')
    .insert([{ id: convId, type, name: name || null }]);

  if (convError) return { ok: false, error: convError.message };

  const participantsData = allParticipants.map(id => ({
    conversation_id: convId,
    operator_id: id,
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participantsData);

  if (partError) return { ok: false, error: partError.message };

  return { ok: true, conversation: { id: convId, type, name } };
}

/**
 * Finds an existing direct conversation between two users.
 */
async function findExistingDirectChat(userId, otherId) {
  const { data } = await supabase
    .from('conversations')
    .select(`
      id, type,
      conversation_participants!inner ( operator_id )
    `)
    .eq('type', 'direct');

  if (!data) return null;

  for (const conv of data) {
    const pIds = conv.conversation_participants.map(p => p.operator_id);
    if (pIds.length === 2 && pIds.includes(userId) && pIds.includes(otherId)) {
      return { id: conv.id };
    }
  }
  return null;
}

/**
 * Loads all conversations for the current user with last message preview.
 */
export async function loadConversations() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, type, name, updated_at,
      conversation_participants (
        operator_id,
        hidden,
        operators ( username, display_name )
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[chat] Error loading conversations:', error);
    return [];
  }

  // Filter to only conversations where current user is a participant
  const myConvs = (data || []).filter(conv =>
    conv.conversation_participants.some(p => p.operator_id === user.id)
  );

  // Fetch last message for each conversation (batch)
  const convIds = myConvs.map(c => c.id);
  const lastMessages = await fetchLastMessages(convIds);

  return myConvs.map(conv => ({
    ...conv,
    lastMessage: lastMessages.get(conv.id) || null,
  }));
}

/**
 * Fetches the most recent message for each conversation in a single query.
 */
async function fetchLastMessages(conversationIds) {
  const map = new Map();
  if (conversationIds.length === 0) return map;

  // Supabase doesn't support DISTINCT ON, so we fetch recent messages and dedupe client-side
  const { data } = await supabase
    .from('messages')
    .select('conversation_id, content, sender_id, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(conversationIds.length * 2);

  if (data) {
    for (const msg of data) {
      if (!map.has(msg.conversation_id)) {
        map.set(msg.conversation_id, msg);
      }
    }
  }
  return map;
}

/**
 * Loads messages for a specific conversation.
 */
export async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, created_at, sender_id,
      operators ( display_name, username )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[chat] Error loading messages:', error);
    return [];
  }
  return data || [];
}

/**
 * Sends a message to a conversation.
 * Also updates conversation.updated_at for correct sort order.
 */
export async function sendMessage(conversationId, content) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: 'Empty message' };

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
    }])
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  // Touch conversation's updated_at so it sorts to top
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return { ok: true, message: data };
}

/**
 * Subscribes to new messages for conversations the user participates in.
 * Returns the channel for cleanup.
 */
export function subscribeToMessages(onNewMessage) {
  // Fix for Vite HMR: remove existing channels before subscribing again
  supabase.removeAllChannels();

  const channel = supabase
    .channel('chat_messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    }, (payload) => {
      onNewMessage(payload.new);
    })
    .subscribe();

  return channel;
}

/**
 * Fetches all operators (excluding self) for starting new chats.
 */
export async function getOperatorsList() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('operators')
    .select('id, username, display_name')
    .neq('id', user.id);

  if (error) {
    console.error('[chat] Error fetching operators:', error);
    return [];
  }
  return data || [];
}

/**
 * Hides a conversation from the current user's list.
 */
export async function hideConversation(conversationId) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('conversation_participants')
    .update({ hidden: true })
    .eq('conversation_id', conversationId)
    .eq('operator_id', user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Unhides a conversation for the current user.
 */
export async function unhideConversation(conversationId) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('conversation_participants')
    .update({ hidden: false })
    .eq('conversation_id', conversationId)
    .eq('operator_id', user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
