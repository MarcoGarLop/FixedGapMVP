import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

/**
 * Creates a new conversation (direct or group) and adds the participants.
 */
export async function createConversation(type, name, participantIds) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No authenticated user' };

  // 1. Create the conversation
  const convId = crypto.randomUUID();
  const { error: convError } = await supabase
    .from('conversations')
    .insert([{ id: convId, type, name }]);

  if (convError) return { ok: false, error: convError.message };

  // 2. Add participants (including the creator)
  const allParticipants = [...new Set([...participantIds, user.id])];
  const participantsData = allParticipants.map(id => ({
    conversation_id: convId,
    operator_id: id
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participantsData);

  if (partError) return { ok: false, error: partError.message };

  return { ok: true, conversation: { id: convId } };
}

/**
 * Loads all conversations for the current user.
 */
export async function loadConversations() {
  const user = await getCurrentUser();
  if (!user) return [];

  // Get conversations where user is a participant. 
  // RLS ensures they only see their own conversations.
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
    console.error('Error loading conversations:', error);
    alert('Error al cargar conversaciones: ' + error.message);
    return [];
  }
  
  return data;
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
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages:', error);
    return [];
  }
  return data;
}

/**
 * Sends a message to a conversation.
 */
export async function sendMessage(conversationId, content) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim()
    }])
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, message: data };
}

/**
 * Subscribes to new messages in real-time.
 * Returns the channel so it can be unsubscribed later.
 */
export function subscribeToMessages(onNewMessage) {
  const channel = supabase
    .channel('realtime_messages')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages' 
    }, (payload) => {
      onNewMessage(payload.new);
    })
    .subscribe();
    
  return channel;
}

/**
 * Fetches all operators to allow starting a new chat.
 */
export async function getOperatorsList() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('operators')
    .select('id, username, display_name')
    .neq('id', user.id); // Exclude self

  if (error) {
    console.error('Error fetching operators:', error);
    return [];
  }
  return data;
}

/**
 * Hides a conversation for the current user.
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
