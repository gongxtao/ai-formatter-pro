// src/lib/ai/clarify-session-store.ts

import type { ClarifySession, ClarifyMessage } from '@/types/clarify';

// In-memory session storage
const sessions = new Map<string, ClarifySession>();

// Session TTL in milliseconds (5 minutes)
const SESSION_TTL = 5 * 60 * 1000;

/**
 * Create a new clarify session
 */
export function createSession(originalPrompt: string): ClarifySession {
  const id = generateSessionId();
  const session: ClarifySession = {
    id,
    originalPrompt,
    messages: [],
    createdAt: new Date().toISOString(),
  };
  sessions.set(id, session);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): ClarifySession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  // Check if expired
  const createdAtTime = new Date(session.createdAt).getTime();
  if (Date.now() - createdAtTime > SESSION_TTL) {
    sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

/**
 * Add a message to a session
 */
export function addMessage(sessionId: string, message: Omit<ClarifyMessage, 'id' | 'timestamp'>): boolean {
  const session = getSession(sessionId);
  if (!session) return false;

  session.messages.push({
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  });

  return true;
}

/**
 * Update session's determined category
 */
export function setSessionCategory(sessionId: string, category: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;

  session.determinedCategory = category;
  return true;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    const createdAtTime = new Date(session.createdAt).getTime();
    if (now - createdAtTime > SESSION_TTL) {
      sessions.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `clarify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 1000);
}
