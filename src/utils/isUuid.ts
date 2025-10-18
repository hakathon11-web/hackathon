export function isUuid(value?: string): boolean {
  if (!value || typeof value !== 'string') return false;
  // RFC 4122 versions 1-5
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}


