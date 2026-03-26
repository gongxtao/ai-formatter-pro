-- Relax user_id constraints to support anonymous users (no auth.users entry)
-- ai_conversations: make user_id nullable, remove FK
ALTER TABLE ai_conversations
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;

-- ai_messages: already has FK via conversation_id cascade, no direct user_id
-- user_history: same approach for consistency
ALTER TABLE user_history
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS user_history_user_id_fkey;
