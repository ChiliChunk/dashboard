import { useCallback, useEffect, useState } from "react";
import { clearDatabase } from "./store";

export interface Session {
  accessToken: string;
  expiresAt: number;
  athleteId: number;
}

interface SessionState {
  status: "loading" | "signed-out" | "signed-in";
  session: Session | null;
}

async function fetchSession(): Promise<Session | null> {
  const response = await fetch("/api/auth/token", { method: "POST" });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as Session;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    session: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((session) => {
      if (cancelled) return;
      setState(
        session
          ? { status: "signed-in", session }
          : { status: "signed-out", session: null },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.assign(`/api/auth/start?return_to=${encodeURIComponent(returnTo)}`);
  }, []);

  const disconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await clearDatabase();
    setState({ status: "signed-out", session: null });
  }, []);

  return { ...state, connect, disconnect };
}
