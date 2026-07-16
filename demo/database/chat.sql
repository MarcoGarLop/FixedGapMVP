-- ═══════════════════════════════════════════════════════════════════════════════
-- FixedGap — Chat Module Schema
-- Execute this script in your Supabase SQL Editor to enable Realtime Chat.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            conversation_type NOT NULL,
  name            text, -- Null for direct, optional for groups
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  operator_id     uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, operator_id)
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversation_participants_operator ON conversation_participants(operator_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Only visible if the operator is a participant
CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = id AND cp.operator_id = auth.uid())
  );

-- Conversations: Any operator can create a conversation
CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (true);

-- Conversations: Only participants can update (e.g., change group name)
CREATE POLICY conversations_update ON conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = id AND cp.operator_id = auth.uid())
  );

-- Participants: Can view all participants of the conversations they belong to
CREATE POLICY participants_select ON conversation_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.operator_id = auth.uid())
  );

-- Participants: Anyone can add themselves, or add others if they are already a participant
CREATE POLICY participants_insert ON conversation_participants
  FOR INSERT WITH CHECK (
    operator_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.operator_id = auth.uid())
  );

-- Messages: Can view if the operator is a participant in the conversation
CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.operator_id = auth.uid())
  );

-- Messages: Can insert if the operator is the sender and is a participant in the conversation
CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.operator_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
-- (Assuming update_updated_at function already exists from schema.sql)
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME SETUP
-- ─────────────────────────────────────────────────────────────────────────────
-- Enable realtime for the messages table (and others if needed)
-- Note: Supabase UI might require you to enable realtime manually for the table, 
-- but this SQL ensures the publication is set if 'supabase_realtime' exists.
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table messages;
