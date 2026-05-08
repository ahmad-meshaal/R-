import { useAuth } from "@clerk/react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function getApiUrl(path: string) {
  return `${BASE}/api${path}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(getApiUrl(path), { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}
