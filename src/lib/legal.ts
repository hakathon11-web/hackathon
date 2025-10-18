// Utility to load localized legal documents stored as raw HTML files
// Files live under: src/legal/{en|ka}/{slug}.html

export type LegalSlug = 'about' | 'contact' | 'terms' | 'refund-policy' | 'privacy' | 'service-description';

// Vite: import all html files as raw strings
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite types for glob raw
const files = import.meta.glob('/src/legal/**/**.html', { as: 'raw', eager: true }) as Record<string, string>;

function pickLanguageCode(language?: string): 'ka' | 'en' {
  if (!language) return 'ka';
  return language.startsWith('en') ? 'en' : 'ka';
}

export function getLegalHtml(slug: LegalSlug, language?: string): string | null {
  const lang = pickLanguageCode(language);
  const path = `/src/legal/${lang}/${slug}.html`;
  return files[path] ?? null;
}


