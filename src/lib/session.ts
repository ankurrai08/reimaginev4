// Client-side player token store (localStorage). Safe to import anywhere;
// every accessor guards against running on the server.
const KEY = "reimaginai_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Display a token in readable groups of four: RG7K-2QPM-9XTL. */
export function formatToken(token: string): string {
  return token.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}
