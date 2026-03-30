const STORAGE_KEY = 'ai-formatter-editor-content';

export function saveToLocalStorage(content: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, content);
  } catch {
    // localStorage may be unavailable (e.g. incognito quota)
  }
}

export function loadFromLocalStorage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function createAutoSave(
  onSave: (content: string) => void,
  delay = 5000,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastContent: string | null = null;

  function schedule(content: string) {
    lastContent = content;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onSave(content);
      timeoutId = null;
    }, delay);
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function flush() {
    if (timeoutId && lastContent !== null) {
      clearTimeout(timeoutId);
      onSave(lastContent);
      timeoutId = null;
      lastContent = null;
    }
  }

  return { schedule, cancel, flush };
}
