import { ATLAS_MODE_API, atlasConfig } from '../config/atlasConfig';

const DEFAULT_TIMEOUT_MS = 15000;

// Dev server proxies "/api" to VITE_API_BASE_URL (see vite.config.js); production builds call it directly.
const API_BASE = import.meta.env.DEV ? '' : (atlasConfig.apiBaseUrl || '');

export class ApiError extends Error {
  constructor({ message, status, title, kind }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.kind = kind;
  }
}

function classify(status) {
  if (status === 400) return 'validation';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'unavailable';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

export async function apiFetch(path, { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (atlasConfig.mode !== ATLAS_MODE_API) {
    // Guards against accidental network calls while running in demo mode.
    throw new ApiError({ message: 'apiFetch called outside of API mode.', kind: 'config' });
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError({ message: 'O Core API não respondeu dentro do tempo esperado.', kind: 'timeout' });
    }
    throw new ApiError({ message: 'Não foi possível conectar ao Core API. Verifique se o serviço está em execução.', kind: 'unavailable' });
  } finally {
    window.clearTimeout(timer);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const kind = classify(response.status);
    const message = payload?.detail || payload?.title || `O Core API respondeu com um erro inesperado (HTTP ${response.status}).`;
    throw new ApiError({ message, status: response.status, title: payload?.title, kind });
  }

  return payload;
}
