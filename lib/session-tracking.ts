import { supabase } from "./supabase";
import type { CellState } from "./game-storage";

const USER_ID_KEY = "villodoku-user-id";
const SESSION_KEY = (date: string) => `villodoku-session-${date}`;

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function getSessionId(gridDate: string): string | null {
  return localStorage.getItem(SESSION_KEY(gridDate));
}

function saveSessionId(gridDate: string, sessionId: string) {
  localStorage.setItem(SESSION_KEY(gridDate), sessionId);
}

/** Crée une session au démarrage (si pas déjà existante pour cette grille). */
export async function startSession(gridDate: string): Promise<void> {
  if (getSessionId(gridDate)) return; // session déjà ouverte

  const userId = getUserId();
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({ user_id: userId, grid_date: gridDate })
    .select("id")
    .single();

  if (!error && data) {
    saveSessionId(gridDate, data.id);
  }
}

/** Met à jour la session à la fin de la partie. */
export async function completeSession(
  gridDate: string,
  outcome: "won" | "lost",
  score: number,
  errors: number,
  cells: CellState[][]
): Promise<void> {
  let sessionId = getSessionId(gridDate);

  // Si startSession avait échoué, on réessaie avant de mettre à jour
  if (!sessionId) {
    await startSession(gridDate);
    sessionId = getSessionId(gridDate);
    if (!sessionId) return;
  }

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
    .update({
      completed_at: new Date().toISOString(),
      outcome,
      score,
      errors,
      cells: cellsData,
    })
    .eq("id", sessionId);
}
