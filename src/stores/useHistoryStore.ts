import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'ai-formatter-history';
const MAX_DOCUMENTS = 50;

export interface HistoryDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoryState {
  documents: HistoryDocument[];
  searchQuery: string;
  loadDocuments: () => void;
  saveDocument: (doc: { title: string; content: string; category: string }) => void;
  deleteDocument: (id: string) => void;
  setSearchQuery: (q: string) => void;
  filteredDocuments: () => HistoryDocument[];
}

function stripHtml(html: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return html.slice(0, 200);
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').slice(0, 200);
}

function loadFromStorage(): HistoryDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(docs: HistoryDocument[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  documents: [],
  searchQuery: '',

  loadDocuments: () => {
    set({ documents: loadFromStorage() });
  },

  saveDocument: (doc) => {
    const { documents } = get();
    const now = new Date().toISOString();
    const newDoc: HistoryDocument = {
      id: uuidv4(),
      title: doc.title,
      category: doc.category,
      content: doc.content,
      thumbnail: stripHtml(doc.content),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newDoc, ...documents].slice(0, MAX_DOCUMENTS);
    saveToStorage(updated);
    set({ documents: updated });
  },

  deleteDocument: (id) => {
    const { documents } = get();
    const updated = documents.filter((d) => d.id !== id);
    saveToStorage(updated);
    set({ documents: updated });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  filteredDocuments: () => {
    const { documents, searchQuery } = get();
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  },
}));
