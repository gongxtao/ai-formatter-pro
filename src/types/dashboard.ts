export type NavItem = 'home' | 'document' | 'templates' | 'history';

export interface MiniNavSection {
  key: NavItem;
  icon: string;
  label: string;
}

export interface DocumentType {
  key: string;
  labelKey: string;
  hasChevron?: boolean;
}

export interface MockTemplate {
  id: string;
  title: string;
  category: string;
  style: 'white-logo' | 'brown-arch' | 'light-typography' | 'dark-border' | 'double-frame' | 'gradient-blue' | 'green-curve' | 'minimal-retail' | 'red-bold' | 'image-top';
}

export interface Template {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  slug: string;
  thumbnail_url: string;
  html_url: string;
  tags: string[];
  is_premium: boolean;
  popularity: number;
  sort_order: number;
}
