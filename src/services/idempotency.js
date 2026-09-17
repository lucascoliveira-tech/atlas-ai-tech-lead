export function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
