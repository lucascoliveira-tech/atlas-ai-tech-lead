import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './main';

describe('ATLAS main diagnostic flow', () => {
  it('moves from a safe demo scenario to architecture and action plan', async () => {
    const user = userEvent.setup();
    render(<App />);

    const analyze = screen.getByRole('button', { name: /analisar cenário/i });
    expect(analyze).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /carregar exemplo/i }));
    expect(screen.getByLabelText(/cenário ou gargalo/i).value).toContain('checkout');
    expect(analyze).toBeEnabled();

    await user.click(analyze);
    expect(screen.getByRole('heading', { name: /arquitetura proposta/i })).toBeInTheDocument();
    expect(screen.getByText(/chamadas remotas dentro da transação/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ATLAS Advisory/i }));
    expect(screen.getByText(/Somente leitura por padrão/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /explorar plano de ação/i }));
    expect(screen.getByRole('heading', { name: /plano recomendado pelo ATLAS/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /IA · RAG · MCP/i }));
    expect(screen.getByText(/RAG com conhecimento aprovado/i)).toBeInTheDocument();
    expect(screen.getByText(/MCP somente leitura/i)).toBeInTheDocument();

    const checks = screen.getAllByRole('checkbox');
    await user.click(checks[1]);
    expect(checks[1]).toBeChecked();
  });
});
