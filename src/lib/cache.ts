// Simple in-memory TTL cache for Yahoo Finance API responses
interface CacheEntry {
  data: unknown;
  expires: number;
}

const store = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlSeconds: number): void {
  store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

export function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return Promise.resolve(cached);
  return fetcher().then((data) => {
    setCache(key, data, ttlSeconds);
    return data;
  });
}
