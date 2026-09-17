# ATLAS — AI Tech Lead

ATLAS is a human-in-the-loop decision-support platform for software architecture and production troubleshooting.

It turns technical symptoms into traceable hypotheses, proposed architecture boundaries, prioritized recommendations, and an actionable troubleshooting runbook. AI remains outside the transactional core and does not execute operational changes without explicit human approval.

## Current integration

The frontend has two explicit, mutually exclusive modes, controlled by `VITE_ATLAS_MODE`:

- **`demo`** (default): runs entirely offline, with fictitious data and demonstrative processing. It never calls `atlas-core-api` or any AI provider. A "MODO DEMONSTRAÇÃO" badge is always visible while this mode is active.
- **`api`**: integrated with `atlas-core-api`:
  - Creates a diagnostic session (`POST /api/v1/diagnostic-sessions`)
  - Requests the architectural analysis (`POST /api/v1/diagnostic-sessions/{id}/analysis`, synchronous — no polling)
  - Renders the real result returned by the Core API (components, technologies, risks, resilience/observability recommendations, decisions, and AI/RAG/MCP guidance)
  - Lets the user retrieve the persisted analysis again (`GET /api/v1/diagnostic-sessions/{id}/analysis`), including after a page reload, and resumes a session whose analysis previously failed instead of creating a new one

If `VITE_ATLAS_MODE` is unset, the app falls back to `demo`. Any other value, or `api` mode without a valid `VITE_API_BASE_URL`, is treated as a configuration error and shown as a blocking screen instead of silently falling back.

Private prototype: [atlas-architecture-intelligence.lucascoliveira-gti.chatgpt.site](https://atlas-architecture-intelligence.lucascoliveira-gti.chatgpt.site)

> The "Carregar exemplo" button only prefills the input form with example text; it never fabricates a result by itself. In `api` mode, all analysis content shown after submission comes from the Core API response.

## Technology

- React
- Vite
- Vitest and Testing Library
- Lucide icons
- Responsive CSS design system

## Run locally

### Demo mode (no backend required)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. This works out of the box, without `atlas-core-api`, PostgreSQL or any `.env` file.

### API mode

Prerequisites: `atlas-core-api` running locally (see its own README), by default at `http://localhost:8080`.

```bash
cp .env.example .env
# edit .env: VITE_ATLAS_MODE=api
npm install
npm run dev
```

During `npm run dev`, requests to `/api` are proxied by Vite to `VITE_API_BASE_URL`, which avoids browser CORS restrictions since `atlas-core-api` does not configure CORS today. In a production build (`npm run build`/`npm run preview` or a hosted deployment), there is no dev proxy: the browser calls `VITE_API_BASE_URL` directly, so the Core API must allow that specific origin via CORS — that change belongs to the `atlas-core-api` repository and is not made here.

`VITE_API_BASE_URL` accepts `http://` only for `localhost`/`127.0.0.1`; any other host must use `https://`. Note that `localhost` typed in a visitor's browser always points to the visitor's own machine, never to a hosted backend — a deployed frontend must be configured with a real, reachable `VITE_API_BASE_URL`.

Never put tokens, credentials or secrets in `VITE_*` variables: they are bundled into the client build and are visible to anyone loading the app.

## Validate

```bash
npm test
npm run build
```

`npm run build` works in demo mode with no additional configuration.


## Repository ecosystem

| Repository | Responsibility | Initial stack | Status |
| --- | --- | --- | --- |
| [`atlas-ai-tech-lead`](https://github.com/lucascoliveira-tech/atlas-ai-tech-lead) | Web command center and user workflow | React, Vite | Active |
| [`atlas-core-api`](https://github.com/lucascoliveira-tech/atlas-core-api) | Diagnostic sessions, domain rules, security, orchestration | Java 21, Spring Boot 3 | Repository created · bootstrap pending |
| [`atlas-intelligence-service`](https://github.com/lucascoliveira-tech/atlas-intelligence-service) | Model gateway, RAG retrieval, MCP adapters and safety policies | Java 21, Spring AI or LangChain4j | Repository created · bootstrap pending |
| [`atlas-platform`](https://github.com/lucascoliveira-tech/atlas-platform) | Local platform, observability and infrastructure as code | Docker Compose, OpenTelemetry, Grafana stack, Terraform | Repository created · bootstrap pending |

RAG and MCP start as modules inside `atlas-intelligence-service`. They should only become independent services when scaling, security boundaries, or deployment cadence justify that separation.

See [Architecture](docs/ARCHITECTURE.md) for system boundaries and design principles.

## Design principles

1. Human approval for every operational mutation
2. AI outside the transactional request path
3. Read-only integrations by default
4. Traceable recommendations with evidence and assumptions
5. Sensitive data minimization and auditability
6. Modular boundaries before distributed complexity

## License

This project is licensed under the MIT License.
