# ATLAS — AI Tech Lead

ATLAS is a human-in-the-loop decision-support platform for software architecture and production troubleshooting.

It turns technical symptoms into traceable hypotheses, proposed architecture boundaries, prioritized recommendations, and an actionable troubleshooting runbook. AI remains outside the transactional core and does not execute operational changes without explicit human approval.

## Current prototype

The frontend prototype includes:

- Guided scenario and bottleneck intake
- Interactive architecture component map
- Resilience and observability recommendations
- Technology decision support
- Decoupled AI, RAG, and MCP guardrails
- Prioritized P0–P2 action plan
- Interactive troubleshooting runbook

Private prototype: [atlas-architecture-intelligence.lucascoliveira-gti.chatgpt.site](https://atlas-architecture-intelligence.lucascoliveira-gti.chatgpt.site)

> The current diagnosis is deterministic and demonstrative. It does not connect to production systems, execute changes, or send data to an external model.

## Technology

- React
- Vite
- Vitest and Testing Library
- Lucide icons
- Responsive CSS design system

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Validate

```bash
npm test
npm run build
```

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
