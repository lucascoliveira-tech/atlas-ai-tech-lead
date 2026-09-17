import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Cloud,
  Eye,
  Gauge,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Waypoints,
  XCircle,
  Zap,
} from 'lucide-react';
import './styles.css';
import { atlasConfig, isDemoMode } from './config/atlasConfig';
import { createIdempotencyKey } from './services/idempotency';
import { createDiagnosticSession, generateAnalysis, getLatestAnalysis } from './services/diagnosticService';
import { clearSessionState, loadSessionState, saveSessionState } from './services/sessionStorage';

// Prefills the form with example text only; it is never sent as a canned result.
const demoScenario = {
  description:
    'Durante campanhas, o checkout apresenta p95 acima de 6s e 8% de erros. Há aumento do lag no Kafka, chamadas síncronas ao serviço de antifraude e saturação do pool de conexões do PostgreSQL.',
  environment: 'Produção',
  traffic: '2k–10k req/min',
  symptom: 'Latência e erros',
  priority: 'Crítica',
};

const planCategories = [
  { id: 'resilience', label: 'Resiliência', icon: ShieldCheck },
  { id: 'observability', label: 'Observabilidade', icon: Eye },
  { id: 'decisions', label: 'Decisões', icon: Waypoints },
  { id: 'ai', label: 'IA · RAG · MCP', icon: Bot },
];

function deriveTitle(description) {
  const normalized = description.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 160) return normalized;
  const truncated = normalized.slice(0, 160);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 40 ? lastSpace : 160)}…`;
}

function composeScenario(form) {
  return [
    form.description.trim(),
    '',
    `Contexto informado pelo usuário: ambiente ${form.environment}; volume estimado ${form.traffic}; sintoma principal ${form.symptom}; prioridade ${form.priority}.`,
  ].join('\n');
}

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
        {isDemoMode() && <div className="mode-badge">MODO DEMONSTRAÇÃO</div>}
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
      <div className="rail-version">ATLAS / BUILD 0.3</div>
    </aside>
  );
}

function ConfigErrorScreen({ message }) {
  return (
    <main className="page context-page">
      <section className="hero-block">
        <div className="eyebrow"><AlertTriangle size={14} /> CONFIGURAÇÃO INVÁLIDA</div>
        <h1>Não foi possível iniciar o ATLAS.</h1>
        <p>{message}</p>
      </section>
      <StateBanner kind="error" icon={XCircle}>
        Ajuste as variáveis VITE_ATLAS_MODE / VITE_API_BASE_URL no arquivo .env e recarregue a página.
      </StateBanner>
    </main>
  );
}

function StateBanner({ kind = 'info', icon: Icon, children }) {
  return (
    <div className={`state-banner ${kind}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

function ContextStep({ form, setForm, onAnalyze, onDemo, phase, errorMessage }) {
  const isReady = form.description.trim().length > 20;
  const isLoading = phase === 'loading';
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
          <button className="demo-button" onClick={onDemo} disabled={isLoading}>
            <Play size={14} fill="currentColor" /> Carregar exemplo
          </button>
        </div>

        <label className="field-label" htmlFor="scenario">Cenário ou gargalo</label>
        <div className="textarea-wrap">
          <textarea
            id="scenario"
            value={form.description}
            maxLength={520}
            disabled={isLoading}
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

        {phase === 'error' && (
          <StateBanner kind="error" icon={XCircle}>{errorMessage}</StateBanner>
        )}

        <div className="card-footer">
          <div className="analysis-hints">
            <span><CheckCircle2 size={14} /> {isDemoMode() ? 'Sessão de demonstração local' : 'Sessão persistida no Core API'}</span>
            <span><CheckCircle2 size={14} /> Recomendações rastreáveis</span>
          </div>
          <button className="primary-button" disabled={!isReady || isLoading} onClick={onAnalyze}>
            {isLoading ? (<><Loader2 size={17} className="icon-spin" /> Analisando…</>) : (<>Analisar cenário <ArrowRight size={17} /></>)}
          </button>
        </div>
      </section>
      <aside className="command-brief">
        <div className="brief-top"><Gauge size={19} /><span>ANALYSIS SCOPE</span></div>
        <h2>Um briefing técnico antes da decisão.</h2>
        <p>{isDemoMode() ? 'O cenário roda inteiramente no navegador, usando dados fictícios de demonstração.' : 'O cenário é enviado ao Core API, que persiste a sessão e gera a análise arquitetural.'}</p>
        <div className="brief-metrics">
          <div><span>01</span><p>Cria a sessão de diagnóstico</p></div>
          <div><span>02</span><p>{isDemoMode() ? 'Gera a análise localmente, com dados fictícios' : 'Solicita a análise ao Core'}</p></div>
          <div><span>03</span><p>Apresenta o resultado {isDemoMode() ? 'gerado' : 'persistido'}</p></div>
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

function ArchitectureStep({ analysis, sessionMeta, onBack, onNext }) {
  const result = analysis.result;
  return (
    <main className="page wide-page">
      <section className="result-heading">
        <div>
          <div className="eyebrow"><Network size={14} /> ANÁLISE {analysis.status === 'COMPLETED' ? 'CONCLUÍDA' : analysis.status} · {isDemoMode() ? 'MODO DEMONSTRAÇÃO' : 'CORE API'}</div>
          <h1>Arquitetura proposta</h1>
          <p>{sessionMeta?.title}</p>
        </div>
        <div className="risk-summary">
          <span>RISCOS</span>
          <strong>{result.risks?.length ?? 0}</strong>
          <small>{isDemoMode() ? 'identificados na demonstração' : 'identificados pelo Core'}</small>
        </div>
      </section>

      <div className="insight-strip">
        <div className="insight-icon"><Zap size={18} /></div>
        <div><strong>{isDemoMode() ? 'Resumo (demonstração)' : 'Resumo do Core API'}</strong><p>{result.summary}</p></div>
        <div className="confidence"><span>Schema</span><strong>{result.schemaVersion}</strong></div>
      </div>

      <section className="architecture-layout">
        <div className="canvas-card">
          <div className="canvas-toolbar">
            <div><Boxes size={17} /><strong>Componentes sugeridos</strong></div>
          </div>
          {result.suggestedComponents?.length ? (
            <div className="component-grid">
              {result.suggestedComponents.map((component) => (
                <article className="component-card" key={component.name}>
                  <span className="component-icon"><Boxes size={16} /></span>
                  <div><strong>{component.name}</strong><p>{component.responsibility}</p></div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Nenhum componente sugerido para este cenário.</p>
          )}
        </div>

        <aside className="inspector-card">
          <div className="inspector-top">
            <span className="large-node-icon"><Cloud size={22} /></span>
            <div><span>TECNOLOGIAS RECOMENDADAS</span><h2>Stack sugerida</h2></div>
          </div>
          {result.recommendedTechnologies?.length ? (
            <ul className="tech-list">
              {result.recommendedTechnologies.map((tech) => (
                <li key={`${tech.category}-${tech.technology}`}>
                  <strong>{tech.category}:</strong> {tech.technology}
                  <small>{tech.rationale}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Nenhuma tecnologia recomendada retornada.</p>
          )}

          <div className="detail-block warning">
            <span>RISCOS IDENTIFICADOS</span>
            {result.risks?.length ? (
              <ul className="risk-list">
                {result.risks.map((risk) => (
                  <li key={risk.description}>
                    <AlertTriangle size={13} /> {risk.description}
                    <small>Impacto: {risk.impact}</small>
                    <small>Mitigação: {risk.mitigation}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Nenhum risco retornado para este cenário.</p>
            )}
          </div>
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

function PlanCategoryContent({ category, result }) {
  if (category === 'resilience' || category === 'observability') {
    const items = category === 'resilience' ? result.resilienceRecommendations : result.observabilityRecommendations;
    if (!items?.length) return <p className="empty-state">Nenhuma recomendação retornada nesta categoria.</p>;
    return (
      <div className="recommendation-list">
        {items.map((text, index) => (
          <article className="recommendation" key={text}>
            <div className="recommendation-number">0{index + 1}</div>
            <div className="recommendation-content"><p>{text}</p></div>
          </article>
        ))}
      </div>
    );
  }
  if (category === 'decisions') {
    if (!result.decisions?.length) return <p className="empty-state">Nenhuma decisão retornada para este cenário.</p>;
    return (
      <div className="decision-list">
        {result.decisions.map((decision) => (
          <article className="decision-card" key={decision.decision}>
            <h3>{decision.decision}</h3>
            <p className="decision-choice"><strong>Escolha:</strong> {decision.chosenOption}</p>
            {decision.alternatives?.length > 0 && (
              <p><strong>Alternativas:</strong> {decision.alternatives.join(', ')}</p>
            )}
            <p className="decision-tradeoffs">{decision.tradeOffs}</p>
          </article>
        ))}
      </div>
    );
  }
  const guidance = result.intelligenceGuidance;
  if (!guidance) return <p className="empty-state">Nenhuma orientação de IA/RAG/MCP retornada.</p>;
  return (
    <div className="guidance-grid">
      <div><span>QUANDO IA AJUDA</span><p>{guidance.whenAiHelps}</p></div>
      <div><span>QUANDO RAG AJUDA</span><p>{guidance.whenRagHelps}</p></div>
      <div><span>QUANDO MCP AJUDA</span><p>{guidance.whenMcpHelps}</p></div>
      <div><span>QUANDO NÃO É NECESSÁRIO</span><p>{guidance.whenNotNeeded}</p></div>
    </div>
  );
}

function PlanStep({ analysis, sessionMeta, onBack, onRefresh, refreshPhase, refreshError }) {
  const [category, setCategory] = useState('resilience');
  const [toast, setToast] = useState(false);
  const result = analysis.result;

  const copyPlan = async () => {
    const lines = ['ATLAS — Plano de ação', '', 'Resumo', result.summary, ''];
    if (result.resilienceRecommendations?.length) lines.push('Resiliência', ...result.resilienceRecommendations.map((t) => `- ${t}`), '');
    if (result.observabilityRecommendations?.length) lines.push('Observabilidade', ...result.observabilityRecommendations.map((t) => `- ${t}`), '');
    if (result.decisions?.length) lines.push('Decisões', ...result.decisions.map((d) => `- ${d.decision}: ${d.chosenOption}`), '');
    try { await navigator.clipboard.writeText(lines.join('\n')); } catch { /* clipboard may be unavailable in preview environments */ }
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  };

  return (
    <main className="page wide-page plan-page">
      <section className="result-heading">
        <div>
          <div className="eyebrow"><Waypoints size={14} /> DECISÃO ORIENTADA POR EVIDÊNCIAS</div>
          <h1>Plano recomendado pelo ATLAS</h1>
          <p>{isDemoMode() ? `Resultado gerado em modo demonstração (dados fictícios) para a sessão ${sessionMeta?.id}.` : `Resultado real do Core API para a sessão ${sessionMeta?.id}.`}</p>
        </div>
        <button className="ghost-button" onClick={copyPlan}><Clipboard size={16} /> Copiar plano</button>
      </section>

      <section className="recommendation-card">
        <div className="category-tabs">
          {planCategories.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}><Icon size={16} />{item.label}</button>;
          })}
        </div>
        <PlanCategoryContent category={category} result={result} />
      </section>

      <section className="lower-grid">
        <div className="runbook-card">
          <div className="runbook-heading">
            <div><span className="icon-square"><MessageSquareText size={18} /></span><div><h2>Sessão de diagnóstico</h2><p>{isDemoMode() ? 'Dados fictícios de demonstração, não persistidos.' : 'Dados persistidos pelo Core API.'}</p></div></div>
          </div>
          <div className="session-meta-list">
            <div><span>Session ID</span><span>{sessionMeta?.id}</span></div>
            <div><span>Analysis ID</span><span>{analysis.analysisId}</span></div>
            <div><span>Versão</span><span>{analysis.version}</span></div>
            <div><span>Status</span><span>{analysis.status}</span></div>
            <div><span>Criada em</span><span>{analysis.createdAt ? new Date(analysis.createdAt).toLocaleString('pt-BR') : '—'}</span></div>
            <div><span>Concluída em</span><span>{analysis.completedAt ? new Date(analysis.completedAt).toLocaleString('pt-BR') : '—'}</span></div>
          </div>
          <button className="ghost-button" onClick={onRefresh} disabled={refreshPhase === 'loading'}>
            {refreshPhase === 'loading' ? (<><Loader2 size={15} className="icon-spin" /> Consultando…</>) : (<><RefreshCw size={15} /> Consultar novamente</>)}
          </button>
          {refreshPhase === 'error' && <StateBanner kind="error" icon={XCircle}>{refreshError}</StateBanner>}
        </div>

        <aside className="guardrail-card">
          <div className="guardrail-visual"><Bot size={30} /><span><i /><i /><i /></span></div>
          <div className="guardrail-label"><ShieldCheck size={14} /> GUARDRAIL DE IA</div>
          <h2>IA aconselha.<br />O core decide.</h2>
          <p>{result.intelligenceGuidance?.whenNotNeeded}</p>
          <div className="guardrail-chips"><span>Read-only</span><span>PII masked</span><span>Audit trail</span></div>
        </aside>
      </section>

      <div className="page-actions">
        <button className="ghost-button" onClick={onBack}><ArrowLeft size={16} /> Voltar à arquitetura</button>
        <div className="prototype-note"><MessageSquareText size={15} /> {isDemoMode() ? 'Modo demonstração · nenhuma chamada ao Core API' : 'Dados reais do Core API · nenhuma ação executada automaticamente'}</div>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={17} /> Plano copiado</div>}
    </main>
  );
}

export function App() {
  const [step, setStep] = useState(1);
  const emptyForm = useMemo(() => ({ description: '', environment: 'Produção', traffic: '2k–10k req/min', symptom: 'Latência e erros', priority: 'Alta' }), []);
  const [form, setForm] = useState(emptyForm);
  const [phase, setPhase] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [refreshPhase, setRefreshPhase] = useState('idle');
  const [refreshError, setRefreshError] = useState(null);
  const pendingSessionRef = useRef(null);

  useEffect(() => {
    const saved = loadSessionState();
    if (!saved?.sessionId || saved.mode !== atlasConfig.mode) return;
    getLatestAnalysis(saved.sessionId)
      .then((latest) => {
        setAnalysis(latest);
        setSessionMeta({ id: saved.sessionId, title: saved.title, scenario: saved.scenario });
        setStep(2);
      })
      .catch(() => {
        // Session exists but no analysis was completed yet (e.g. the previous attempt failed).
        // Keep the same session/idempotency key so retrying does not create a duplicate session.
        pendingSessionRef.current = { sessionId: saved.sessionId, idempotencyKey: saved.idempotencyKey, title: saved.title, scenario: saved.scenario };
        if (saved.form) setForm(saved.form);
      });
  }, []);

  const go = (next) => { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const restart = () => {
    setStep(1);
    setForm(emptyForm);
    setAnalysis(null);
    setSessionMeta(null);
    setPhase('idle');
    setErrorMessage(null);
    pendingSessionRef.current = null;
    clearSessionState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    setPhase('loading');
    setErrorMessage(null);
    try {
      let pending = pendingSessionRef.current;
      if (!pending) {
        const title = deriveTitle(form.description);
        const scenario = composeScenario(form);
        const session = await createDiagnosticSession({ title, scenario });
        pending = { sessionId: session.id, idempotencyKey: createIdempotencyKey(), title: session.title, scenario: session.scenario };
        pendingSessionRef.current = pending;
        saveSessionState({ ...pending, mode: atlasConfig.mode, form });
      }
      const analysisResponse = await generateAnalysis({ sessionId: pending.sessionId, idempotencyKey: pending.idempotencyKey });
      setAnalysis(analysisResponse);
      setSessionMeta({ id: pending.sessionId, title: pending.title, scenario: pending.scenario });
      pendingSessionRef.current = null;
      setPhase('idle');
      go(2);
    } catch (error) {
      setErrorMessage(error.message || 'Falha inesperada ao comunicar com o Core API.');
      setPhase('error');
    }
  };

  const handleRefreshAnalysis = async () => {
    if (!sessionMeta?.id) return;
    setRefreshPhase('loading');
    setRefreshError(null);
    try {
      const latest = await getLatestAnalysis(sessionMeta.id);
      setAnalysis(latest);
      setRefreshPhase('idle');
    } catch (error) {
      setRefreshError(error.message || 'Não foi possível consultar a análise.');
      setRefreshPhase('error');
    }
  };

  return (
    <div className="app-shell">
      <ControlRail step={step} onStep={go} />
      <div className="workspace">
        <Header step={step} onRestart={restart} />
        {atlasConfig.configError ? (
          <ConfigErrorScreen message={atlasConfig.configError} />
        ) : (
          <>
            {step === 1 && (
              <ContextStep
                form={form}
                setForm={setForm}
                onDemo={() => setForm(demoScenario)}
                onAnalyze={handleAnalyze}
                phase={phase}
                errorMessage={errorMessage}
              />
            )}
            {step === 2 && analysis && (
              <ArchitectureStep analysis={analysis} sessionMeta={sessionMeta} onBack={() => go(1)} onNext={() => go(3)} />
            )}
            {step === 3 && analysis && (
              <PlanStep
                analysis={analysis}
                sessionMeta={sessionMeta}
                onBack={() => go(2)}
                onRefresh={handleRefreshAnalysis}
                refreshPhase={refreshPhase}
                refreshError={refreshError}
              />
            )}
          </>
        )}
        <footer><span>ATLAS v0.3 · Architecture Command Center</span><span>Human-in-the-loop decision support</span></footer>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
