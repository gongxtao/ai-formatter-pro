import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
}
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

export function createServerSupabaseClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!);
}

/**
 * Get effective user ID for database operations
 * Returns provided userId or generates a new anonymous UUID
 */
export function getEffectiveUserId(userId?: string | null): string {
  return userId ?? crypto.randomUUID();
}
