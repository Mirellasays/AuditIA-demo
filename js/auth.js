(function (global) {
const { USERS } = global.AuditIAData;
const { clearSession, loadSession, saveSession } = global.AuditIAStorage;

function getCurrentUser() {
  const saved = loadSession();
  if (!saved?.id) return null;
  return Object.values(USERS).find((user) => user.id === saved.id) || null;
}

function signIn(profile) {
  const user = USERS[profile];
  if (!user) throw new Error("Perfil demonstrativo inválido.");
  saveSession(user);
  return user;
}

function signOut() {
  clearSession();
}

function visibleCases(cases, user) {
  return user.role === "Gestor médico" ? cases : cases.filter((item) => item.assignee === user.id);
}

global.AuditIAAuth = { getCurrentUser, signIn, signOut, visibleCases };
})(globalThis);
