"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export function useApi<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api<T>(url)
      .then((d) => mounted && setData(d))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [url, ...deps]);

  return { data, loading, error };
}
