import type { CommuneOption } from "./communes-search";

export const MAX_ERRORS = 5;

export type CellStatus = "empty" | "correct" | "incorrect";

export interface CellState {
  status: CellStatus;
  commune?: CommuneOption;
  /** Position dans la liste triée par population décroissante (0 = ville la plus connue) */
  solutionRank?: number;
  /** Nombre total de solutions valides pour cette case */
  solutionsCount?: number;
}

export interface SavedGameState {
  cells: CellState[][];
  errors: number;
}

export type DayStatus = "empty" | "playing" | "won" | "lost";

export function gameStorageKey(date: string): string {
  return `villodoku-${date}`;
}

export function readGameState(date: string): SavedGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(gameStorageKey(date));
    if (!raw) return null;
    return JSON.parse(raw) as SavedGameState;
  } catch {
    return null;
  }
}

export function getDayStatus(date: string): DayStatus {
  const state = readGameState(date);
  if (!state) return "empty";
  const solved = state.cells.flat().filter((c) => c.status === "correct").length;
  if (solved === 9) return "won";
  if (state.errors >= MAX_ERRORS) return "lost";
  if (solved === 0 && state.errors === 0) return "empty";
  return "playing";
}

const STREAK_KEY = "villodoku-streak";

export interface StreakData {
  current: number;
  lastPlayedDate: string | null;
}

export function getStreak(): StreakData {
  if (typeof window === "undefined") return { current: 0, lastPlayedDate: null };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw) as StreakData;
  } catch {
    // ignore les états sauvegardés corrompus
  }
  return { current: 0, lastPlayedDate: null };
}

function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Enregistre qu'une partie s'est terminée (gagnée ou perdue) ce jour-là et met à jour le streak. */
export function recordDayPlayed(date: string): StreakData {
  const streak = getStreak();
  if (streak.lastPlayedDate === date) return streak;

  const next: StreakData = {
    current: streak.lastPlayedDate === previousDate(date) ? streak.current + 1 : 1,
    lastPlayedDate: date,
  };
  localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

/** Renvoie les `n` dates (YYYY-MM-DD) se terminant à `referenceDate`, du plus ancien au plus récent. */
export function lastNDates(referenceDate: string, n: number): string[] {
  const result: string[] = [];
  const ref = new Date(`${referenceDate}T00:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/** Date de lancement du jeu. */
export const LAUNCH_DATE = "2026-06-15";

/** Toutes les dates jouables depuis le lancement jusqu'à `today` inclus, du plus ancien au plus récent. */
export function datesSinceLaunch(today: string): string[] {
  const result: string[] = [];
  const start = new Date(`${LAUNCH_DATE}T00:00:00Z`);
  const end = new Date(`${today}T00:00:00Z`);
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}
