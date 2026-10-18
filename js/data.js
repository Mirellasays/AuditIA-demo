(function (global) {
const DEMO_NOTICE = "Ambiente de demonstração — dados e análises simulados.";

const USERS = {
  auditor: {
    id: "usr-auditora",
    name: "Dra. Médica Demonstração",
    role: "Médico auditor",
    crm: "CRM-DEMO 00000/UF (fictício)",
    operator: "Operadora Exemplo Saúde",
  },
  manager: {
    id: "usr-gestor",
    name: "Dr. Gestor Demonstração",
    role: "Gestor médico",
    crm: "CRM-DEMO 00001/UF (fictício)",
    operator: "Operadora Exemplo Saúde",
  },
};

const STATUSES = {
  draft: "Rascunho",
  ready: "Pronto para análise",
  processing: "Em análise simulada",
  review: "Aguardando revisão médica",
  pending: "Pendente de documentação",
  reviewed: "Revisado pelo médico",
  failed: "Falha na análise",
};

const SCENARIOS = {
  complete: "Documentação completa",
  missing: "Documento ausente",
  contradictory: "Informações contraditórias",
  inconclusive: "Conteúdo inconclusivo ou ilegível",
  failure: "Falha técnica de processamento",
};

const CATEGORIES = {
  imaging: "Exame de imagem",
  surgery: "Procedimento cirúrgico",
  checklist: "Procedimento com checklist documental",
};

const CHECKLISTS = {
  imaging: [
    { id: "IMG-01", description: "Justificativa clínica registrada", document: "Solicitação clínica", reference: "REF-IMG-01", version: "1.0" },
    { id: "IMG-02", description: "Relatório clínico de apoio", document: "Relatório médico fictício", reference: "REF-IMG-01", version: "1.0" },
    { id: "IMG-03", description: "Identificação do exame solicitado", document: "Solicitação clínica", reference: "REF-IMG-02", version: "1.0" },
  ],
  surgery: [
    { id: "CIR-01", description: "Justificativa clínica registrada", document: "Solicitação clínica", reference: "REF-CIR-01", version: "1.0" },
    { id: "CIR-02", description: "Relatório de avaliação prévia", document: "Relatório clínico fictício", reference: "REF-CIR-02", version: "1.0" },
    { id: "CIR-03", description: "Descrição do procedimento solicitado", document: "Solicitação clínica", reference: "REF-CIR-03", version: "1.0" },
  ],
  checklist: [
    { id: "DOC-01", description: "Solicitação clínica identificada", document: "Solicitação clínica", reference: "REF-DOC-01", version: "1.0" },
    { id: "DOC-02", description: "Relatório de apoio anexado", document: "Relatório clínico fictício", reference: "REF-DOC-02", version: "1.0" },
    { id: "DOC-03", description: "Identificação dos itens solicitados", document: "Formulário demonstrativo", reference: "REF-DOC-03", version: "1.0" },
  ],
};

const REFERENCES = [
  { id: "REF-IMG-01", title: "Checklist demonstrativo — exame de imagem", version: "1.0", date: "2026-01-15", content: "Exemplo de conferência da presença de justificativa e relatório clínico. Conteúdo fictício, sem valor normativo." },
  { id: "REF-IMG-02", title: "Identificação de solicitação de imagem", version: "1.0", date: "2026-01-15", content: "Exemplo de identificação do exame descrito na solicitação. Não representa código oficial." },
  { id: "REF-CIR-01", title: "Checklist demonstrativo — procedimento cirúrgico", version: "1.0", date: "2026-01-15", content: "Exemplo de conferência documental para procedimento cirúrgico. Não utilizar para decisão de cobertura." },
  { id: "REF-CIR-02", title: "Relatório clínico — procedimento cirúrgico", version: "1.0", date: "2026-01-15", content: "Conteúdo fictício para demonstração da correspondência entre item e documento." },
  { id: "REF-CIR-03", title: "Descrição do procedimento solicitado", version: "1.0", date: "2026-01-15", content: "Critério demonstrativo para identificar a descrição no pedido." },
  { id: "REF-DOC-01", title: "Checklist documental geral", version: "1.0", date: "2026-01-15", content: "Exemplo não oficial para conferência de solicitação clínica." },
  { id: "REF-DOC-02", title: "Documento de apoio clínico", version: "1.0", date: "2026-01-15", content: "Exemplo de conferência da presença de documento complementar." },
  { id: "REF-DOC-03", title: "Identificação de itens", version: "1.0", date: "2026-01-15", content: "Checklist fictício para identificação dos itens solicitados." },
];

const dateAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const doc = (name, text, page = 1) => ({ id: crypto.randomUUID(), name, type: "text/plain", size: 0, source: "example", pages: [{ page, text }] });

function makeCase(n, opts = {}) {
  const category = opts.category || ["imaging", "surgery", "checklist"][n % 3];
  const scenario = opts.scenario || ["complete", "missing", "contradictory", "inconclusive"][n % 4];
  const baseDocs = [
    doc("Solicitação clínica fictícia.txt", "Solicitação fictícia. Justificativa clínica: investigação diagnóstica demonstrativa. Exame/procedimento solicitado: " + (category === "imaging" ? "Imagem demonstrativa" : "Procedimento demonstrativo") + ".", 1),
    doc("Relatório clínico fictício.txt", "Documento de demonstração. Avaliação clínica fictícia registrada para fins de apresentação; não corresponde a paciente real.", 2),
    doc("Formulário demonstrativo.txt", "Formulário fictício com identificação dos itens solicitados para esta demonstração.", 1),
  ];
  if (scenario === "missing") baseDocs.splice(1, 1);
  if (scenario === "contradictory") baseDocs[1].pages[0].text = "Documento fictício: avaliação clínica demonstrativa. Informação divergente: o texto descreve modalidade diferente da solicitação.";
  if (scenario === "inconclusive") baseDocs[1].pages[0].text = "[Conteúdo demonstrativo inconclusivo/ilegível; nenhum achado clínico pode ser inferido.]";
  const state = opts.status || (n === 1 ? "pending" : n === 2 ? "review" : n === 3 ? "failed" : n < 6 ? "reviewed" : "ready");
  const item = {
    id: `AUD-${String(1001 + n).padStart(5, "0")}`,
    beneficiary: `Beneficiário Exemplo ${String(n + 1).padStart(2, "0")}`,
    beneficiaryCode: `BEN-DEMO-${String(n + 1).padStart(3, "0")}`,
    age: ["18–29", "30–44", "45–59", "60–74"][n % 4],
    category,
    procedure: ["Ressonância demonstrativa", "Procedimento cirúrgico fictício", "Checklist assistencial demonstrativo"][n % 3],
    code: `COD-DEMO-${String(n + 1).padStart(3, "0")}`,
    reason: "Justificativa clínica inteiramente fictícia para demonstração do fluxo de auditoria.",
    createdAt: dateAgo(8 - n),
    dueDate: new Date(Date.now() + (n % 2 ? -2 : 5) * 86400000).toISOString().slice(0, 10),
    priority: n % 3 === 0 ? "Alta" : n % 3 === 1 ? "Normal" : "Baixa",
    assignee: n % 2 ? USERS.auditor.id : USERS.manager.id,
    documents: baseDocs,
    scenario,
    status: state,
    analysis: null,
    analysisHistory: [],
    failureMessage: state === "failed" ? "Falha técnica simulada; nenhuma conclusão foi gerada." : "",
    review: null,
    reviewHistory: [],
    updatedAt: dateAgo(7 - n),
    events: [{ action: "Caso de demonstração criado", user: "Sistema demonstrativo", at: dateAgo(8 - n) }],
  };
  if (!["draft", "ready", "failed"].includes(state)) item.analysis = createSeedAnalysis(item, scenario);
  if (state === "reviewed") {
    item.review = {
      criteria: item.analysis.criteria.map((c, i) => ({ ...c, status: i === 2 && n === 4 ? "Inconclusivo" : c.status, justification: i === 2 && n === 4 ? "Ajuste médico fictício para demonstrar rastreabilidade." : "" })),
      summary: item.analysis.summary,
      observations: "Revisão demonstrativa; sem conclusão clínica ou assistencial real.",
      reviewer: USERS.auditor.id,
      at: dateAgo(6 - n),
      analysisVersion: item.analysis.version,
      checklistVersion: "1.0",
      changes: n === 4 ? 1 : 0,
      confirmed: true,
    };
    item.events.push({ action: "Análise simulada executada", user: "Sistema demonstrativo", at: dateAgo(7 - n) });
    item.events.push({ action: "Revisão médica demonstrativa concluída", user: USERS.auditor.name, at: item.review.at });
  } else if (state === "pending") {
    item.pendingReason = "Documento de apoio não anexado (cenário de demonstração).";
    item.events.push({ action: "Análise simulada executada", user: "Sistema demonstrativo", at: dateAgo(7 - n) });
    item.events.push({ action: "Pendência documental registrada", user: USERS.auditor.name, at: dateAgo(6 - n) });
  } else if (state === "review") {
    item.events.push({ action: "Análise simulada executada", user: "Sistema demonstrativo", at: dateAgo(7 - n) });
  } else if (state === "failed") {
    item.events.push({ action: "Falha técnica na análise simulada", user: "Sistema demonstrativo", at: dateAgo(7 - n) });
  }
  return item;
}

function createSeedAnalysis(item, scenario) {
  const checklist = CHECKLISTS[item.category];
  const criteria = checklist.map((c, i) => ({
    ...c,
    status: scenario === "missing" && i === 1 ? "Não documentado" :
      scenario === "contradictory" && i === 1 ? "Contraditório" :
      scenario === "inconclusive" && i === 1 ? "Inconclusivo" : "Documentado",
    evidence: i === 1 && scenario === "missing" ? null : {
      document: item.documents[Math.min(i, item.documents.length - 1)]?.name || "Documento fictício",
      page: item.documents[Math.min(i, item.documents.length - 1)]?.pages?.[0]?.page || 1,
      excerpt: item.documents[Math.min(i, item.documents.length - 1)]?.pages?.[0]?.text || "",
      reference: c.reference,
      referenceVersion: c.version,
    },
  }));
  return {
    version: 1,
    scenario,
    createdAt: dateAgo(7),
    stale: false,
    consideredDocuments: item.documents.map((d) => ({ id: d.id, name: d.name, source: d.source })),
    criteria,
    pending: criteria.filter((c) => c.status === "Não documentado").map((c) => `${c.id}: ${c.document} não localizado no cenário`),
    contradictions: criteria.filter((c) => c.status === "Contraditório").map((c) => `${c.id}: informações demonstrativas divergentes`),
    limitations: ["Saída determinística de cenário mock; conteúdo de arquivos anexados pelo usuário não é lido.", "Checklist e referências inteiramente fictícios."],
    summary: "Rascunho técnico simulado: foram conferidos itens documentais demonstrativos. Este texto não indica autorização, negativa ou parecer médico.",
  };
}

function createDemoCases() {
  return Array.from({ length: 8 }, (_, i) => makeCase(i, i === 7 ? { category: "checklist", scenario: "failure", status: "failed" } : {}));
}

function newEvent(action, user) {
  return { action, user, at: new Date().toISOString() };
}

global.AuditIAData = { DEMO_NOTICE, USERS, STATUSES, SCENARIOS, CATEGORIES, CHECKLISTS, REFERENCES, createDemoCases, newEvent };
})(globalThis);
