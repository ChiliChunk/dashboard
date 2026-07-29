import type { ReactNode } from "react";
import { useSession } from "../data/session";

/** N'affiche ses enfants qu'une fois la session Strava établie (CA1.1). */
export function ConnectGate({ children }: { children: ReactNode }) {
  const { status, connect } = useSession();

  if (status === "loading") {
    return <div className="card">Chargement…</div>;
  }

  if (status === "signed-out") {
    return (
      <div className="card">
        <p className="label">Non connecté</p>
        <p>Connectez votre compte Strava pour consulter vos sorties.</p>
        <button type="button" onClick={connect}>
          Se connecter avec Strava
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
