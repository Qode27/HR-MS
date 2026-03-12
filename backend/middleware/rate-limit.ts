type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.hits >= limit) {
    return true;
  }

  bucket.hits += 1;
  return false;
}
