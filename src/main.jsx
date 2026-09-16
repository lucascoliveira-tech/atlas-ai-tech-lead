import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clipboard,
  Cloud,
  Code2,
  Database,
  Eye,
  FileSearch,
  Gauge,
  GitBranch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Network,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Zap,
} from 'lucide-react';
import './styles.css';

const demoScenario = {
  description:
    'Durante campanhas, o checkout apresenta p95 acima de 6s e 8% de erros. Há aumento do lag no Kafka, chamadas síncronas ao serviço de antifraude e saturação do pool de conexões do PostgreSQL.',
  environment: 'Produção',
  traffic: '2k–10k req/min',
  symptom: 'Latência e erros',
  priority: 'Crítica',
};

const nodeDetails = {
  channels: {
    title: 'Web & Mobile',
    type: 'Canais',
    icon: Code2,
    description: 'Clientes desacoplados do domínio por contrato versionado.',
    technology: 'Angular / Mobile híbrido',
    decision: 'Propagar correlation-id e idempotency-key desde a origem.',
    risk: 'Retries do cliente sem idempotência podem duplicar pedidos.',
  },
  gateway: {
    title: 'API Gateway',
    type: 'Borda',
    icon: ShieldCheck,
    description: 'Entrada única para autenticação, throttling e roteamento.',
    technology: 'Kong / AWS API Gateway',
    decision: 'Rate limit por cliente e timeout menor que o timeout do BFF.',
    risk: 'Políticas diferentes entre rotas criam comportamento imprevisível.',
  },
  bff: {
    title: 'Checkout BFF',
    type: 'Experiência',
    icon: Layers3,
    description: 'Orquestra apenas necessidades específicas do canal.',
    technology: 'Java 21 + Spring Boot 3',
    decision: 'Virtual Threads para I/O e bulkheads por dependência.',
    risk: 'Transformar o BFF em core de negócio aumenta acoplamento.',
  },
  checkout: {
    title: 'Checkout Core',
    type: 'Domínio',
    icon: Server,
    description: 'Regras transacionais e criação idempotente de pedidos.',
    technology: 'Java 21 + Spring Boot',
    decision: 'Transação local curta; eventos confiáveis via Outbox.',
    risk: 'Chamada remota dentro da transação prolonga locks e esgota o pool.',
  },
  redis: {
    title: 'Redis',
    type: 'Cache',
    icon: Zap,
    description: 'Cache distribuído para dados de leitura e deduplicação.',
    technology: 'Redis Cluster',
    decision: 'TTL com jitter e cache-aside somente para leituras tolerantes.',
    risk: 'Cache stampede durante campanhas sem single-flight.',
  },
  postgres: {
    title: 'PostgreSQL',
    type: 'Persistência',
    icon: Database,
    description: 'Fonte de verdade para pedidos e estado transacional.',
    technology: 'PostgreSQL + HikariCP',
    decision: 'Índices orientados às queries e pool limitado por capacidade real.',
    risk: 'Aumentar o pool sem medir pode apenas mover a saturação para o banco.',
  },
  kafka: {
    title: 'Event Backbone',
    type: 'Assíncrono',
    icon: GitBranch,
    description: 'Desacopla processamento posterior do caminho crítico.',
    technology: 'Apache Kafka',
    decision: 'Chave por orderId, DLQ e retry topics com backoff.',
    risk: 'Partições insuficientes e consumers lentos elevam o lag.',
  },
  worker: {
    title: 'Risk Worker',
    type: 'Processamento',
    icon: Box,
    description: 'Processa risco e efeitos colaterais fora da transação principal.',
    technology: 'Java + Kafka Consumer',
    decision: 'Consumidor idempotente com concorrência limitada.',
    risk: 'Retry imediato amplifica indisponibilidade do antifraude.',
  },
  telemetry: {
    title: 'Telemetry Hub',
    type: 'Observabilidade',
    icon: Activity,
    description: 'Correlaciona métricas, logs e traces ponta a ponta.',
    technology: 'OpenTelemetry + Grafana stack',
    decision: 'SLIs por jornada e exemplars ligando métrica ao trace.',
    risk: 'Coletar tudo sem sampling aumenta custo e reduz sinal útil.',
  },
  atlas: {
    title: 'ATLAS Advisory',
    type: 'IA desacoplada',
    icon: Bot,
    description: 'Analisa telemetria e conhecimento sem executar no core.',
    technology: 'LLM Gateway + RAG + MCP',
    decision: 'Somente leitura por padrão; ações exigem aprovação humana.',
    risk: 'Acesso amplo a dados ou ferramentas pode expor informação sensível.',
  },
};

const categories = [
  { id: 'resilience', label: 'Resiliência', icon: ShieldCheck },
  { id: 'observability', label: 'Observabilidade', icon: Eye },
  { id: 'technology', label: 'Tecnologias', icon: Code2 },
  { id: 'ai', label: 'IA · RAG · MCP', icon: Bot },
];

const recommendations = {
  resilience: [
    {
      priority: 'P0',
      title: 'Retirar o antifraude do lock transacional',
      text: 'Persistir o pedido e o evento Outbox na mesma transação; processar risco de forma assíncrona quando a regra de negócio permitir.',
      evidence: 'Reduz duração da transação e protege o pool de conexões.',
    },
    {
      priority: 'P0',
      title: 'Definir orçamento de timeout em cascata',
      text: 'Gateway 3.0s → BFF 2.5s → Core 2.0s → dependência 800ms, com circuit breaker e retry apenas para falhas transitórias.',
      evidence: 'Evita requisições órfãs e contenção acumulada.',
    },
    {
      priority: 'P1',
      title: 'Isolar recursos com bulkheads',
      text: 'Separar limites de concorrência por antifraude, banco e mensageria; combinar com backpressure no consumidor.',
      evidence: 'Uma dependência degradada deixa de consumir toda a capacidade.',
    },
  ],
  observability: [
    {
      priority: 'P0',
      title: 'Medir a jornada, não apenas serviços',
      text: 'Criar SLI checkout_success_rate e checkout_latency_ms com dimensões controladas por canal, versão e resultado.',
      evidence: 'Alinha diagnóstico ao impacto real percebido pelo usuário.',
    },
    {
      priority: 'P1',
      title: 'Correlacionar trace, pedido e evento',
      text: 'Propagar traceparent, correlation-id e orderId entre HTTP, Outbox, Kafka e workers.',
      evidence: 'Permite reconstruir a linha do tempo de um pedido sem busca manual.',
    },
    {
      priority: 'P1',
      title: 'Alertar por burn rate',
      text: 'Trocar alertas estáticos isolados por consumo rápido/lento do error budget do checkout.',
      evidence: 'Reduz ruído e antecipa violações de SLO relevantes.',
    },
  ],
  technology: [
    {
      priority: 'P0',
      title: 'Java 21 no caminho crítico',
      text: 'Usar Virtual Threads para I/O bloqueante, mantendo limites explícitos de concorrência para banco e dependências.',
      evidence: 'Simplifica o modelo sem remover limites dos recursos finitos.',
    },
    {
      priority: 'P1',
      title: 'Kafka com capacidade verificada',
      text: 'Recalcular partições, max.poll e concorrência a partir da taxa de entrada e tempo médio de processamento.',
      evidence: 'Evita escalar consumers sem throughput efetivo.',
    },
    {
      priority: 'P2',
      title: 'Redis como otimização, não fonte de verdade',
      text: 'Aplicar cache-aside a catálogos e configurações; usar deduplicação com TTL para comandos repetidos.',
      evidence: 'Ganha latência sem comprometer consistência transacional.',
    },
  ],
  ai: [
    {
      priority: 'P1',
      title: 'RAG com conhecimento aprovado',
      text: 'Indexar runbooks, ADRs e pós-incidentes versionados, aplicando controle de acesso e citações obrigatórias.',
      evidence: 'Respostas rastreáveis sem treinar o modelo com dados internos.',
    },
    {
      priority: 'P1',
      title: 'MCP somente leitura na primeira fase',
      text: 'Expor consultas limitadas de métricas, logs e catálogo; bloquear mutações e mascarar PII antes do modelo.',
      evidence: 'Apoia troubleshooting sem colocar IA no caminho transacional.',
    },
    {
      priority: 'P2',
      title: 'Aprovação humana para ações',
      text: 'Gerar hipóteses e planos; qualquer rollback, escala ou mudança exige confirmação, trilha de auditoria e política.',
      evidence: 'Preserva responsabilidade operacional e limita blast radius.',
    },
  ],
};

const runbook = [
  'Confirmar impacto por SLI e separar erro de latência',
  'Comparar saturação do HikariCP com tempo de transação',
  'Inspecionar traces lentos e dependência antifraude',
  'Validar lag por partição, rebalance e taxa do consumidor',
  'Aplicar mitigação reversível e acompanhar error budget',
  'Registrar evidências e criar ADR para a correção estrutural',
];

function AtlasMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function Header({ step, onRestart }) {
  const stage = ['Contexto operacional', 'Mapa de decisão', 'Plano de resposta'][step - 1];
  return (
    <header className="app-header">
      <div className="workspace-title">
        <span>COMMAND CENTER</span>
        <ChevronRight size={13} />
        <strong>{stage}</strong>
      </div>
      <div className="header-actions">
        {step > 1 && (
          <button className="ghost-button compact" onClick={onRestart}>
            <RefreshCw size={15} /> Nova análise
          </button>
        )}
        <div className="system-status"><i /> Sistema operacional</div>
        <div className="avatar">LO</div>
      </div>
    </header>
  );
}

function Stepper({ step, onStep }) {
  const steps = [
    ['01', 'Contexto'],
    ['02', 'Arquitetura'],
    ['03', 'Plano de ação'],
  ];
  return (
    <nav className="stepper" aria-label="Etapas da análise">
      {steps.map(([number, label], index) => {
        const position = index + 1;
        const state = position === step ? 'active' : position < step ? 'done' : '';
        return (
          <React.Fragment key={number}>
            <button
              className={`step ${state}`}
              onClick={() => position <= step && onStep(position)}
              disabled={position > step}
            >
              <span className="step-number">{position < step ? <Check size={14} /> : number}</span>
              <span>{label}</span>
            </button>
            {index < steps.length - 1 && <div className={`step-line ${position < step ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function ControlRail({ step, onStep }) {
  return (
    <aside className="control-rail">
      <div className="brand">
        <AtlasMark />
        <div>
          <div className="brand-name">ATLAS</div>
          <div className="brand-subtitle">DECISION SYSTEM</div>
        </div>
      </div>
      <div className="rail-label">FLUXO DE ANÁLISE</div>
      <Stepper step={step} onStep={onStep} />
      <div className="rail-spacer" />
      <div className="rail-signal">
        <div><Activity size={14} /><span>ENGINE</span></div>
        <strong>READY</strong>
      </div>
      <div className="privacy-pill"><LockKeyhole size={14} /> Acesso privado</div>
      <div className="rail-version">ATLAS / BUILD 0.2</div>
    </aside>
  );
}

function ContextStep({ form, setForm, onAnalyze, onDemo }) {
  const isReady = form.description.trim().length > 20;
  return (
    <main className="page context-page">
      <section className="hero-block">
        <div className="eyebrow"><Sparkles size={14} /> ARCHITECTURE COMMAND CENTER</div>
        <h1>Transforme sinais em<br /><span>decisões técnicas.</span></h1>
        <p>Transforme sintomas técnicos em hipóteses, arquitetura proposta e um plano de investigação explicável.</p>
      </section>

      <div className="context-layout">
      <section className="diagnosis-card">
        <div className="card-heading">
          <div>
            <span className="section-index">01</span>
            <h2>Qual problema precisamos entender?</h2>
          </div>
          <button className="demo-button" onClick={onDemo}><Play size={14} fill="currentColor" /> Carregar exemplo</button>
        </div>

        <label className="field-label" htmlFor="scenario">Cenário ou gargalo</label>
        <div className="textarea-wrap">
          <textarea
            id="scenario"
            value={form.description}
            maxLength={520}
            placeholder="Ex.: Em horários de pico, o checkout passa de 2s para 7s. O banco atinge o limite de conexões e o consumer acumula lag..."
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <span>{form.description.length}/520</span>
        </div>

        <div className="form-grid">
          <SelectField label="Ambiente" value={form.environment} options={['Produção', 'Homologação', 'Desenvolvimento']} onChange={(value) => setForm({ ...form, environment: value })} />
          <SelectField label="Volume estimado" value={form.traffic} options={['Até 2k req/min', '2k–10k req/min', 'Acima de 10k req/min', 'Não informado']} onChange={(value) => setForm({ ...form, traffic: value })} />
          <SelectField label="Sintoma principal" value={form.symptom} options={['Latência e erros', 'Indisponibilidade', 'Custo elevado', 'Inconsistência', 'Escalabilidade']} onChange={(value) => setForm({ ...form, symptom: value })} />
          <SelectField label="Prioridade" value={form.priority} options={['Crítica', 'Alta', 'Média', 'Exploratória']} onChange={(value) => setForm({ ...form, priority: value })} />
        </div>

        <div className="privacy-note"><LockKeyhole size={14} /> Não inclua dados pessoais, credenciais, payloads reais ou identificadores confidenciais.</div>

        <div className="card-footer">
          <div className="analysis-hints">
            <span><CheckCircle2 size={14} /> Hipóteses rastreáveis</span>
            <span><CheckCircle2 size={14} /> Recomendações priorizadas</span>
          </div>
          <button className="primary-button" disabled={!isReady} onClick={onAnalyze}>
            Analisar cenário <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <aside className="command-brief">
        <div className="brief-top"><Gauge size={19} /><span>ANALYSIS SCOPE</span></div>
        <h2>Um briefing técnico antes da decisão.</h2>
        <p>O ATLAS cruza contexto, risco e impacto para organizar uma hipótese verificável.</p>
        <div className="brief-metrics">
          <div><span>01</span><p>Identifica o provável gargalo</p></div>
          <div><span>02</span><p>Propõe componentes e limites</p></div>
          <div><span>03</span><p>Prioriza resposta e evolução</p></div>
        </div>
        <div className="brief-guardrail"><ShieldCheck size={16} /><span><strong>Human in the loop</strong><small>Nenhuma ação é executada automaticamente.</small></span></div>
      </aside>
      </div>
    </main>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ArchitectureNode({ id, x, y, selected, onSelect, className = '' }) {
  const item = nodeDetails[id];
  const Icon = item.icon;
  return (
    <button
      className={`architecture-node ${className} ${selected ? 'selected' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => onSelect(id)}
    >
      <span className="node-icon"><Icon size={17} /></span>
      <span><strong>{item.title}</strong><small>{item.type}</small></span>
    </button>
  );
}

function Connector({ x, y, w, rotate = 0, dashed = false }) {
  return <span className={`connector ${dashed ? 'dashed' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, transform: `rotate(${rotate}deg)` }}><i /></span>;
}

function ArchitectureStep({ form, onBack, onNext }) {
  const [selected, setSelected] = useState('checkout');
  const [layer, setLayer] = useState('proposed');
  const detail = nodeDetails[selected];
  const Icon = detail.icon;

  return (
    <main className="page wide-page">
      <section className="result-heading">
        <div>
          <div className="eyebrow"><CircleGauge size={14} /> DIAGNÓSTICO CONCLUÍDO · CONFIANÇA ALTA</div>
          <h1>Arquitetura proposta</h1>
          <p>{form.symptom} em {form.environment.toLowerCase()} · {form.traffic}</p>
        </div>
        <div className="risk-summary">
          <span>RISCO ATUAL</span>
          <strong>Alto</strong>
          <small>3 pontos críticos</small>
        </div>
      </section>

      <div className="insight-strip">
        <div className="insight-icon"><Zap size={18} /></div>
        <div><strong>Hipótese principal</strong><p>Chamadas remotas dentro da transação ampliam locks; o pool satura enquanto o consumer perde vazão.</p></div>
        <div className="confidence"><span>Confiança</span><strong>86%</strong></div>
      </div>

      <section className="architecture-layout">
        <div className="canvas-card">
          <div className="canvas-toolbar">
            <div><Network size={17} /><strong>Mapa de componentes</strong></div>
            <div className="segmented">
              <button className={layer === 'current' ? 'active' : ''} onClick={() => setLayer('current')}>Atual</button>
              <button className={layer === 'proposed' ? 'active' : ''} onClick={() => setLayer('proposed')}>Proposta ATLAS</button>
            </div>
          </div>
          <div className={`architecture-canvas ${layer}`}>
            <div className="lane lane-core"><span>CORE TRANSACIONAL</span></div>
            <div className="lane lane-advisory"><span>ZONA DE IA · FORA DO CORE</span></div>
            <Connector x={15} y={29} w={12} />
            <Connector x={32} y={29} w={11} />
            <Connector x={49} y={29} w={11} />
            <Connector x={66} y={27} w={10} rotate={-28} />
            <Connector x={66} y={31} w={10} rotate={28} />
            <Connector x={55} y={43} w={13} rotate={46} />
            <Connector x={72} y={56} w={9} />
            <Connector x={48} y={67} w={15} rotate={90} dashed />
            <Connector x={67} y={67} w={15} rotate={90} dashed />
            <Connector x={77} y={77} w={8} dashed />

            <ArchitectureNode id="channels" x={3} y={21} selected={selected === 'channels'} onSelect={setSelected} />
            <ArchitectureNode id="gateway" x={21} y={21} selected={selected === 'gateway'} onSelect={setSelected} />
            <ArchitectureNode id="bff" x={38} y={21} selected={selected === 'bff'} onSelect={setSelected} />
            <ArchitectureNode id="checkout" x={55} y={21} selected={selected === 'checkout'} onSelect={setSelected} className="critical" />
            <ArchitectureNode id="redis" x={74} y={9} selected={selected === 'redis'} onSelect={setSelected} />
            <ArchitectureNode id="postgres" x={74} y={36} selected={selected === 'postgres'} onSelect={setSelected} className="critical" />
            <ArchitectureNode id="kafka" x={44} y={58} selected={selected === 'kafka'} onSelect={setSelected} className="critical" />
            <ArchitectureNode id="worker" x={67} y={58} selected={selected === 'worker'} onSelect={setSelected} />
            <ArchitectureNode id="telemetry" x={44} y={82} selected={selected === 'telemetry'} onSelect={setSelected} />
            <ArchitectureNode id="atlas" x={76} y={82} selected={selected === 'atlas'} onSelect={setSelected} className="ai-node" />
          </div>
          <div className="canvas-legend"><span><i className="legend-dot risk" /> Risco identificado</span><span><i className="legend-dot chosen" /> Selecionado</span><span><i className="legend-line" /> Telemetria / consulta</span></div>
        </div>

        <aside className="inspector-card">
          <div className="inspector-top">
            <span className="large-node-icon"><Icon size={22} /></span>
            <div><span>{detail.type}</span><h2>{detail.title}</h2></div>
          </div>
          <p className="inspector-description">{detail.description}</p>
          <div className="detail-block"><span>TECNOLOGIA SUGERIDA</span><strong>{detail.technology}</strong></div>
          <div className="detail-block decision"><span>DECISÃO-CHAVE</span><p>{detail.decision}</p></div>
          <div className="detail-block warning"><span>PONTO DE ATENÇÃO</span><p>{detail.risk}</p></div>
          <button className="text-button" onClick={onNext}>Ver recomendações deste cenário <ChevronRight size={16} /></button>
        </aside>
      </section>

      <div className="page-actions">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={16} /> Ajustar contexto</button>
        <button className="primary-button" onClick={onNext}>Explorar plano de ação <ArrowRight size={17} /></button>
      </div>
    </main>
  );
}

function PlanStep({ onBack }) {
  const [category, setCategory] = useState('resilience');
  const [checked, setChecked] = useState([0]);
  const [toast, setToast] = useState(false);
  const completion = Math.round((checked.length / runbook.length) * 100);

  const copyPlan = async () => {
    const text = ['ATLAS — Plano de ação', ...recommendations[category].map((item) => `${item.priority} · ${item.title}: ${item.text}`), '', 'Runbook', ...runbook.map((item, i) => `${i + 1}. ${item}`)].join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* preview environments may deny clipboard */ }
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  };

  const toggle = (index) => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);

  return (
    <main className="page wide-page plan-page">
      <section className="result-heading">
        <div>
          <div className="eyebrow"><Waypoints size={14} /> DECISÃO ORIENTADA POR EVIDÊNCIAS</div>
          <h1>Plano recomendado pelo ATLAS</h1>
          <p>Prioridades técnicas, justificativas e um runbook executável para o time.</p>
        </div>
        <button className="ghost-button" onClick={copyPlan}><Clipboard size={16} /> Copiar plano</button>
      </section>

      <section className="recommendation-card">
        <div className="category-tabs">
          {categories.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}><Icon size={16} />{item.label}</button>;
          })}
        </div>
        <div className="recommendation-list">
          {recommendations[category].map((item, index) => (
            <article className="recommendation" key={item.title}>
              <div className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</div>
              <div className="recommendation-number">0{index + 1}</div>
              <div className="recommendation-content">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span><Search size={13} /> Por quê: {item.evidence}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lower-grid">
        <div className="runbook-card">
          <div className="runbook-heading">
            <div><span className="icon-square"><FileSearch size={18} /></span><div><h2>Runbook de troubleshooting</h2><p>Execute do sinal até a correção estrutural.</p></div></div>
            <strong>{completion}%</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
          <div className="check-list">
            {runbook.map((item, index) => (
              <label key={item} className={checked.includes(index) ? 'checked' : ''}>
                <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
                <span className="fake-checkbox">{checked.includes(index) && <Check size={13} />}</span>
                <span className="check-number">{String(index + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <aside className="guardrail-card">
          <div className="guardrail-visual"><Bot size={30} /><span><i /><i /><i /></span></div>
          <div className="guardrail-label"><ShieldCheck size={14} /> GUARDRAIL DE IA</div>
          <h2>IA aconselha.<br />O core decide.</h2>
          <p>RAG consulta conhecimento aprovado. MCP lê ferramentas autorizadas. Nenhum modelo participa da transação ou executa mudanças sem aprovação.</p>
          <div className="guardrail-chips"><span>Read-only</span><span>PII masked</span><span>Audit trail</span></div>
        </aside>
      </section>

      <div className="page-actions">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={16} /> Voltar à arquitetura</button>
        <div className="prototype-note"><MessageSquareText size={15} /> Resultado demonstrativo · recomendações não executadas</div>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={17} /> Plano copiado</div>}
    </main>
  );
}

export function App() {
  const [step, setStep] = useState(1);
  const emptyForm = useMemo(() => ({ description: '', environment: 'Produção', traffic: '2k–10k req/min', symptom: 'Latência e erros', priority: 'Alta' }), []);
  const [form, setForm] = useState(emptyForm);

  const restart = () => { setStep(1); setForm(emptyForm); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const go = (next) => { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="app-shell">
      <ControlRail step={step} onStep={go} />
      <div className="workspace">
        <Header step={step} onRestart={restart} />
        {step === 1 && <ContextStep form={form} setForm={setForm} onDemo={() => setForm(demoScenario)} onAnalyze={() => go(2)} />}
        {step === 2 && <ArchitectureStep form={form} onBack={() => go(1)} onNext={() => go(3)} />}
        {step === 3 && <PlanStep onBack={() => go(2)} />}
        <footer><span>ATLAS v0.2 · Architecture Command Center</span><span>Human-in-the-loop decision support</span></footer>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
