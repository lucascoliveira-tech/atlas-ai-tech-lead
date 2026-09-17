// Demo mode: deterministic, fictitious data. Never touches the network or the Core API.
const demoAnalysisResult = {
  schemaVersion: '1.0',
  summary: 'Cenário demonstrativo: hipótese de saturação do pool de conexões por acoplamento síncrono com o serviço de antifraude durante picos de tráfego.',
  suggestedComponents: [
    { name: 'Checkout BFF', responsibility: 'Orquestra apenas as necessidades específicas do canal.' },
    { name: 'Checkout Core', responsibility: 'Regras transacionais e criação idempotente de pedidos.' },
    { name: 'Risk Worker', responsibility: 'Processa risco e efeitos colaterais fora da transação principal.' },
    { name: 'Telemetry Hub', responsibility: 'Correlaciona métricas, logs e traces ponta a ponta.' },
  ],
  recommendedTechnologies: [
    { category: 'Domínio', technology: 'Java 21 + Spring Boot', rationale: 'Transação local curta com eventos confiáveis via Outbox.' },
    { category: 'Cache', technology: 'Redis Cluster', rationale: 'TTL com jitter e cache-aside somente para leituras tolerantes.' },
    { category: 'Persistência', technology: 'PostgreSQL + HikariCP', rationale: 'Índices orientados às queries e pool limitado por capacidade real.' },
    { category: 'Assíncrono', technology: 'Apache Kafka', rationale: 'Chave por orderId, DLQ e retry topics com backoff.' },
  ],
  risks: [
    { description: 'Chamada remota ao antifraude dentro da transação.', impact: 'Prolonga locks e esgota o pool de conexões.', mitigation: 'Mover o antifraude para processamento assíncrono fora da transação.' },
    { description: 'Cache stampede durante campanhas.', impact: 'Picos de latência simultâneos no banco.', mitigation: 'TTL com jitter e single-flight no cache-aside.' },
    { description: 'Partições insuficientes no Kafka.', impact: 'Aumento do lag e atraso no processamento assíncrono.', mitigation: 'Recalcular partições e concorrência a partir da taxa de entrada real.' },
  ],
  resilienceRecommendations: [
    'Retirar o antifraude do lock transacional, persistindo pedido e evento Outbox na mesma transação.',
    'Definir orçamento de timeout em cascata entre gateway, BFF, core e dependências.',
    'Isolar recursos com bulkheads por dependência para evitar contenção compartilhada.',
  ],
  observabilityRecommendations: [
    'Medir a jornada com SLIs de sucesso e latência do checkout, não apenas por serviço.',
    'Propagar correlation-id e trace entre HTTP, Outbox, Kafka e workers.',
    'Alertar por burn rate de error budget em vez de limiares estáticos isolados.',
  ],
  decisions: [
    {
      decision: 'Processamento do antifraude',
      chosenOption: 'Assíncrono via evento Outbox',
      alternatives: ['Síncrono na transação', 'Chamada direta com timeout curto'],
      tradeOffs: 'Reduz acoplamento e protege o pool de conexões, ao custo de uma janela de consistência eventual.',
    },
    {
      decision: 'Estratégia de cache',
      chosenOption: 'Cache-aside com TTL e jitter',
      alternatives: ['Write-through', 'Sem cache'],
      tradeOffs: 'Melhora latência de leitura sem se tornar fonte de verdade.',
    },
  ],
  intelligenceGuidance: {
    whenAiHelps: 'Quando o cenário exige sintetizar múltiplas alternativas arquiteturais com evidências.',
    whenRagHelps: 'Quando ADRs, runbooks e conhecimento aprovado devem fundamentar a resposta.',
    whenMcpHelps: 'Quando é preciso inspecionar sistemas externos de forma controlada e somente leitura.',
    whenNotNeeded: 'Não é necessário para cenários simples e cobertos por regras determinísticas — como este exemplo demonstrativo.',
  },
};

function delay(ms) {
  return new Promise((resolve) => { window.setTimeout(resolve, ms); });
}

export async function createDiagnosticSession({ title, scenario }) {
  await delay(200);
  const now = new Date().toISOString();
  return { id: 'demo-session', title, scenario, status: 'DRAFT', createdAt: now, updatedAt: now };
}

export async function generateAnalysis({ sessionId }) {
  await delay(500);
  const now = new Date().toISOString();
  return {
    analysisId: 'demo-analysis',
    sessionId,
    version: 1,
    status: 'COMPLETED',
    correlationId: 'demo-correlation',
    result: demoAnalysisResult,
    errorCode: null,
    errorDetail: null,
    createdAt: now,
    completedAt: now,
  };
}

export async function getLatestAnalysis(sessionId) {
  await delay(150);
  return generateAnalysis({ sessionId });
}
