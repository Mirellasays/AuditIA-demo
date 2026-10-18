(function (global) {
const { createDemoCases } = global.AuditIAData;

const DATA_KEY = "auditia-demo-cases-v1";
const SESSION_KEY = "auditia-demo-session-v1";

function loadCases() {
  try {
    const stored = localStorage.getItem(DATA_KEY);
    return stored ? JSON.parse(stored) : restoreDemo();
  } catch (error) {
    console.error("Não foi possível carregar os dados locais da demonstração.", error);
    return restoreDemo();
  }
}

function saveCases(cases) {
  localStorage.setItem(DATA_KEY, JSON.stringify(cases));
}

function restoreDemo() {
  const cases = createDemoCases();
  saveCases(cases);
  return cases;
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Não foi possível carregar a sessão demonstrativa.", error);
    return null;
  }
}

function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

global.AuditIAStorage = { loadCases, saveCases, restoreDemo, loadSession, saveSession, clearSession };
})(globalThis);
