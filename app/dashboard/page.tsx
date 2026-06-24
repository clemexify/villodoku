import { createClient } from "@supabase/supabase-js";
import DashboardClient, { type DayStats, type CellStat, type GlobalStats } from "./DashboardClient";
import { formatLongDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const expected = process.env.DASHBOARD_SECRET;

  if (expected && secret !== expected) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Accès non autorisé.</p>
      </main>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Toutes les sessions
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("user_id, grid_date, outcome, score, errors, cells")
    .order("grid_date", { ascending: true });

  if (!sessions) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Erreur de connexion Supabase.</p>
      </main>
    );
  }

  // ---- Agrégation par jour ----
  const byDay = new Map<string, {
    sessions: Set<string>; users: Set<string>;
    won: number; lost: number; abandoned: number;
    scores: number[]; errors: number[];
  }>();

  for (const s of sessions) {
    const date = s.grid_date as string;
    if (!byDay.has(date)) {
      byDay.set(date, { sessions: new Set(), users: new Set(), won: 0, lost: 0, abandoned: 0, scores: [], errors: [] });
    }
    const day = byDay.get(date)!;
    day.sessions.add(s.user_id + date); // uniq par user+date
    day.users.add(s.user_id);
    if (s.outcome === "won") { day.won++; if (s.score != null) day.scores.push(s.score); if (s.errors != null) day.errors.push(s.errors); }
    else if (s.outcome === "lost") { day.lost++; if (s.score != null) day.scores.push(s.score); if (s.errors != null) day.errors.push(s.errors); }
    else day.abandoned++;
  }

  const days: DayStats[] = Array.from(byDay.entries()).map(([date, d]) => {
    const completed = d.won + d.lost;
    const total = d.won + d.lost + d.abandoned;
    const avgScore = d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null;
    const avgErrors = d.errors.length > 0 ? d.errors.reduce((a, b) => a + b, 0) / d.errors.length : null;
    return {
      date,
      label: formatLongDate(date).replace(/^\w/, c => c.toUpperCase()).slice(0, 10),
      sessions: total,
      unique_users: d.users.size,
      completed,
      won: d.won,
      lost: d.lost,
      abandoned: d.abandoned,
      avg_score: avgScore,
      avg_errors: avgErrors,
      win_rate: completed > 0 ? (d.won / completed) * 100 : null,
      completion_rate: total > 0 ? (completed / total) * 100 : null,
    };
  });

  // ---- Statistiques globales ----
  const userDays = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!userDays.has(s.user_id)) userDays.set(s.user_id, new Set());
    userDays.get(s.user_id)!.add(s.grid_date);
  }
  const multiDay = Array.from(userDays.values()).filter(d => d.size > 1).length;
  const monoDay = userDays.size - multiDay;
  const totalWon = sessions.filter(s => s.outcome === "won").length;
  const totalLost = sessions.filter(s => s.outcome === "lost").length;
  const totalAbandoned = sessions.filter(s => !s.outcome).length;

  const global: GlobalStats = {
    total_sessions: sessions.length,
    total_unique_users: userDays.size,
    multi_day_users: multiDay,
    mono_day_users: monoDay,
    total_won: totalWon,
    total_lost: totalLost,
    total_abandoned: totalAbandoned,
  };

  // ---- Taux de résolution par case (3x3) ----
  const POSITION_LABELS = [
    "L1·C1", "L1·C2", "L1·C3",
    "L2·C1", "L2·C2", "L2·C3",
    "L3·C1", "L3·C2", "L3·C3",
  ];
  const cellCounts = Array(9).fill(null).map(() => ({ solved: 0, total: 0 }));

  for (const s of sessions) {
    if (!s.cells || !Array.isArray(s.cells)) continue;
    (s.cells as { solved: boolean }[][]).forEach((row, r) => {
      row.forEach((cell, c) => {
        const idx = r * 3 + c;
        cellCounts[idx].total++;
        if (cell.solved) cellCounts[idx].solved++;
      });
    });
  }

  const cells: CellStat[] = cellCounts.map((c, i) => ({
    position: POSITION_LABELS[i],
    solve_rate: c.total > 0 ? (c.solved / c.total) * 100 : 0,
    solved: c.solved,
    total: c.total,
  }));

  return <DashboardClient days={days} cells={cells} global={global} />;
}
