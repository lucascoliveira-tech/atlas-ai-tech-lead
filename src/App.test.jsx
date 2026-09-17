import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

// Re-imports ./main with fresh module state so it picks up the stubbed VITE_ATLAS_MODE/VITE_API_BASE_URL.
async function renderApp({ mode, baseUrl } = {}) {
  vi.resetModules();
  if (mode !== undefined) vi.stubEnv('VITE_ATLAS_MODE', mode);
  if (baseUrl !== undefined) vi.stubEnv('VITE_API_BASE_URL', baseUrl);
  const { App } = await import('./main');
  return render(<App />);
}

function apiAnalysisResponse(overrides = {}) {
  return {
    analysisId: 'analysis-1',
    sessionId: 'session-1',
    version: 1,
    status: 'COMPLETED',
    correlationId: 'correlation-1',
    result: {
      schemaVersion: '1.0',
      summary: 'Resumo real vindo do Core API para o cenário de checkout.',
      suggestedComponents: [{ name: 'Core API', responsibility: 'Orquestra sessões de diagnóstico.' }],
      recommendedTechnologies: [{ category: 'API', technology: 'Spring MVC', rationale: 'Stack síncrona existente.' }],
      risks: [{ description: 'Provedor de análise indisponível.', impact: 'Sem resposta ao usuário.', mitigation: 'Timeout limitado e correlation-id.' }],
      resilienceRecommendations: ['Manter chamadas do provedor atrás de uma porta.'],
      observabilityRecommendations: ['Propagar correlation-id nos logs.'],
      decisions: [{ decision: 'Execução da análise', chosenOption: 'Síncrona', alternatives: ['Assíncrona'], tradeOffs: 'Mais simples para o provedor determinístico.' }],
      intelligenceGuidance: {
        whenAiHelps: 'Quando o cenário exige síntese de alternativas.',
        whenRagHelps: 'Quando ADRs e runbooks aprovados devem fundamentar a resposta.',
        whenMcpHelps: 'Quando é preciso inspecionar sistemas externos de forma controlada.',
        whenNotNeeded: 'Não é necessário para cenários simples e determinísticos.',
      },
    },
    errorCode: null,
    errorDetail: null,
    createdAt: '2026-09-16T20:00:00Z',
    completedAt: '2026-09-16T20:00:01Z',
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('demo mode (offline, fictitious data — mocked in the sense that the whole backend is stubbed by design)', () => {
  it('falls back to demo mode when VITE_ATLAS_MODE is not set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderApp({});

    expect(screen.getByText(/modo demonstração/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never calls fetch and completes the full flow with the demo badge visible', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    await renderApp({ mode: 'demo' });

    const analyze = screen.getByRole('button', { name: /analisar cenário/i });
    expect(analyze).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    expect(analyze).toBeEnabled();

    await user.click(analyze);

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
    expect(screen.getByText(/hipótese de saturação do pool de conexões/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /explorar plano de ação/i }));
    await user.click(screen.getByRole('button', { name: /IA · RAG · MCP/i }));
    expect(screen.getByText(/sintetizar múltiplas alternativas/i)).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while a request is in flight', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();

    await renderApp({ mode: 'demo' });
    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    const analyze = screen.getByRole('button', { name: /analisar cenário/i });

    await user.click(analyze);
    expect(analyze).toBeDisabled();
    await user.click(analyze);

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
  });
});

describe('api mode (integrated with atlas-core-api)', () => {
  it('creates a session, requests the analysis and renders the real Core API result', async () => {
    const fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/diagnostic-sessions') && options.method === 'POST' && !url.includes('/analysis')) {
        return jsonResponse({ id: 'session-1', title: 'Checkout', scenario: 'Checkout lento', status: 'DRAFT' }, 201);
      }
      if (url.includes('/analysis') && options.method === 'POST') {
        return jsonResponse(apiAnalysisResponse(), 201);
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    await renderApp({ mode: 'api', baseUrl: 'http://localhost:8080' });

    const analyze = screen.getByRole('button', { name: /analisar cenário/i });
    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    await user.click(analyze);

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
    expect(screen.getByText(/resumo real vindo do core api/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not create a duplicate session when the button is clicked twice quickly', async () => {
    let sessionCalls = 0;
    const fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/diagnostic-sessions') && options.method === 'POST' && !url.includes('/analysis')) {
        sessionCalls += 1;
        return jsonResponse({ id: 'session-1', title: 'Checkout', scenario: 'Checkout lento', status: 'DRAFT' }, 201);
      }
      if (url.includes('/analysis') && options.method === 'POST') {
        return jsonResponse(apiAnalysisResponse(), 201);
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    await renderApp({ mode: 'api', baseUrl: 'http://localhost:8080' });
    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    const analyze = screen.getByRole('button', { name: /analisar cenário/i });

    await user.click(analyze);
    // The button is disabled synchronously once the first click starts; a second click is a no-op.
    await user.click(analyze);

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
    expect(sessionCalls).toBe(1);
  });

  it('shows a readable message when the Core API returns a validation problem', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { status: 400, title: 'Bad Request', detail: 'scenario must not be blank' },
      400,
    ));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    await renderApp({ mode: 'api', baseUrl: 'http://localhost:8080' });
    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    await user.click(screen.getByRole('button', { name: /analisar cenário/i }));

    await waitFor(() => expect(screen.getByText(/scenario must not be blank/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /analisar cenário/i })).toBeEnabled();
  });

  it('reuses the same session and idempotency key when a previous analysis attempt failed', async () => {
    window.localStorage.setItem('atlas.diagnosticSession', JSON.stringify({
      mode: 'api',
      sessionId: 'session-1',
      idempotencyKey: 'key-1',
      title: 'Checkout',
      scenario: 'Checkout lento',
      form: { description: 'Checkout lento sob carga alta', environment: 'Produção', traffic: '2k–10k req/min', symptom: 'Latência e erros', priority: 'Alta' },
    }));
    const analysisIdempotencyKeys = [];
    const sessionCreationCalls = [];
    const fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/analysis') && options.method === 'GET') {
        return jsonResponse({ status: 404, title: 'Not Found', detail: 'no analysis yet' }, 404);
      }
      if (url.includes('/diagnostic-sessions') && options.method === 'POST' && !url.includes('/analysis')) {
        sessionCreationCalls.push(url);
        return jsonResponse({ id: 'session-2', title: 'Checkout', scenario: 'Checkout lento', status: 'DRAFT' }, 201);
      }
      if (url.includes('/analysis') && options.method === 'POST') {
        analysisIdempotencyKeys.push(options.headers['Idempotency-Key']);
        return jsonResponse(apiAnalysisResponse(), 201);
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    await renderApp({ mode: 'api', baseUrl: 'http://localhost:8080' });

    await waitFor(() => expect(screen.getByLabelText(/cenário ou gargalo/i).value).toContain('Checkout lento sob carga alta'));
    await user.click(screen.getByRole('button', { name: /analisar cenário/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
    expect(analysisIdempotencyKeys).toEqual(['key-1']);
    expect(sessionCreationCalls).toHaveLength(0);
  });

  it('restores a persisted analysis after reload without re-submitting the form', async () => {
    window.localStorage.setItem(
      'atlas.diagnosticSession',
      JSON.stringify({ mode: 'api', sessionId: 'session-1', idempotencyKey: 'key-1', title: 'Checkout', scenario: 'Checkout lento' }),
    );
    const fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/analysis') && options.method === 'GET') {
        return jsonResponse(apiAnalysisResponse(), 200);
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderApp({ mode: 'api', baseUrl: 'http://localhost:8080' });

    await waitFor(() => expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });
});

describe('invalid configuration', () => {
  it('blocks the app with a clear message for an unknown VITE_ATLAS_MODE value', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderApp({ mode: 'production' });

    expect(screen.getByText(/vite_atlas_mode="production" é inválido/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks the app when api mode is missing a valid VITE_API_BASE_URL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderApp({ mode: 'api', baseUrl: '' });

    expect(screen.getByText(/vite_api_base_url é obrigatório/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
