(function (global) {
const { CHECKLISTS, SCENARIOS } = global.AuditIAData;

function analyzeCase(item, scenario, version) {
  if (scenario === "failure") throw new Error("Falha técnica simulada. Nenhuma conclusão foi gerada.");
  const checklist = CHECKLISTS[item.category] || CHECKLISTS.checklist;
  const exampleDocs = item.documents.filter((doc) => doc.source === "example");
  const hasUploads = item.documents.some((doc) => doc.source === "upload");
  const criteria = checklist.map((criterion, index) => {
    let status = "Documentado";
    if (scenario === "missing" && index === 1) status = "Não documentado";
    if (scenario === "contradictory" && index === 1) status = "Contraditório";
    if (scenario === "inconclusive" && index === 1) status = "Inconclusivo";
    const sourceDoc = exampleDocs[Math.min(index, Math.max(0, exampleDocs.length - 1))];
    const evidence = sourceDoc && !(scenario === "missing" && index === 1) ? {
      document: sourceDoc.name,
      page: sourceDoc.pages[0]?.page || 1,
      excerpt: sourceDoc.pages[0]?.text || "",
      reference: criterion.reference,
      referenceVersion: criterion.version,
    } : null;
    return { ...criterion, status, evidence };
  });
  return {
    version,
    scenario,
    scenarioLabel: SCENARIOS[scenario],
    createdAt: new Date().toISOString(),
    stale: false,
    consideredDocuments: item.documents.map((doc) => ({ id: doc.id, name: doc.name, source: doc.source })),
    criteria,
    pending: criteria.filter((c) => c.status === "Não documentado").map((c) => `${c.id}: ${c.document} não localizado no cenário selecionado.`),
    contradictions: criteria.filter((c) => c.status === "Contraditório").map((c) => `${c.id}: divergência inserida pelo cenário mock; não atribuída a anexo local.`),
    limitations: [
      "A análise usa somente regras determinísticas de demonstração; nenhum modelo de IA ou serviço externo foi utilizado.",
      hasUploads ? "Arquivos locais são metadados apenas; resultados pertencem ao cenário mock selecionado e não aos anexos." : "Trechos exibidos pertencem somente aos documentos de texto fictícios incluídos na demonstração.",
      "Não documentado não significa ausência de condição clínica ou de indicação.",
    ],
    summary: `Rascunho técnico simulado para ${item.id}: cenário "${SCENARIOS[scenario]}". Os critérios refletem apenas uma conferência demonstrativa de documentos e não constituem autorização, negativa ou parecer médico.`,
  };
}

global.AuditIAAnalysis = { analyzeCase };
})(globalThis);
