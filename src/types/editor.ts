export interface FloatingImageItem {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
  zIndex?: number;
}

export interface EditorState {
  isEditing: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isDownloading: boolean;
  selectedTemplateId: string | null;
  content: string;
  floatingImages: FloatingImageItem[];
}

export interface EditorAction {
  type: 'SET_EDITING' | 'SET_GENERATING' | 'SET_SAVING' | 'SET_DOWNLOADING'
    | 'SET_TEMPLATE' | 'SET_CONTENT' | 'SET_FLOATING_IMAGES' | 'RESET';
  payload?: unknown;
}
