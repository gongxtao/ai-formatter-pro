import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'code',
  'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sub', 'sup', 'hr', 'img',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'src', 'alt'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Strip data: URIs to prevent XSS via images
    FORBID_ATTR: ['onerror', 'onload'],
  });
}
