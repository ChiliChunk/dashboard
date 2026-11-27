import { useCallback, useEffect, useState } from "react";
import { renfoWeekKey, toRenfoDoneSet } from "../domain/renfo";
import { deleteRenfoEntry, getRenfoEntries, putRenfoEntry } from "./store";

export interface RenfoLogSnapshot {
  /** Clés de semaine pointées (voir `renfoWeekKey`). */
  done: ReadonlySet<string>;
  /** Vrai une fois le journal lu : avant, une case décochée ne veut encore rien dire. */
  ready: boolean;
  toggle: (date: Date, done: boolean) => void;
}

/**
 * Journal des semaines où le renfo a été fait. Le pointage est appliqué
 * d'abord à l'écran puis écrit : une case à cocher qui attend l'aller-retour
 * IndexedDB se coche visiblement en retard. Si l'écriture échoue, le journal
 * est relu — l'affichage revient alors à ce qui est réellement stocké plutôt
 * que de garder une coche qui n'existe pas.
 */
export function useRenfoLog(): RenfoLogSnapshot {
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const entries = await getRenfoEntries();
    setDone(toRenfoDoneSet(entries));
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    (date: Date, next: boolean) => {
      const weekKey = renfoWeekKey(date);
      setDone((current) => {
        const updated = new Set(current);
        if (next) updated.add(weekKey);
        else updated.delete(weekKey);
        return updated;
      });

      void (async () => {
        try {
          if (next) await putRenfoEntry({ weekKey, doneAt: Date.now() });
          else await deleteRenfoEntry(weekKey);
        } catch {
          await reload();
        }
      })();
    },
    [reload],
  );

  return { done, ready, toggle };
}
