// src/lib/ai/clarify-session-store.ts

import type { ClarifySession, ClarifyMessage } from '@/types/clarify';

// In-memory session storage
const sessions = new Map<string, ClarifySession>();

// Session TTL in milliseconds (5 minutes)
const SESSION_TTL = 5 * 60 * 1000;

// Maximum number of sessions to store (LRU eviction)
const MAX_SESSIONS = 1000;

// Cleanup interval reference
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Create a new clarify session
 */
export function createSession(originalPrompt: string): ClarifySession {
  // LRU eviction: remove oldest sessions if limit reached
  if (sessions.size >= MAX_SESSIONS) {
    // Find and remove the oldest session
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, session] of sessions) {
      const createdAtTime = new Date(session.createdAt).getTime();
      if (createdAtTime < oldestTime) {
        oldestTime = createdAtTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      sessions.delete(oldestId);
    }
  }

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
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
  return `clarify-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Start the cleanup interval
 */
export function startCleanupInterval(): void {
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(cleanupExpiredSessions, 60 * 1000);
  }
}

/**
 * Stop the cleanup interval
 */
export function stopCleanupInterval(): void {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Auto-start cleanup interval in environments that support setInterval
if (typeof setInterval !== 'undefined') {
  startCleanupInterval();
}
