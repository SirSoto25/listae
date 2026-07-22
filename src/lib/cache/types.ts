export interface SearchCacheStore {
  get(key: string, allowStale?: boolean): Promise<string | null>;
  set(key: string, payload: string, ttlSeconds: number): Promise<void>;
  invalidate(key?: string): Promise<void>;
}
