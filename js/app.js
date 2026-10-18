(function (global) {
const { analyzeCase } = global.AuditIAAnalysis;
const { CATEGORIES, CHECKLISTS, DEMO_NOTICE, REFERENCES, SCENARIOS, STATUSES, USERS, newEvent } = global.AuditIAData;
const { getCurrentUser, signIn, signOut, visibleCases } = global.AuditIAAuth;
const { loadCases, restoreDemo, saveCases } = global.AuditIAStorage;

const app = document.querySelector("#app");
let cases = loadCases();
let user = getCurrentUser();
let page = user ? "dashboard" : "login";
let selectedId = null;
let listFilter = "";
let listSearch = "";
let draftFiles = [];
let previewFileUrls = new Map();
let running = false;

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const visible = () => visibleCases(cases, user);
const currentCase = () => cases.find((item) => item.id === selectedId);
const save = () => saveCases(cases);
const fmtDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(date);
};
const statusClass = (status) => ({ "Revisado pelo médico": "success", "Pendente de documentação": "warning", "Falha na análise": "danger", "Aguardando revisão médica": "info", "Pronto para análise": "neutral", "Rascunho": "neutral" }[status] || "neutral");
const icon = (name) => ({ dashboard: "▦", cases: "▤", new: "+", indicators: "◷", references: "⌕", settings: "⚙", report: "▧", review: "✓" }[name] || "•");

function persist() { save(); }
function event(item, action) {
  item.events ||= [];
  item.events.push(newEvent(action, user?.name || "Sistema demonstrativo"));
  item.updatedAt = new Date().toISOString();
}
function markStale(item) {
  if (item.analysis) item.analysis.stale = true;
  if (item.review) item.review.stale = true;
}
function setPage(next, id = null) {
  if (!user && next !== "login") { page = "login"; render(); return; }
  page = next;
  if (id) selectedId = id;
  if (next === "new") draftFiles = [];
  render();
}
function notice(message, kind = "success") {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  region.innerHTML = `<div class="toast ${kind}" role="status">${escapeHtml(message)}</div>`;
  setTimeout(() => { if (region) region.innerHTML = ""; }, 4200);
}
function button(label, action, cls = "button secondary", attrs = "") {
  return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
}

function renderLogin() {
  app.innerHTML = `<main class="login-shell">
    <section class="login-card">
      <div class="brand-mark">A<span>+</span></div>
      <p class="eyebrow">AMBIENTE CONTROLADO</p>
      <h1>AuditIA</h1>
      <p class="lead">Assistência à auditoria médica com evidências rastreáveis e revisão profissional.</p>
      <div class="demo-callout"><strong>Somente demonstração</strong><br>Use um dos perfis fictícios abaixo. Nenhuma credencial real é solicitada.</div>
      <div class="login-actions">
        <button class="button primary wide" data-action="login-auditor">Entrar como auditor</button>
        <button class="button secondary wide" data-action="login-manager">Entrar como gestor</button>
      </div>
      <details class="credentials"><summary>Credenciais fictícias visíveis</summary>
        <p><b>Médico auditor</b><br>auditor@demo.auditia / demonstração</p>
        <p><b>Gestor médico</b><br>gestor@demo.auditia / demonstração</p>
        <small>Os botões de acesso são atalhos locais; os dados não são enviados.</small>
      </details>
      <p class="disclaimer">O resultado automático não constitui autorização, negativa ou parecer médico definitivo.</p>
    </section>
    <div class="login-footer">${DEMO_NOTICE}</div>
  </main>`;
}

function shell(content) {
  const nav = [
    ["dashboard", "Visão geral"], ["cases", "Casos"], ["indicators", "Indicadores gerenciais"],
    ["references", "Referências"], ["settings", "Perfil e configurações"],
  ];
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" data-action="go" data-page="dashboard"><span class="brand-mark small">A<span>+</span></span><span>AuditIA<small>Auditoria demonstrativa</small></span></a>
      <div class="nav-caption">ESPAÇO DE TRABALHO</div>
      <nav aria-label="Navegação principal">${nav.map(([key, label]) => `<button class="nav-item ${page === key ? "active" : ""}" data-action="go" data-page="${key}"><span>${icon(key)}</span>${label}</button>`).join("")}</nav>
      <div class="sidebar-bottom"><span class="demo-dot"></span> Dados fictícios e simulados</div>
    </aside>
    <div class="main-area">
      <header class="topbar"><div class="breadcrumb">AuditIA <span>/</span> ${escapeHtml(pageLabel())}</div>
        <div class="user-menu"><div class="avatar">${escapeHtml(user.name.split(" ").slice(0, 2).map((s) => s[0]).join(""))}</div><div class="user-meta"><b>${escapeHtml(user.name)}</b><span>${escapeHtml(user.role)}</span></div><button class="icon-button" aria-label="Sair da sessão" title="Sair" data-action="logout">↪</button></div>
      </header>
      <div class="notice-bar">ⓘ ${DEMO_NOTICE} <span>Sem validade assistencial.</span></div>
      <main class="content">${content}</main>
    </div>
    <div id="toast-region" class="toast-region" aria-live="polite"></div>
  </div>`;
}

function pageLabel() {
  return ({ dashboard: "Visão geral", cases: "Casos", new: "Novo caso", detail: "Detalhe do caso", review: "Revisão médica", report: "Relatório", indicators: "Indicadores gerenciais", references: "Referências", settings: "Perfil e configurações" })[page] || "Visão geral";
}

function caseRows(items) {
  if (!items.length) return `<tr><td colspan="7" class="empty">Nenhum caso encontrado para este filtro.</td></tr>`;
  return items.map((item) => `<tr>
    <td><button class="link-button" data-action="open-case" data-id="${item.id}"><b>${escapeHtml(item.id)}</b></button><small>${escapeHtml(item.beneficiary)}</small></td>
    <td>${escapeHtml(item.procedure)}</td><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(USERS.auditor.id === item.assignee ? USERS.auditor.name : USERS.manager.name)}</td>
    <td><span class="status ${statusClass(STATUSES[item.status])}">${escapeHtml(STATUSES[item.status])}</span></td><td>${fmtDate(item.dueDate)}</td>
    <td><button class="icon-button" title="Abrir caso ${item.id}" data-action="open-case" data-id="${item.id}">→</button></td>
  </tr>`).join("");
}

function table(items) {
  return `<div class="table-wrap"><table><thead><tr><th>Caso / beneficiário</th><th>Procedimento</th><th>Prioridade</th><th>Responsável</th><th>Status</th><th>Prazo</th><th></th></tr></thead><tbody>${caseRows(items)}</tbody></table></div>`;
}

function metric(label, value, sub, filter, glyph = "•") {
  return `<button class="metric-card" data-action="metric-filter" data-filter="${filter}"><span class="metric-icon">${glyph}</span><span class="metric-label">${label}</span><strong>${value}</strong><small>${sub}</small></button>`;
}

function renderDashboard() {
  const items = visible();
  const average = items.filter((item) => item.review?.at).map((item) => Math.max(0, (new Date(item.review.at) - new Date(item.createdAt)) / 3600000));
  const avgText = average.length ? `${(average.reduce((a, b) => a + b, 0) / average.length).toFixed(1)} h` : "Sem dados suficientes";
  const count = (status) => items.filter((item) => item.status === status).length;
  const recent = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const buckets = Object.entries(STATUSES).map(([key, label]) => [label, count(key)]);
  return `<div class="page-heading"><div><p class="eyebrow">PAINEL DE CONTROLE</p><h1>Visão geral</h1><p>Resumo operacional dos casos fictícios disponíveis para seu perfil.</p></div>${button("＋ Novo caso", "go-new", "button primary")}</div>
    <div class="metric-grid">
      ${metric("Total de casos", items.length, "No seu espaço de trabalho", "all", "▤")}
      ${metric("Aguardando análise", count("ready") + count("draft"), "Prontos ou em rascunho", "analysis", "◷")}
      ${metric("Aguardando revisão", count("review"), "Análise simulada concluída", "review", "⌕")}
      ${metric("Pendência documental", count("pending"), "Ação registrada pelo auditor", "pending", "!")}
      ${metric("Revisados", count("reviewed"), "Revisão demonstrativa concluída", "reviewed", "✓")}
      ${metric("Tempo médio de revisão", avgText, "Somente casos com data registrada", "reviewed", "◷")}
    </div>
    <div class="two-column dashboard-lower">
      <section class="panel"><div class="panel-heading"><div><h2>Casos recentes</h2><p>Atividade mais recente no ambiente</p></div><button class="text-button" data-action="go" data-page="cases">Ver todos →</button></div>${table(recent)}</section>
      <section class="panel"><div class="panel-heading"><div><h2>Distribuição por status</h2><p>Selecione um status para filtrar casos</p></div></div>
        <div class="status-distribution">${buckets.map(([label, value]) => `<button data-action="filter-label" data-status="${label}" class="distribution-row"><span>${escapeHtml(label)}</span><b>${value}</b></button>`).join("")}</div>
      </section>
    </div>
    <p class="footnote">Indicadores calculados localmente a partir dos dados da demonstração. Não representam desempenho clínico.</p>`;
}

function renderCases() {
  const items = visible().filter((item) => (!listFilter || listFilter === "all" || (listFilter === "analysis" ? ["ready", "draft"].includes(item.status) : item.status === listFilter)) &&
    (!listSearch || `${item.id} ${item.beneficiary} ${item.beneficiaryCode}`.toLowerCase().includes(listSearch.toLowerCase())));
  return `<div class="page-heading"><div><p class="eyebrow">GESTÃO DE SOLICITAÇÕES</p><h1>Casos</h1><p>Pesquise, filtre e acompanhe os casos demonstrativos.</p></div>${button("＋ Novo caso", "go-new", "button primary")}</div>
    <section class="panel"><div class="filter-row">
      <label class="search-field"><span>⌕</span><input id="case-search" type="search" placeholder="Buscar caso ou beneficiário" value="${escapeHtml(listSearch)}"></label>
      <label>Status<select id="case-status"><option value="">Todos os status</option>${Object.entries(STATUSES).map(([key, label]) => `<option value="${key}" ${listFilter === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Categoria<select id="case-category"><option value="">Todas as categorias</option>${Object.entries(CATEGORIES).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label>
      <label>Prioridade<select id="case-priority"><option value="">Todas</option><option>Alta</option><option>Normal</option><option>Baixa</option></select></label>
      <label>Responsável<select id="case-assignee"><option value="">Todos</option>${Object.values(USERS).map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("")}</select></label>
      <label>Ordenar<select id="case-sort"><option value="newest">Data mais recente</option><option value="oldest">Data mais antiga</option><option value="due">Prazo mais próximo</option></select></label>
    </div><div id="case-table">${table(items)}</div></section>
    <p class="footnote">${items.length} caso(s) visível(is) · auditor visualiza apenas os casos atribuídos a si; gestor visualiza todos.</p>`;
}

function renderNewCase() {
  return `<div class="page-heading"><div><p class="eyebrow">NOVA SOLICITAÇÃO</p><h1>Cadastrar caso</h1><p>Todos os campos desta área recebem conteúdo fictício para demonstração.</p></div>${button("← Voltar aos casos", "go", "button secondary", 'data-page="cases"')}</div>
  <form id="new-case-form" class="form-grid">
    <section class="panel form-panel"><h2>Identificação</h2><div class="fields two">
      <label>Identificador do caso <input value="Gerado ao salvar" disabled></label>
      <label>Operadora fictícia <input value="Operadora Exemplo Saúde" disabled></label>
      <label>Código do beneficiário <input name="beneficiaryCode" required placeholder="BEN-DEMO-009"></label>
      <label>Nome fictício do beneficiário <input name="beneficiary" required placeholder="Beneficiário Exemplo 09"></label>
      <label>Faixa etária <select name="age"><option>18–29</option><option>30–44</option><option>45–59</option><option>60–74</option><option>75+</option></select></label>
      <label>Prioridade <select name="priority"><option>Normal</option><option>Alta</option><option>Baixa</option></select></label>
    </div></section>
    <section class="panel form-panel"><h2>Solicitação</h2><div class="fields two">
      <label>Categoria<select name="category" required>${Object.entries(CATEGORIES).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label>
      <label>Procedimento solicitado<input name="procedure" required placeholder="Procedimento demonstrativo"></label>
      <label>Código demonstrativo<input name="code" required placeholder="COD-DEMO-009"><small>Não representa código TUSS oficial.</small></label>
      <label>Responsável<select name="assignee" ${user.role === "Médico auditor" ? "disabled" : ""}><option value="${user.role === "Médico auditor" ? user.id : USERS.auditor.id}">Dra. Médica Demonstração (auditoria)</option>${user.role === "Gestor médico" ? `<option value="${USERS.manager.id}">Dr. Gestor Demonstração</option>` : ""}</select><small>${user.role === "Médico auditor" ? "O caso será atribuído ao perfil auditor ativo." : "Gestor pode atribuir a ambos os perfis."}</small></label>
      <label class="full">Justificativa clínica fictícia<textarea name="reason" rows="3" required placeholder="Conteúdo inteiramente fictício"></textarea></label>
      <label>Data de entrada<input name="createdAt" type="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>Prazo operacional simulado<input name="dueDate" type="date" required value="${new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)}"></label>
    </div></section>
    <section class="panel form-panel"><div class="panel-heading"><div><h2>Documentos anexados</h2><p>Use somente arquivos fictícios. Nesta versão, os documentos não são enviados a um servidor nem interpretados por IA.</p></div>${button("Carregar caso de exemplo", "example-form", "button secondary")}</div>
      <label class="upload-zone"><span class="upload-symbol">↑</span><b>Selecionar PDF, JPG ou PNG</b><small>Até 10 MB por arquivo. Anexos locais e apenas metadados persistidos.</small><input id="new-files" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple></label>
      <div id="draft-files">${draftFiles.length ? draftFiles.map((f, i) => `<div class="file-row">📄 <span>${escapeHtml(f.name)} <small>${escapeHtml(f.type)} · ${formatSize(f.size)}</small></span><button type="button" class="text-button danger-text" data-action="remove-draft-file" data-index="${i}">Remover</button></div>`).join("") : '<p class="muted">Nenhum anexo selecionado.</p>'}</div>
      <div class="fields two scenario-controls"><label>Cenário mock para análise<select name="scenario">${Object.entries(SCENARIOS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select><small>Seleção explícita; cenários não analisam o conteúdo dos arquivos.</small></label><label>Status inicial<select name="initialStatus"><option value="ready">Pronto para análise</option><option value="draft">Rascunho</option></select></label></div>
    </section>
    <div class="form-actions"><button class="button primary" type="submit">Salvar caso</button>${button("Cancelar", "go", "button secondary", 'data-page="cases"')}</div>
  </form>`;
}

function formatSize(bytes) {
  if (!bytes) return "texto demonstrativo";
  return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

function renderDetail() {
  const item = currentCase();
  if (!item || !visible().some((x) => x.id === item.id)) return `<div class="panel empty-state"><h2>Caso não encontrado</h2>${button("Voltar", "go", "button secondary", 'data-page="cases"')}</div>`;
  const stale = item.analysis?.stale;
  const docs = item.documents.map((d) => `<div class="document-card"><div class="file-icon">${d.source === "example" ? "TXT" : d.type.includes("pdf") ? "PDF" : "IMG"}</div>  <div class="document-info"><b>${escapeHtml(d.name)}</b><span>${d.source === "example" ? "Documento fictício — texto disponível" : `${escapeHtml(d.type)} · ${formatSize(d.size)} · arquivo local`}</span>${d.source === "upload" ? `<small>${previewFileUrls.has(d.id) ? "Pré-visualização disponível até recarregar." : "Selecione novamente após recarregar para pré-visualizar."}</small>` : ""}</div><div>${d.source === "example" ? `<button class="text-button" data-action="open-doc" data-id="${d.id}">Ver documento</button>` : button("Pré-visualizar", "preview-upload", "text-button", `data-id="${d.id}"`)}</div></div>`).join("") || '<p class="muted">Nenhum documento anexado.</p>';
  const criteria = item.analysis?.criteria || [];
  return `<div class="page-heading"><div><p class="eyebrow">CASO ${escapeHtml(item.id)}</p><h1>${escapeHtml(item.procedure)}</h1><p>${escapeHtml(item.beneficiary)} · ${escapeHtml(item.beneficiaryCode)} · faixa ${escapeHtml(item.age)}</p></div><div class="heading-actions">${button("Relatório", "report", "button secondary")}${button("← Casos", "go", "button secondary", 'data-page="cases"')}</div></div>
    ${stale ? '<div class="alert warning">⚠ A análise está desatualizada porque os documentos ou cenário foram alterados. Execute nova análise e realize nova revisão.</div>' : ""}
    ${item.status === "failed" ? `<div class="alert danger">${escapeHtml(item.failureMessage || "Falha técnica simulada. Nenhuma conclusão foi gerada.")} É possível selecionar outro cenário e tentar novamente.</div>` : ""}
    <div class="detail-grid"><section class="panel"><div class="panel-heading"><div><h2>Resumo da solicitação</h2><p><span class="status ${statusClass(STATUSES[item.status])}">${escapeHtml(STATUSES[item.status])}</span></p></div><span class="priority ${item.priority === "Alta" ? "high" : ""}">${escapeHtml(item.priority)} prioridade</span></div>
      <dl class="info-grid"><div><dt>Operadora</dt><dd>Operadora Exemplo Saúde</dd></div><div><dt>Categoria</dt><dd>${CATEGORIES[item.category]}</dd></div><div><dt>Código demonstrativo</dt><dd>${escapeHtml(item.code)}</dd></div><div><dt>Responsável</dt><dd>${escapeHtml(item.assignee === USERS.auditor.id ? USERS.auditor.name : USERS.manager.name)}</dd></div><div><dt>Entrada</dt><dd>${fmtDate(item.createdAt)}</dd></div><div><dt>Prazo simulado</dt><dd>${fmtDate(item.dueDate)}</dd></div></dl>
      <div class="reason-box"><b>Justificativa fictícia</b><p>${escapeHtml(item.reason)}</p></div>
      <div class="fields two scenario-controls detail-scenario"><label>Cenário explícito da análise<select id="scenario-select">${Object.entries(SCENARIOS).map(([key,label]) => `<option value="${key}" ${item.scenario===key?"selected":""}>${label}</option>`).join("")}</select></label><p class="muted">A execução usa o cenário selecionado, não interpreta anexos.</p></div>
      <div class="action-row">${button(item.analysis ? "Executar nova análise simulada" : "Executar análise simulada", "analyze", "button primary", item.status === "processing" || running ? "disabled" : "")}${item.analysis && !item.analysis.stale ? button("Abrir revisão médica", "review", "button secondary") : ""}${button("Editar documentos / cenário", "edit-inputs", "button tertiary")}${button("Excluir caso", "delete-case", "button danger-text")}</div>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2>Documentos</h2><p>Anexos locais não são enviados nem interpretados</p></div></div><div class="document-list">${docs}</div>${button("＋ Adicionar anexo local", "add-detail-file", "button secondary")}</section></div>
    ${item.analysis ? `<section class="panel analysis-panel"><div class="panel-heading"><div><p class="eyebrow">ANÁLISE MOCK · V${item.analysis.version}</p><h2>Resultado da análise simulada</h2><p>${fmtDate(item.analysis.createdAt, true)} · Cenário: ${SCENARIOS[item.analysis.scenario]}</p></div>${item.analysis.stale ? '<span class="status warning">Desatualizada</span>' : ""}</div>
      <div class="analysis-summary"><b>Rascunho de resumo técnico</b><p>${escapeHtml(item.analysis.summary)}</p></div>
      <h3>Matriz de critérios</h3>${criteriaTable(criteria)}
      <div class="two-column"><div><h3>Pendências</h3>${item.analysis.pending.length ? `<ul>${item.analysis.pending.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : '<p class="muted">Nenhuma pendência no cenário.</p>'}</div><div><h3>Contradições</h3>${item.analysis.contradictions.length ? `<ul>${item.analysis.contradictions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : '<p class="muted">Nenhuma contradição no cenário.</p>'}</div></div>
      <h3>Limitações</h3><ul>${item.analysis.limitations.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    </section>` : `<section class="panel empty-analysis"><div class="empty-icon">⌕</div><h2>Nenhuma análise disponível</h2><p>Selecione um cenário e execute a análise mock. Uma falha técnica não gera conclusão.</p></section>`}
    ${item.review && !item.review.stale ? `<section class="panel"><h2>Revisão médica</h2><div class="alert success">Revisado pelo médico — revisão demonstrativa; não é assinatura digital nem autorização assistencial.</div><p>${escapeHtml(item.review.observations || "Sem observações.")}</p><small>Revisor: ${escapeHtml(USERS.auditor.name)} · ${fmtDate(item.review.at, true)}</small></section>` : item.review?.stale ? '<section class="panel"><h2>Revisão anterior</h2><div class="alert warning">Revisão desatualizada — os documentos ou o cenário mudaram; uma nova análise e revisão são necessárias.</div></section>' : ""}
    ${item.analysis && user.role === "Médico auditor" ? button("Registrar pendência documental", "register-pending", "button secondary") : ""}
    ${item.analysisHistory?.length ? `<section class="panel"><h2>Análises anteriores</h2><p class="muted">Versões preservadas quando uma nova análise é executada.</p>${item.analysisHistory.map((a) => `<div class="history-version"><b>Análise v${a.version} · ${escapeHtml(SCENARIOS[a.scenario])}</b><small>${fmtDate(a.createdAt, true)} · ${a.stale ? "desatualizada" : "histórica"}</small><p>${escapeHtml(a.summary)}</p></div>`).join("")}</section>` : ""}
    ${item.reviewHistory?.length ? `<section class="panel"><h2>Revisões anteriores</h2><p class="muted">Versões médicas anteriores preservadas separadamente das novas análises.</p>${item.reviewHistory.map((r) => `<div class="history-version"><b>Revisão da análise v${r.analysisVersion} · ${escapeHtml(USERS.auditor.name)}</b><small>${fmtDate(r.at, true)} · Checklist v${escapeHtml(r.checklistVersion)}</small><p>${escapeHtml(r.summary)}</p><small>${r.changes} critério(s) alterado(s)</small></div>`).join("")}</section>` : ""}
    <section class="panel"><div class="panel-heading"><div><h2>Histórico do caso</h2><p>Eventos locais demonstrativos; não constituem trilha imutável.</p></div></div><div class="timeline">${[...item.events].sort((a,b)=>b.at.localeCompare(a.at)).map((e) => `<div class="timeline-item"><span class="timeline-dot"></span><div><b>${escapeHtml(e.action)}</b><small>${escapeHtml(e.user)} · ${fmtDate(e.at, true)}</small></div></div>`).join("")}</div></section>`;
}

function criteriaTable(criteria, showJustifications = false) {
  if (!criteria?.length) return '<p class="muted">Sem critérios.</p>';
  return `<div class="table-wrap"><table class="criteria-table"><thead><tr><th>Critério</th><th>Documento esperado</th><th>Status</th><th>Evidência rastreável</th></tr></thead><tbody>${criteria.map((c) => `<tr><td><b>${escapeHtml(c.id)}</b><small>${escapeHtml(c.description)}</small></td><td>${escapeHtml(c.document)}</td><td><span class="status ${c.status === "Documentado" ? "success" : c.status === "Contraditório" ? "danger" : "warning"}">${escapeHtml(c.status)}</span>${showJustifications && c.justification ? `<small>Justificativa médica: ${escapeHtml(c.justification)}</small>` : ""}</td><td>${c.evidence ? `<button class="evidence-link" data-action="evidence" data-doc="${escapeHtml(c.evidence.document)}" data-page="${c.evidence.page}" data-excerpt="${escapeHtml(c.evidence.excerpt)}">${escapeHtml(c.evidence.document)} · p. ${c.evidence.page}</button><small>${escapeHtml(c.evidence.excerpt)}<br>${escapeHtml(c.evidence.reference)} v${escapeHtml(c.evidence.referenceVersion)}</small>` : '<span class="muted">Sem evidência atribuída</span>'}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderReview() {
  const item = currentCase();
  if (!item?.analysis || !visible().some((x) => x.id === item.id)) return `<div class="panel empty-state"><h2>Revisão indisponível</h2><p>Execute uma análise válida antes de iniciar a revisão.</p>${button("Voltar ao caso", "detail", "button secondary")}</div>`;
  if (user.role !== "Médico auditor") return `<div class="panel empty-state"><h2>Acesso de leitura</h2><p>Somente o perfil médico auditor pode registrar revisões demonstrativas.</p>${button("Voltar ao caso", "detail", "button secondary")}</div>`;
  const review = item.review || {};
  return `<div class="page-heading"><div><p class="eyebrow">REVISÃO PROFISSIONAL · ${escapeHtml(item.id)}</p><h1>Revisão médica</h1><p>Compare a análise mock com os documentos fictícios. Confirme ou corrija com justificativa.</p></div>${button("← Detalhe do caso", "detail", "button secondary")}</div>
    <div class="alert warning">A saída automática é apenas apoio demonstrativo. A decisão profissional não deve ser confundida com autorização ou negativa.</div>
    <section class="panel"><div class="panel-heading"><div><h2>Resultado simulado</h2><p>Análise v${item.analysis.version} · Checklist v1.0</p></div></div>${criteriaTable(item.analysis.criteria)}</section>
    <form id="review-form"><section class="panel"><h2>Confirmação dos critérios</h2><p class="muted">Justificativa obrigatória sempre que a classificação diferir da saída simulada.</p>
      ${item.analysis.criteria.map((c, i) => {
        const prior = review.criteria?.[i]?.status || c.status;
        return `<div class="review-criterion"><div><b>${escapeHtml(c.id)} · ${escapeHtml(c.description)}</b><small>Original: ${escapeHtml(c.status)}</small></div><label>Classificação médica<select name="criterion-${i}">${["Documentado","Não documentado","Contraditório","Inconclusivo"].map((s) => `<option ${prior === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Justificativa (obrigatória se alterar)<input name="justification-${i}" value="${escapeHtml(review.criteria?.[i]?.justification || "")}" placeholder="Registre o motivo da alteração"></label></div>`;
      }).join("")}
    </section><section class="panel form-panel"><h2>Resumo e observações médicas</h2><label>Resumo técnico revisado<textarea name="summary" rows="4">${escapeHtml(review.summary || item.analysis.summary)}</textarea></label><label>Observações do auditor<textarea name="observations" rows="3" placeholder="Registro demonstrativo">${escapeHtml(review.observations || "")}</textarea></label></section>
    <div class="panel review-confirm"><label class="checkbox-label"><input type="checkbox" name="confirmation" ${review.confirmed ? "checked" : ""}> Revisei os documentos e os apontamentos deste caso demonstrativo.</label><div class="form-actions"><button class="button secondary" type="button" data-action="save-review">Salvar rascunho</button><button class="button primary" type="submit">Concluir revisão médica</button></div></div></form>`;
}

function renderReport() {
  const item = currentCase();
  if (!item || !visible().some((x) => x.id === item.id)) return `<div class="panel empty-state"><h2>Relatório indisponível</h2></div>`;
  const reviewed = item.status === "reviewed" && !item.analysis?.stale && item.review;
  const finalSummary = reviewed ? item.review.summary : item.analysis?.summary || "Análise ainda não executada.";
  const criteria = reviewed ? item.review.criteria : item.analysis?.criteria || [];
  const reviewer = reviewed ? USERS.auditor : null;
  return `<div class="page-heading no-print"><div><p class="eyebrow">EXPORTAÇÃO DEMONSTRATIVA</p><h1>Relatório do caso</h1><p>Visualize, copie o resumo ou imprima / salve como PDF.</p></div><div class="heading-actions">${button("Copiar resumo", "copy-summary", "button secondary")}${button("Imprimir / salvar PDF", "print", "button primary")}</div></div>
    <article class="report-sheet"><div class="report-brand"><div class="brand-mark small">A<span>+</span></div><div><b>AuditIA</b><small>Assistência à auditoria médica com evidências rastreáveis</small></div><span class="report-tag">${reviewed ? "REVISADO" : "RASCUNHO"}</span></div>
      <div class="report-warning">DEMONSTRAÇÃO — DADOS FICTÍCIOS — SEM VALIDADE ASSISTENCIAL.</div>
      ${!reviewed ? '<h2 class="draft-warning">Rascunho — revisão médica pendente</h2>' : ""}
      <h1>Relatório de auditoria demonstrativo</h1><div class="report-meta"><div><small>Identificador</small><b>${escapeHtml(item.id)}</b></div><div><small>Status</small><b>${escapeHtml(STATUSES[item.status])}${item.analysis?.stale ? " — análise desatualizada" : ""}</b></div><div><small>Versão da análise</small><b>${item.analysis?.version || "—"}</b></div><div><small>Data de emissão</small><b>${fmtDate(new Date().toISOString(), true)}</b></div></div>
      <h2>Identificação</h2><p><b>Beneficiário:</b> ${escapeHtml(item.beneficiary)} · ${escapeHtml(item.beneficiaryCode)} · ${escapeHtml(item.age)}</p><p><b>Procedimento:</b> ${escapeHtml(item.procedure)} · <b>Código demonstrativo:</b> ${escapeHtml(item.code)}</p><p><b>Operadora:</b> Operadora Exemplo Saúde · <b>Prioridade:</b> ${escapeHtml(item.priority)}</p>
      <h2>Resumo técnico</h2><p class="report-summary">${escapeHtml(finalSummary)}</p>
      <h2>Documentos considerados</h2><ul>${(item.analysis?.consideredDocuments || []).map((d) => `<li>${escapeHtml(d.name)} — ${d.source === "example" ? "documento fictício" : "metadados do arquivo local; conteúdo não analisado"}</li>`).join("") || "<li>Nenhum</li>"}</ul>
      <h2>Matriz de critérios</h2>${criteriaTable(criteria, reviewed)}
      <h2>Pendências e contradições</h2><ul>${[...(item.analysis?.pending || []), ...(item.analysis?.contradictions || []), ...(item.pendingReason ? [item.pendingReason] : [])].map((x) => `<li>${escapeHtml(x)}</li>`).join("") || "<li>Nenhuma identificada no cenário.</li>"}</ul>
      <h2>Limitações</h2><ul>${(item.analysis?.limitations || ["Análise simulada não executada."]).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      <h2>Observações médicas</h2><p>${escapeHtml(reviewed ? item.review.observations || "Sem observações registradas." : "Revisão médica pendente.")}</p>
      ${reviewer ? `<div class="reviewer-box"><b>Revisor demonstrativo</b><p>${escapeHtml(reviewer.name)} · ${escapeHtml(reviewer.crm)}</p><small>${fmtDate(item.review.at, true)} · Revisão não equivale a assinatura digital válida ou autorização assistencial.</small></div>` : ""}
      <footer>AuditIA · relatório local da demonstração · checklist fictício v1.0 · gerado em ${fmtDate(new Date().toISOString(), true)}</footer>
    </article>`;
}

function renderIndicators() {
  const items = visible();
  const statusCounts = Object.entries(STATUSES).map(([key,label]) => [key,label,items.filter((i)=>i.status===key).length]);
  const byPerson = Object.values(USERS).map((u)=>({ user:u, count:items.filter((i)=>i.assignee===u.id).length }));
  const pending = {};
  items.forEach((item)=> (item.analysis?.pending || []).forEach((p)=> { pending[p.split(":")[0]]=(pending[p.split(":")[0]]||0)+1; }));
  const reviewedItems = items.filter((i)=>i.review && !i.review.stale);
  const changed = reviewedItems.reduce((sum,i)=>sum+(i.review.changes||0),0);
  const totalCriteria = reviewedItems.reduce((sum,i)=>sum+i.analysis.criteria.length,0);
  const confirmed = Math.max(0,totalCriteria-changed);
  return `<div class="page-heading"><div><p class="eyebrow">GESTÃO MÉDICA</p><h1>Indicadores gerenciais</h1><p>Métricas calculadas com os registros locais desta demonstração.</p></div></div>
    <div class="metric-grid two-metric">${statusCounts.slice(0,4).map(([key,label,count])=>metric(label,count,"Abrir casos deste status",key,"•")).join("")}</div>
    <div class="two-column"><section class="panel"><div class="panel-heading"><div><h2>Casos por responsável</h2><p>Contagem baseada na atribuição demonstrativa</p></div></div>${byPerson.map(({user:u,count})=>`<button class="distribution-row" data-action="filter-assignee" data-assignee="${u.id}"><span>${escapeHtml(u.name)}</span><b>${count}</b></button>`).join("")}</section>
    <section class="panel"><div class="panel-heading"><div><h2>Pendências mais frequentes</h2><p>Critérios presentes nos resultados mock</p></div></div>${Object.keys(pending).length?Object.entries(pending).map(([k,v])=>`<div class="distribution-row"><span>${escapeHtml(k)} · documento não localizado</span><b>${v}</b></div>`).join(""):'<p class="muted">Sem dados suficientes.</p>'}</section></div>
    <div class="two-column"><section class="panel"><h2>Tempo de revisão</h2><p>${reviewedItems.length ? `${(reviewedItems.reduce((sum,i)=>sum+(new Date(i.review.at)-new Date(i.createdAt))/3600000,0)/reviewedItems.length).toFixed(1)} h de média · ${reviewedItems.length} casos com revisão registrada` : "Sem dados suficientes"}</p></section>
    <section class="panel"><h2>Concordância na demonstração</h2><p>${totalCriteria ? `${confirmed} critérios confirmados · ${changed} alterados em ${totalCriteria} critérios revisados` : "Sem dados suficientes"}</p><small>Não representa precisão clínica.</small></section></div>
    <section class="panel"><div class="panel-heading"><div><h2>Casos considerados</h2><p>Clique para consultar os dados de cada caso.</p></div></div>${table(items)}</section>`;
}

function renderReferences() {
  return `<div class="page-heading"><div><p class="eyebrow">BASE DEMONSTRATIVA</p><h1>Referências</h1><p>Checklists e documentos fictícios usados pelos cenários simulados.</p></div></div>
  <div class="alert warning">Checklist fictício para demonstração. Não utilizar para decisão de cobertura.</div>
  <div class="reference-grid">${Object.entries(CATEGORIES).map(([key,title])=>`<section class="panel"><div class="panel-heading"><div><h2>${title}</h2><p>Checklist fictício · versão 1.0</p></div></div>${CHECKLISTS[key].map(c=>`<div class="reference-criterion"><b>${escapeHtml(c.id)} · ${escapeHtml(c.description)}</b><span>Documento esperado: ${escapeHtml(c.document)}</span><small>Referência ${escapeHtml(c.reference)} · versão ${escapeHtml(c.version)}</small></div>`).join("")}</section>`).join("")}</div>
  <section class="panel"><div class="panel-heading"><div><h2>Conteúdo das referências</h2><p>Títulos, versões, datas e conteúdo</p></div></div>${REFERENCES.map(r=>`<details class="reference-item"><summary><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.id)} · v${escapeHtml(r.version)} · ${fmtDate(r.date)}</span></summary><p>${escapeHtml(r.content)}</p></details>`).join("")}</section>`;
}

function renderSettings() {
  return `<div class="page-heading"><div><p class="eyebrow">CONTA E AMBIENTE</p><h1>Perfil e configurações</h1><p>Esta sessão e todas as permissões são apenas demonstrativas.</p></div></div>
  <div class="two-column"><section class="panel"><h2>Perfil ativo</h2><div class="profile-card"><div class="avatar large">${escapeHtml(user.name.split(" ").slice(0,2).map(s=>s[0]).join(""))}</div><div><h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.role)}</p><p>${escapeHtml(user.crm)}</p><p>Operadora Exemplo Saúde</p></div></div><div class="alert warning">CRM fictício. Nenhuma consulta ou validação de registro profissional foi realizada.</div></section>
  <section class="panel"><h2>Dados locais</h2><p>Casos simulados e metadados de anexos são guardados neste navegador via localStorage. Os arquivos locais não são persistidos.</p><p>A sessão demonstrativa permanece até logout ou fechamento da sessão do navegador.</p>${button("Restaurar demonstração", "restore", "button danger-button")}<p class="muted">A restauração substitui os dados atuais pelos casos iniciais. Uma confirmação será solicitada.</p></section></div>
  <section class="panel"><h2>Limites do produto</h2><ul><li>Sem serviços de autenticação ou autorização no servidor.</li><li>Sem envio ou interpretação de anexos por IA.</li><li>Resultados, referências, usuários e documentos são fictícios.</li><li>Não utilizar para decisões assistenciais nem produção.</li></ul></section>`;
}

function render() {
  user = getCurrentUser();
  if (!user) { page = "login"; renderLogin(); return; }
  const renderers = { dashboard: renderDashboard, cases: renderCases, new: renderNewCase, detail: renderDetail, review: renderReview, report: renderReport, indicators: renderIndicators, references: renderReferences, settings: renderSettings };
  shell((renderers[page] || renderDashboard)());
}

function updateCase(item) {
  const i = cases.findIndex((x) => x.id === item.id);
  if (i >= 0) cases[i] = item;
  persist();
}

function runAnalysis(item) {
  if (running) return;
  const selector = document.querySelector("#scenario-select");
  const scenario = selector?.value || item.scenario;
  const scenarioChanged = item.scenario !== scenario;
  if (scenarioChanged) {
    markStale(item);
    event(item, `Cenário de análise alterado para "${SCENARIOS[scenario]}"`);
  }
  item.scenario = scenario;
  item.failureMessage = "";
  item.status = "processing";
  running = true;
  updateCase(item);
  render();
  const stages = ["Organizando documentos…", "Conferindo checklist…", "Identificando pendências…", "Preparando resumo…"];
  let stage = 0;
  const tick = () => {
    if (stage < stages.length) {
      const toast = document.querySelector("#toast-region");
      if (toast) toast.innerHTML = `<div class="toast info">${stages[stage]}</div>`;
      stage += 1;
      setTimeout(tick, 420);
      return;
    }
    let resultMessage = "";
    let resultKind = "success";
    try {
      const version = (item.analysis?.version || 0) + 1;
      const result = analyzeCase(item, scenario, version);
      if (item.analysis) {
        item.analysisHistory ||= [];
        item.analysisHistory.push({ ...item.analysis, stale: true });
      }
      if (item.review) {
        item.reviewHistory ||= [];
        item.reviewHistory.push({ ...item.review });
      }
      item.analysis = result;
      item.review = null;
      item.status = "review";
      item.pendingReason = "";
      item.failureMessage = "";
      event(item, `Análise simulada v${version} executada · cenário: ${SCENARIOS[scenario]}`);
      resultMessage = "Análise simulada concluída. Aguardando revisão médica.";
    } catch (error) {
      item.status = "failed";
      item.failureMessage = error instanceof Error ? error.message : "Falha técnica simulada. Nenhuma conclusão foi gerada.";
      event(item, "Falha técnica na análise simulada; nenhuma conclusão gerada");
      resultMessage = item.failureMessage;
      resultKind = "error";
    } finally {
      running = false;
      updateCase(item);
      render();
      notice(resultMessage, resultKind);
    }
  };
  setTimeout(tick, 250);
}

function saveReview(submit) {
  const item = currentCase();
  const form = document.querySelector("#review-form");
  if (!item || !form) return;
  const fd = new FormData(form);
  const criteria = item.analysis.criteria.map((criterion, i) => {
    const status = fd.get(`criterion-${i}`);
    const justification = String(fd.get(`justification-${i}`) || "").trim();
    if (status !== criterion.status && !justification) throw new Error(`Informe a justificativa para a alteração do critério ${criterion.id}.`);
    return { ...criterion, status, justification };
  });
  const changed = criteria.filter((c, i) => c.status !== item.analysis.criteria[i].status).length;
  const changedNow = criteria.filter((c, i) => (item.review?.criteria?.[i]?.status || item.analysis.criteria[i].status) !== c.status);
  if (submit && !fd.get("confirmation")) throw new Error("Confirme que revisou os documentos antes de concluir.");
  const wasCompleted = item.status === "reviewed";
  item.review = {
    criteria,
    summary: String(fd.get("summary") || ""),
    observations: String(fd.get("observations") || ""),
    reviewer: user.id,
    at: submit ? new Date().toISOString() : item.review?.at || null,
    analysisVersion: item.analysis.version,
    checklistVersion: "1.0",
    changes: changed,
    confirmed: Boolean(fd.get("confirmation")),
  };
  if (changedNow.length) {
    event(item, `Critérios alterados pelo médico: ${changedNow.map((c) => `${c.id} (${c.justification})`).join("; ")}`);
  }
  if (submit) {
    item.status = "reviewed";
    event(item, "Revisão médica demonstrativa concluída");
  } else if (!wasCompleted) {
    item.status = "review";
    event(item, "Rascunho da revisão médica salvo");
  } else {
    event(item, "Revisão médica atualizada");
  }
  updateCase(item);
  notice(submit ? "Revisão médica demonstrativa concluída." : "Rascunho da revisão salvo.");
  if (submit) setPage("detail", item.id); else render();
}

app.addEventListener("click", async (eventClick) => {
  const btn = eventClick.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const item = currentCase();
  try {
    if (action === "login-auditor" || action === "login-manager") {
      signIn(action === "login-auditor" ? "auditor" : "manager");
      user = getCurrentUser(); page = "dashboard"; render(); return;
    }
    if (action === "logout") { signOut(); user = null; page = "login"; render(); return; }
    if (action === "go") { setPage(btn.dataset.page); return; }
    if (action === "go-new") { setPage("new"); return; }
    if (action === "open-case") { setPage("detail", btn.dataset.id); return; }
    if (action === "metric-filter") { listFilter = btn.dataset.filter; listSearch = ""; setPage("cases"); return; }
    if (action === "filter-label") { listFilter = Object.keys(STATUSES).find((key) => STATUSES[key] === btn.dataset.status) || ""; setPage("cases"); return; }
    if (action === "filter-assignee") { listFilter = "all"; listSearch = ""; setPage("cases"); return; }
    if (action === "detail") { setPage("detail", selectedId); return; }
    if (action === "report") { setPage("report", selectedId); return; }
    if (action === "review") { setPage("review", selectedId); return; }
    if (action === "analyze") { if (item) runAnalysis(item); return; }
    if (action === "edit-inputs") {
      if (!item) return;
      openEditInputs(item); return;
    }
    if (action === "save-review") { saveReview(false); return; }
    if (action === "open-doc") { openExampleDocument(btn.dataset.id); return; }
    if (action === "evidence") { openEvidence(btn.dataset.doc, btn.dataset.page, btn.dataset.excerpt); return; }
    if (action === "preview-upload") { previewUpload(btn.dataset.id); return; }
    if (action === "register-pending" && item) {
      const reason = prompt("Descreva a pendência documental do caso fictício:");
      if (reason === null) return;
      if (!reason.trim()) { notice("Informe o motivo da pendência documental.", "error"); return; }
      item.pendingReason = reason.trim();
      item.status = "pending";
      event(item, `Pendência documental registrada: ${reason.trim()}`);
      updateCase(item); render(); notice("Pendência documental registrada.");
      return;
    }
    if (action === "add-detail-file") { document.querySelector("#detail-file-input")?.click(); return; }
    if (action === "remove-draft-file") {
      const index = Number(btn.dataset.index);
      const file = draftFiles[index];
      if (file?.url) URL.revokeObjectURL(file.url);
      draftFiles.splice(index, 1); render(); return;
    }
    if (action === "example-form") {
      document.querySelector('[name="beneficiaryCode"]').value = "BEN-DEMO-009";
      document.querySelector('[name="beneficiary"]').value = "Beneficiário Exemplo 09";
      document.querySelector('[name="procedure"]').value = "Exame de imagem demonstrativo";
      document.querySelector('[name="code"]').value = "COD-DEMO-009";
      document.querySelector('[name="reason"]').value = "Justificativa clínica fictícia para apresentação do fluxo.";
      notice("Campos do exemplo preenchidos. Salve para criar o caso."); return;
    }
    if (action === "restore") {
      if (confirm("Restaurar a demonstração? Os casos e alterações locais atuais serão substituídos.")) {
        cases = restoreDemo(); listFilter = ""; listSearch = ""; setPage("dashboard"); notice("Demonstração restaurada.");
      }
      return;
    }
    if (action === "print") {
      if (item) { event(item, "Relatório impresso ou salvo em PDF"); updateCase(item); }
      window.print(); return;
    }
    if (action === "copy-summary") {
      const text = document.querySelector(".report-summary")?.textContent || "Análise ainda não executada.";
      await navigator.clipboard.writeText(text); notice("Resumo copiado.");
      if (item) { event(item, "Resumo do relatório copiado"); updateCase(item); }
      return;
    }
    if (action === "delete-case" && item) {
      if (confirm(`Excluir o caso ${item.id}? Esta ação remove os dados locais da demonstração.`)) {
        cases = cases.filter((x) => x.id !== item.id); save(); setPage("cases");
      }
      return;
    }
  } catch (error) {
    notice(error.message || "Não foi possível concluir a ação.", "error");
  }
});

app.addEventListener("change", (changeEvent) => {
  const target = changeEvent.target;
  if (target.id === "scenario-select" && currentCase()) {
    const item = currentCase();
    if (item.scenario !== target.value) {
      item.scenario = target.value;
      markStale(item);
      if (item.analysis) item.status = "ready";
      event(item, `Cenário de análise alterado para "${SCENARIOS[item.scenario]}"`);
      updateCase(item);
      render();
      notice("Cenário alterado. A análise anterior está desatualizada.");
    }
    return;
  }
  if (target.id === "case-status") { listFilter = target.value; render(); return; }
  if (target.id === "case-category" || target.id === "case-priority" || target.id === "case-assignee" || target.id === "case-sort") { updateCaseTable(); return; }
  if (target.id === "new-files") {
    const files = Array.from(target.files || []);
    for (const file of files) {
      if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type)) { notice(`${file.name}: formato não aceito. Use PDF, JPG ou PNG.`, "error"); continue; }
      if (file.size > 10 * 1024 * 1024) { notice(`${file.name}: excede o limite de 10 MB.`, "error"); continue; }
      draftFiles.push({ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file) });
    }
    const list = document.querySelector("#draft-files");
    if (list) list.innerHTML = draftFiles.map((f, i) => `<div class="file-row">📄 <span>${escapeHtml(f.name)} <small>${escapeHtml(f.type)} · ${formatSize(f.size)}</small></span><button type="button" class="text-button danger-text" data-action="remove-draft-file" data-index="${i}">Remover</button></div>`).join("") || '<p class="muted">Nenhum anexo selecionado.</p>';
    target.value = "";
    return;
  }
  if (target.id === "detail-file-input") {
    if (!currentCase()) return;
    Array.from(target.files || []).forEach((file) => {
      if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
        notice(`${file.name}: formato inválido ou acima de 10 MB.`, "error"); return;
      }
      const doc = { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, source: "upload" };
      currentCase().documents.push(doc);
      previewFileUrls.set(doc.id, URL.createObjectURL(file));
      markStale(currentCase()); currentCase().status = currentCase().analysis ? "ready" : currentCase().status;
      event(currentCase(), `Documento local adicionado: ${file.name}`);
      updateCase(currentCase());
    });
    render(); return;
  }
  if (target.matches("#case-search")) { listSearch = target.value; updateCaseTable(); }
});

app.addEventListener("input", (inputEvent) => {
  if (inputEvent.target.matches("#case-search")) { listSearch = inputEvent.target.value; updateCaseTable(); }
});

app.addEventListener("submit", (submitEvent) => {
  if (submitEvent.target.id === "new-case-form") {
    submitEvent.preventDefault();
    const fd = new FormData(submitEvent.target);
    const next = cases.reduce((max, x) => Math.max(max, Number(x.id.replace(/\D/g, "")) || 1000), 1000) + 1;
    const created = new Date(`${fd.get("createdAt")}T12:00:00`).toISOString();
    const docs = draftFiles.map((f) => {
      const id = crypto.randomUUID();
      previewFileUrls.set(id, f.url);
      return { id, name: f.name, type: f.type, size: f.size, source: "upload" };
    });
    const newItem = {
      id: `AUD-${String(next).padStart(5, "0")}`, beneficiary: String(fd.get("beneficiary")).trim(), beneficiaryCode: String(fd.get("beneficiaryCode")).trim(),
      age: String(fd.get("age")), category: String(fd.get("category")), procedure: String(fd.get("procedure")).trim(), code: String(fd.get("code")).trim(),
      reason: String(fd.get("reason")).trim(), createdAt: created, dueDate: String(fd.get("dueDate")), priority: String(fd.get("priority")),
      assignee: user.role === "Médico auditor" ? user.id : String(fd.get("assignee")), documents: docs, scenario: String(fd.get("scenario")), status: String(fd.get("initialStatus")),
      analysis: null, analysisHistory: [], failureMessage: "", review: null, reviewHistory: [], updatedAt: new Date().toISOString(), events: [newEvent("Caso fictício criado", user.name)],
    };
    cases.unshift(newItem); persist(); selectedId = newItem.id; draftFiles = []; setPage("detail", newItem.id); notice("Caso criado e salvo localmente.");
  }
  if (submitEvent.target.id === "review-form") {
    submitEvent.preventDefault();
    try { saveReview(true); } catch (error) { notice(error.message, "error"); }
  }
});

function updateCaseTable() {
  const container = document.querySelector("#case-table");
  if (!container) return;
  const category = document.querySelector("#case-category")?.value || "";
  const priority = document.querySelector("#case-priority")?.value || "";
  const assignee = document.querySelector("#case-assignee")?.value || "";
  const sort = document.querySelector("#case-sort")?.value || "newest";
  let items = visible().filter((item) =>
    (!listFilter || listFilter === "all" || (listFilter === "analysis" ? ["ready","draft"].includes(item.status) : item.status === listFilter)) &&
    (!listSearch || `${item.id} ${item.beneficiary} ${item.beneficiaryCode}`.toLowerCase().includes(listSearch.toLowerCase())) &&
    (!category || item.category === category) && (!priority || item.priority === priority) && (!assignee || item.assignee === assignee));
  items.sort((a,b) => sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : sort === "due" ? a.dueDate.localeCompare(b.dueDate) : b.createdAt.localeCompare(a.createdAt));
  container.innerHTML = table(items);
}

function openEditInputs(item) {
  const categoryOptions = Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${item.category===k?"selected":""}>${v}</option>`).join("");
  const scenarioOptions = Object.entries(SCENARIOS).map(([k,v])=>`<option value="${k}" ${item.scenario===k?"selected":""}>${v}</option>`).join("");
  const removeOptions = item.documents.filter(d=>d.source==="upload").map(d=>`<label class="checkbox-label"><input type="checkbox" value="${d.id}" name="removeDoc"> Remover ${escapeHtml(d.name)}</label>`).join("");
  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.innerHTML = `<form method="dialog" id="edit-inputs-form"><div class="panel-heading"><div><h2>Editar entradas da análise</h2><p>Alterações invalidam análise/revisão anteriores.</p></div><button class="icon-button" aria-label="Fechar">×</button></div>
    <label>Categoria<select name="category">${categoryOptions}</select></label><label>Cenário mock<select name="scenario">${scenarioOptions}</select></label>
    <label class="upload-zone compact">Adicionar PDF, JPG ou PNG<input type="file" name="files" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple></label>
    <div>${removeOptions || '<small>Nenhum anexo local para remover. Documentos fictícios base não podem ser removidos.</small>'}</div>
    <button class="button primary" type="button" id="save-edit-inputs">Salvar alterações</button></form>`;
  document.body.append(dialog); dialog.showModal();
  dialog.querySelector("#save-edit-inputs").addEventListener("click", () => {
    const form = dialog.querySelector("form");
    const fd = new FormData(form);
    let changed = false;
    if (item.category !== fd.get("category") || item.scenario !== fd.get("scenario")) changed = true;
    item.category = String(fd.get("category")); item.scenario = String(fd.get("scenario"));
    for (const id of fd.getAll("removeDoc")) {
      const doc = item.documents.find((x) => x.id === id);
      item.documents = item.documents.filter((x) => x.id !== id);
      if (doc) { changed = true; previewFileUrls.delete(id); event(item, `Documento local removido: ${doc.name}`); }
    }
    const files = Array.from(form.querySelector('[name="files"]').files || []);
    for (const file of files) {
      if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type) || file.size > 10*1024*1024) { notice(`${file.name}: formato inválido ou acima de 10 MB.`, "error"); continue; }
      const id = crypto.randomUUID();
      item.documents.push({ id, name:file.name, type:file.type, size:file.size, source:"upload" });
      previewFileUrls.set(id, URL.createObjectURL(file)); changed = true; event(item, `Documento local adicionado: ${file.name}`);
    }
    if (changed) {
      markStale(item); if (item.analysis) item.status = "ready";
      event(item, "Entradas da análise alteradas; é necessária nova análise e revisão");
    }
    updateCase(item); dialog.close(); dialog.remove(); render();
  });
}

function openExampleDocument(id) {
  const item = currentCase();
  const doc = item?.documents.find((x)=>x.id===id && x.source==="example");
  if (!doc) return;
  showModal(`<p class="eyebrow">DOCUMENTO FICTÍCIO · ${escapeHtml(doc.name)}</p><h2>${escapeHtml(doc.name)}</h2>${doc.pages.map(p=>`<article class="sample-page"><small>Página ${p.page}</small><p>${escapeHtml(p.text)}</p></article>`).join("")}<p class="muted">Conteúdo inteiramente fictício, incluído apenas para demonstração.</p>`);
}
function openEvidence(name, pageNo, excerpt) {
  showModal(`<p class="eyebrow">EVIDÊNCIA DEMONSTRATIVA</p><h2>${escapeHtml(name)} · página ${escapeHtml(pageNo)}</h2><article class="sample-page highlighted"><small>Página ${escapeHtml(pageNo)}</small><p>${escapeHtml(excerpt)}</p></article><p class="muted">Trecho pertencente ao documento textual fictício de exemplo. Não provém de arquivo enviado pelo usuário.</p>`);
}
function showModal(content) {
  const dialog = document.createElement("dialog");
  dialog.className="modal";
  dialog.innerHTML=`<form method="dialog"><div class="modal-top"><span class="status warning">DEMONSTRAÇÃO</span><button class="icon-button" aria-label="Fechar">×</button></div>${content}</form>`;
  document.body.append(dialog); dialog.showModal(); dialog.addEventListener("close",()=>dialog.remove());
}
function previewUpload(id) {
  const url=previewFileUrls.get(id);
  if (!url) { notice("O arquivo precisa ser selecionado novamente para pré-visualização.", "error"); return; }
  const doc=currentCase()?.documents.find(d=>d.id===id);
  if (doc?.type==="application/pdf") showModal(`<h2>${escapeHtml(doc.name)}</h2><iframe title="Pré-visualização local do PDF" src="${url}" class="preview-frame"></iframe><p class="muted">Pré-visualização local. O conteúdo não foi analisado.</p>`);
  else showModal(`<h2>${escapeHtml(doc?.name || "Imagem local")}</h2><img src="${url}" alt="Pré-visualização local do anexo" class="preview-image"><p class="muted">Pré-visualização local. O conteúdo não foi analisado.</p>`);
}

function addHiddenUploadInput() {
  const input = document.createElement("input");
  input.type = "file"; input.id = "detail-file-input"; input.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"; input.multiple = true; input.hidden = true;
  document.body.append(input);
}
addHiddenUploadInput();
render();
})(globalThis);
