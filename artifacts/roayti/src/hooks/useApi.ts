import { useAuth } from "@clerk/react";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useApi() {
  const { getToken } = useAuth();

  const call = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      return apiFetch(path, { ...options, token: token ?? undefined });
    },
    [getToken]
  );

  return { call };
}
