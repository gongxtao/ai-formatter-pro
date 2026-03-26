import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'ai-formatter-user-id';

export function getUserId(): string {
  if (typeof window === 'undefined') return '';

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function ensureUserId(): string {
  return getUserId();
}
