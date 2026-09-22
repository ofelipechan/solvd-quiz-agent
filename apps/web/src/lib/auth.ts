// SPEC_DEVIATION: the Next.js edge `middleware.ts` this replaced could read
// `auth_token` directly off the request because it ran server-side; a Vite
// SPA has no server, and the API sets that cookie `httpOnly` (see
// apps/api/src/plugins/auth-hook.ts), so browser JS can never read it.
// Reason: staying within a build-tool migration (no new API session/whoami
// endpoint). We instead track a same-origin, JS-readable "logged in" flag
// set on successful login and cleared on logout/401, and gate protected
// routes on that flag. It covers the tested paths (UI-01: no session ->
// redirect to /login) but, unlike the old middleware, won't catch a cookie
// that expired without the app noticing.
const SESSION_FLAG_KEY = "quiz-agent:authenticated";

export function markAuthenticated(): void {
  sessionStorage.setItem(SESSION_FLAG_KEY, "1");
}

export function clearAuthenticated(): void {
  sessionStorage.removeItem(SESSION_FLAG_KEY);
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_FLAG_KEY) === "1";
}
