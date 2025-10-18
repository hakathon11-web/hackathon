// @ts-nocheck
/**
 * Shared helpers for BOG Payments
 * - Server-only token retrieval with in-memory caching
 */

// Naive in-memory cache for access token in Deno edge runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalCache = (globalThis as any) as Record<string, unknown>;

type BogTokenCache = { token: string; exp: number };

/**
 * Retrieve BOG OAuth2 access token using client_credentials
 * Caches token until shortly before expiry.
 */
export async function getBogAccessToken(): Promise<string> {
  const cacheKey = 'bog_token_cache';
  const now = Date.now();
  const cached = (globalCache[cacheKey] as BogTokenCache | undefined);
  if (cached && cached.exp > now + 10_000) {
    return cached.token;
  }

  const clientId = Deno.env.get('BOG_CLIENT_ID');
  const clientSecret = Deno.env.get('BOG_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('BOG credentials not configured');
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetch('https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BOG auth failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; token_type: string; expires_in: number };

  // Cache until just before expiry
  const exp = now + (data.expires_in * 1000) - 30_000;
  globalCache[cacheKey] = { token: data.access_token, exp } satisfies BogTokenCache;
  return data.access_token;
}


