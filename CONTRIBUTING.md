# Contributing

## Workflow

1. Create a branch from `main` using `feature/<short-name>` or `fix/<short-name>`.
2. Keep changes focused and include tests for behavior changes.
3. Run `npm test` and `npm run build` before opening a pull request.
4. Explain architectural trade-offs and operational impact in the pull request.

## Commit style

Use Conventional Commits:

```text
feat: add diagnostic history
fix: preserve selected architecture node
docs: document MCP access policy
test: cover critical scenario flow
```

## Definition of done

- Main user flow remains functional
- Automated tests pass
- Production build succeeds
- No credentials or confidential data are committed
- Accessibility and responsive behavior are reviewed
- Architecture changes include an ADR or documentation update
