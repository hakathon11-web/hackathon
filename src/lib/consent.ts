const readCookie = (key: string): string | undefined => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
};

const writeCookie = (key: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
};

export const consent = {
  get raw() {
    return {
      cookie_consent: readCookie('cookie_consent'),
      functional: readCookie('consent_functional'),
      analytics: readCookie('consent_analytics'),
    };
  },
  has(key: 'functional' | 'analytics') {
    const base = readCookie('cookie_consent') === 'accepted';
    if (!base) return false;
    return readCookie(`consent_${key}`) === 'true';
  },
  setAll(accepted: boolean) {
    writeCookie('cookie_consent', accepted ? 'accepted' : 'rejected');
    writeCookie('consent_functional', accepted ? 'true' : 'false');
    writeCookie('consent_analytics', accepted ? 'true' : 'false');
  },
  set(key: 'functional' | 'analytics', value: boolean) {
    writeCookie(`consent_${key}`, value ? 'true' : 'false');
  },
};

export default consent;



