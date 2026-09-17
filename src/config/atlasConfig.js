export const ATLAS_MODE_DEMO = 'demo';
export const ATLAS_MODE_API = 'api';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function readMode(rawMode) {
  const raw = (rawMode || '').trim();
  if (raw === '') return { mode: ATLAS_MODE_DEMO, error: null };
  if (raw === ATLAS_MODE_DEMO || raw === ATLAS_MODE_API) return { mode: raw, error: null };
  return {
    mode: ATLAS_MODE_DEMO,
    error: `VITE_ATLAS_MODE="${raw}" é inválido. Valores aceitos: "demo" ou "api".`,
  };
}

function readApiBaseUrl(rawUrl) {
  const raw = (rawUrl || '').trim();
  if (!raw) {
    return { url: null, error: 'VITE_API_BASE_URL é obrigatório quando VITE_ATLAS_MODE=api.' };
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { url: null, error: `VITE_API_BASE_URL="${raw}" não é uma URL válida.` };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { url: null, error: 'VITE_API_BASE_URL deve usar http ou https.' };
  }
  if (parsed.protocol === 'http:' && !LOCAL_HOSTNAMES.has(parsed.hostname)) {
    return { url: null, error: 'VITE_API_BASE_URL deve usar HTTPS quando aponta para um host que não é localhost.' };
  }
  return { url: raw.replace(/\/$/, ''), error: null };
}

function buildConfig() {
  const { mode, error: modeError } = readMode(import.meta.env.VITE_ATLAS_MODE);
  if (modeError) {
    return { mode, apiBaseUrl: null, configError: modeError };
  }
  if (mode === ATLAS_MODE_API) {
    const { url, error } = readApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
    return { mode, apiBaseUrl: url, configError: error };
  }
  return { mode, apiBaseUrl: null, configError: null };
}

export const atlasConfig = buildConfig();

export function isDemoMode() {
  return atlasConfig.mode === ATLAS_MODE_DEMO;
}

export function isApiMode() {
  return atlasConfig.mode === ATLAS_MODE_API;
}
