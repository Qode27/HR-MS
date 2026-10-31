"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

const CACHE_TTL_MS = 30_000;
const apiCache = new Map<string, { data: unknown; expiresAt: number }>();

export function useApi<T>(url: string, deps: unknown[] = []) {
  const cached = apiCache.get(url);
  const hasFreshCache = Boolean(cached && cached.expiresAt > Date.now());
  const [data, setData] = useState<T | null>(() => (hasFreshCache ? (cached?.data as T) : null));
  const [loading, setLoading] = useState(!hasFreshCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const cachedEntry = apiCache.get(url);
    const canUseCache = Boolean(cachedEntry && cachedEntry.expiresAt > Date.now());
    if (canUseCache) {
      setData(cachedEntry?.data as T);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    api<T>(url)
      .then((d) => {
        apiCache.set(url, { data: d, expiresAt: Date.now() + CACHE_TTL_MS });
        if (mounted) setData(d);
      })
      .catch((e: Error) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [url, ...deps]);

  return { data, loading, error };
}
