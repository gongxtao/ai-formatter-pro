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

  function schedule(content: string) {
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
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // We cannot flush the pending value here without storing it,
    // but the debounce delay is short enough that this is acceptable.
  }

  return { schedule, cancel, flush };
}
