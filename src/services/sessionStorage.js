const STORAGE_KEY = 'atlas.diagnosticSession';

// Persisted shape: { mode, sessionId, idempotencyKey, title, scenario, form }
// `mode` lets a reload ignore state saved under a different VITE_ATLAS_MODE.
export function saveSessionState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage may be unavailable (private browsing, quota); the session simply won't survive a reload
  }
}

export function loadSessionState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSessionState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do if storage is unavailable
  }
}
