import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useApi } from "./useApi";

export function useCurrentUser() {
  const { isSignedIn } = useAuth();
  const { call } = useApi();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => call("/auth/me"),
    enabled: !!isSignedIn,
    retry: false,
  });
}
