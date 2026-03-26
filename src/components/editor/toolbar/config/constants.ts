/**
 * Color constants for the toolbar
 * Centralized color definitions used across pickers
 */

// Default colors - arranged in 8 rows of 9-10 colors
export const DEFAULT_COLORS = [
  // Row 1: Black to White
  '#000000', '#424242', '#636363', '#757575', '#9E9E9E', '#BDBDBD', '#D1D1D1', '#EEEEEE', '#F5F5F5', '#FFFFFF',
  // Row 2: Red variations
  '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#C62828', '#B71C1C',
  // Row 3: Orange variations
  '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#EF6C00', '#E65100',
  // Row 4: Yellow variations
  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#F9A825', '#F57F17',
  // Row 5: Green variations
  '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#2E7D32', '#1B5E20',
  // Row 6: Blue variations
  '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1565C0', '#0D47A1',
  // Row 7: Purple variations
  '#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#6A1B9A', '#4A148C',
  // Row 8: Pink variations
  '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457'
]

// Theme colors - curated color palette
export const THEME_COLORS = [
  '#1A73E8', '#185ABC', '#0B8043', '#0469C3',
  '#D93025', '#C5221F', '#137333', '#9334E6',
  '#FF6D00', '#F4511E', '#0F9D58', '#4285F4'
]

// Font family options
export const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Gill Sans', label: 'Gill Sans' },
  { value: 'Palatino Linotype', label: 'Palatino' },
  { value: 'Lucida Sans', label: 'Lucida Sans' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' }
]

// Font size options
export const FONT_SIZES = [
  { value: '10px', label: '10px' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '40px', label: '40px' },
  { value: '44px', label: '44px' },
  { value: '48px', label: '48px' }
]

// Heading format options
export const HEADING_OPTIONS = [
  { value: 'p', label: 'Normal Text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' }
]

// Table grid size
export const TABLE_MAX_ROWS = 10
export const TABLE_MAX_COLS = 10

// Image file constraints
export const IMAGE_MAX_SIZE_MB = 10
export const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024
