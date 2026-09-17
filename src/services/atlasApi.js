import { apiFetch } from './httpClient';

export { createIdempotencyKey } from './idempotency';

export function createDiagnosticSession({ title, scenario }) {
  return apiFetch('/api/v1/diagnostic-sessions', { method: 'POST', body: { title, scenario } });
}

export function generateAnalysis({ sessionId, idempotencyKey, correlationId }) {
  return apiFetch(`/api/v1/diagnostic-sessions/${sessionId}/analysis`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
      ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
    },
    // Core defaults ATLAS_INTELLIGENCE_TIMEOUT to 10s; give the client a bit more headroom.
    timeoutMs: 20000,
  });
}

export function getLatestAnalysis(sessionId) {
  return apiFetch(`/api/v1/diagnostic-sessions/${sessionId}/analysis`);
}
