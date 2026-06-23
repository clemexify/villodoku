import { supabase } from "./supabase";
import type { CellState } from "./game-storage";

const USER_ID_KEY = "villodoku-user-id";

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/** Crée une session au démarrage (si pas déjà existante pour cette grille). */
export async function startSession(gridDate: string): Promise<void> {
  const userId = getUserId();
  await supabase
    .from("game_sessions")
    .upsert({ user_id: userId, grid_date: gridDate }, { onConflict: "user_id,grid_date", ignoreDuplicates: true });
}

/** Upsert la session à la fin de la partie (fonctionne même si startSession n'a pas encore fini). */
export async function completeSession(
  gridDate: string,
  outcome: "won" | "lost",
  score: number,
  errors: number,
  cells: CellState[][]
): Promise<void> {
  const userId = getUserId();

  const cellsData = cells.map((row) =>
    row.map((cell) => ({
      solved: cell.status === "correct",
      commune: cell.commune?.nom_commune ?? null,
      rank: cell.solutionRank ?? null,
      total: cell.solutionsCount ?? null,
    }))
  );

  await supabase
    .from("game_sessions")
    .upsert(
      {
        user_id: userId,
        grid_date: gridDate,
        completed_at: new Date().toISOString(),
        outcome,
        score,
        errors,
        cells: cellsData,
      },
      { onConflict: "user_id,grid_date" }
    );
}
