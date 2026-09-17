import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig() {
  vi.resetModules();
  return import('./atlasConfig');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('atlasConfig', () => {
  it('defaults to demo mode when VITE_ATLAS_MODE is unset', async () => {
    const { atlasConfig, ATLAS_MODE_DEMO } = await loadConfig();
    expect(atlasConfig.mode).toBe(ATLAS_MODE_DEMO);
    expect(atlasConfig.configError).toBeNull();
  });

  it('flags an unknown mode value as a configuration error and falls back to demo', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'production');
    const { atlasConfig, ATLAS_MODE_DEMO } = await loadConfig();
    expect(atlasConfig.mode).toBe(ATLAS_MODE_DEMO);
    expect(atlasConfig.configError).toMatch(/inválido/i);
  });

  it('requires VITE_API_BASE_URL when mode is api', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { atlasConfig } = await loadConfig();
    expect(atlasConfig.configError).toMatch(/obrigatório/i);
    expect(atlasConfig.apiBaseUrl).toBeNull();
  });

  it('rejects an invalid URL for VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'not-a-url');
    const { atlasConfig } = await loadConfig();
    expect(atlasConfig.configError).toMatch(/não é uma url válida/i);
  });

  it('rejects http for non-local hosts in api mode', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.com');
    const { atlasConfig } = await loadConfig();
    expect(atlasConfig.configError).toMatch(/https/i);
  });

  it('accepts http for localhost in api mode', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const { atlasConfig } = await loadConfig();
    expect(atlasConfig.configError).toBeNull();
    expect(atlasConfig.apiBaseUrl).toBe('http://localhost:8080');
  });

  it('accepts https for hosted backends in api mode', async () => {
    vi.stubEnv('VITE_ATLAS_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.atlas.example.com/');
    const { atlasConfig } = await loadConfig();
    expect(atlasConfig.configError).toBeNull();
    expect(atlasConfig.apiBaseUrl).toBe('https://api.atlas.example.com');
  });
});
