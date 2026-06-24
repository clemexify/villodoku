import { createClient } from "@supabase/supabase-js";
import DashboardClient, { type DayStats, type TrafficDay, type GlobalStats, type CrossingStat, type Insight } from "./DashboardClient";
import { getDailyGrid } from "@/lib/daily-grid";

export const dynamic = "force-dynamic";

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  const num = d.getUTCDate();
  return `${day} ${num}`;
}

function parisDateFromTs(ts: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ts)).split("/").reverse().join("-");
}

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

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("user_id, grid_date, outcome, score, errors, cells, created_at, shared_whatsapp")
    .order("grid_date", { ascending: true });

  if (!sessions) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Erreur de connexion Supabase.</p>
      </main>
    );
  }

  // ---- Agrégation par jour de grille (grid_date) ----
  const byDay = new Map<string, {
    sessions: number;
    won: number; lost: number; abandoned: number;
    scores: number[]; errors: number[];
  }>();

  for (const s of sessions) {
    const date = s.grid_date as string;
    if (!byDay.has(date)) {
      byDay.set(date, { sessions: 0, won: 0, lost: 0, abandoned: 0, scores: [], errors: [] });
    }
    const day = byDay.get(date)!;
    day.sessions++;
    if (s.outcome === "won") {
      day.won++;
      if (s.score != null) day.scores.push(s.score);
      if (s.errors != null) day.errors.push(s.errors);
    } else if (s.outcome === "lost") {
      day.lost++;
      if (s.score != null) day.scores.push(s.score);
      if (s.errors != null) day.errors.push(s.errors);
    } else {
      day.abandoned++;
    }
  }

  const days: DayStats[] = Array.from(byDay.entries()).map(([date, d]) => {
    const completed = d.won + d.lost;
    const total = d.sessions;
    const avgScore = d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null;
    const avgErrors = d.errors.length > 0 ? d.errors.reduce((a, b) => a + b, 0) / d.errors.length : null;
    return {
      date,
      label: shortDate(date),
      sessions: total,
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

  // ---- Trafic par jour calendaire (created_at) ----
  const trafficMap = new Map<string, { visitors: Set<string>; started: number; completed: number }>();
  for (const s of sessions) {
    const day = s.created_at
      ? parisDateFromTs(s.created_at as string)
      : (s.grid_date as string);
    if (!trafficMap.has(day)) trafficMap.set(day, { visitors: new Set(), started: 0, completed: 0 });
    const d = trafficMap.get(day)!;
    d.visitors.add(s.user_id as string);
    d.started++;
    if (s.outcome) d.completed++;
  }

  const trafficDays: TrafficDay[] = Array.from(trafficMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      label: shortDate(date),
      visitors: d.visitors.size,
      started: d.started,
      completed: d.completed,
    }));

  // ---- Statistiques globales ----
  const userDays = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!userDays.has(s.user_id)) userDays.set(s.user_id, new Set());
    userDays.get(s.user_id)!.add(s.grid_date);
  }
  const multiDay = Array.from(userDays.values()).filter(d => d.size > 1).length;
  const sharedCount = sessions.filter(s => s.shared_whatsapp).length;

  const global: GlobalStats = {
    total_sessions: sessions.length,
    total_unique_users: userDays.size,
    multi_day_users: multiDay,
    mono_day_users: userDays.size - multiDay,
    total_won: sessions.filter(s => s.outcome === "won").length,
    total_lost: sessions.filter(s => s.outcome === "lost").length,
    total_abandoned: sessions.filter(s => !s.outcome).length,
    shared_count: sharedCount,
  };

  // ---- Croisements concrets ----
  const uniqueDates = [...new Set(sessions.map(s => s.grid_date as string))];
  const gridsByDate = new Map<string, { rows: { label: string }[]; cols: { label: string }[] }>();
  for (const date of uniqueDates) {
    const grid = getDailyGrid(date);
    if (grid) gridsByDate.set(date, { rows: grid.rows, cols: grid.cols });
  }

  const crossingMap = new Map<string, { solved: number; total: number }>();
  for (const s of sessions) {
    if (!s.cells || !Array.isArray(s.cells)) continue;
    const grid = gridsByDate.get(s.grid_date as string);
    if (!grid) continue;
    (s.cells as { solved: boolean }[][]).forEach((row, r) => {
      row.forEach((cell, c) => {
        const key = `${grid.rows[r].label} × ${grid.cols[c].label}`;
        if (!crossingMap.has(key)) crossingMap.set(key, { solved: 0, total: 0 });
        const stat = crossingMap.get(key)!;
        stat.total++;
        if (cell.solved) stat.solved++;
      });
    });
  }

  const crossings: CrossingStat[] = Array.from(crossingMap.entries())
    .map(([label, { solved, total }]) => ({
      label,
      solve_rate: total > 0 ? Math.round((solved / total) * 100) : 0,
      solved,
      total,
    }))
    .filter(c => c.total >= 2)
    .sort((a, b) => b.solve_rate - a.solve_rate);

  // ---- Insights ----
  const insights: Insight[] = [];
  const winRate = global.total_won + global.total_lost > 0
    ? Math.round((global.total_won / (global.total_won + global.total_lost)) * 100) : 0;
  const completionRate = global.total_sessions > 0
    ? Math.round(((global.total_won + global.total_lost) / global.total_sessions) * 100) : 0;
  const retentionRate = global.total_unique_users > 0
    ? Math.round((global.multi_day_users / global.total_unique_users) * 100) : 0;
  const shareRate = global.total_sessions > 0
    ? Math.round((global.shared_count / global.total_sessions) * 100) : 0;
  const avgErrors = days.flatMap(d => d.avg_errors != null ? [d.avg_errors] : []);
  const globalAvgErrors = avgErrors.length > 0 ? avgErrors.reduce((a, b) => a + b, 0) / avgErrors.length : null;
  const recentTraffic = trafficDays.slice(-3);
  const oldTraffic = trafficDays.slice(0, Math.max(1, trafficDays.length - 3));
  const recentAvgVisitors = recentTraffic.length > 0 ? recentTraffic.reduce((a, d) => a + d.visitors, 0) / recentTraffic.length : 0;
  const oldAvgVisitors = oldTraffic.length > 0 ? oldTraffic.reduce((a, d) => a + d.visitors, 0) / oldTraffic.length : 0;
  const tooHardCrossings = crossings.filter(c => c.solve_rate < 20 && c.total >= 3);
  const tooEasyCrossings = crossings.filter(c => c.solve_rate > 85 && c.total >= 3);

  // Trafic
  if (trafficDays.length >= 2 && recentAvgVisitors > oldAvgVisitors * 1.2) {
    insights.push({ type: "success", title: "Croissance du trafic", text: `Les ${recentTraffic.length} derniers jours affichent ${Math.round(recentAvgVisitors)} visiteurs/jour en moyenne vs ${Math.round(oldAvgVisitors)} sur la période précédente (+${Math.round((recentAvgVisitors / oldAvgVisitors - 1) * 100)}%).`, recommendation: "Capitaliser sur cette dynamique avec un partage WhatsApp ou un système de défi entre amis." });
  } else if (trafficDays.length >= 2 && recentAvgVisitors < oldAvgVisitors * 0.8) {
    insights.push({ type: "warning", title: "Baisse du trafic", text: `Le trafic a baissé (${Math.round(recentAvgVisitors)} vs ${Math.round(oldAvgVisitors)} visiteurs/jour).`, recommendation: "Relancer une communication sur les réseaux sociaux ou ajouter une mécanique de partage quotidien." });
  } else if (trafficDays.length > 0) {
    insights.push({ type: "info", title: "Trafic stable", text: `Environ ${Math.round(recentAvgVisitors)} visiteurs/jour sur les derniers jours.`, recommendation: "Mettre en place un partage de résultat pour amplifier la diffusion organique." });
  }

  // Difficulté
  if (winRate < 20) {
    insights.push({ type: "danger", title: `Jeu trop difficile — taux de victoire à ${winRate}%`, text: `Moins d'un joueur sur cinq remporte la grille. Le découragement risque de nuire à la rétention.`, recommendation: "Augmenter minSolutionsPerCell à 10+ et vérifier que les critères les plus rares ne s'associent pas." });
  } else if (winRate < 35) {
    insights.push({ type: "warning", title: `Difficulté élevée — taux de victoire à ${winRate}%`, text: `Le jeu est challengeant mais potentiellement frustrant pour les nouveaux joueurs.`, recommendation: "Envisager un indice optionnel par case (gateway city visible)." });
  } else if (winRate > 65) {
    insights.push({ type: "warning", title: `Jeu trop facile — taux de victoire à ${winRate}%`, text: `Plus des deux tiers des parties complètes se terminent en victoire.`, recommendation: "Réduire minSolutionsPerCell ou introduire des critères plus rares." });
  } else {
    insights.push({ type: "success", title: `Difficulté équilibrée — taux de victoire à ${winRate}%`, text: `Le ratio victoire/échec est dans une bonne fourchette (35–65%).`, recommendation: "Maintenir ce niveau de difficulté et continuer à diversifier les critères." });
  }

  // Complétion
  if (completionRate < 40) {
    insights.push({ type: "danger", title: `Taux d'abandon élevé — ${100 - completionRate}% quittent sans finir`, text: `Moins de la moitié des sessions aboutissent à un résultat.`, recommendation: "Analyser si l'abandon est en début ou en cours de partie. Ajouter un bouton 'Voir les solutions' dès le départ." });
  } else if (completionRate < 60) {
    insights.push({ type: "warning", title: `Complétion modérée à ${completionRate}%`, text: `4 joueurs sur 10 abandonnent avant la fin.`, recommendation: "Tester un message d'encouragement après la 3e case résolue." });
  } else {
    insights.push({ type: "success", title: `Bonne complétion à ${completionRate}%`, text: `La majorité des joueurs va jusqu'au bout de la partie.`, recommendation: "Valoriser cet engagement avec un score bien visible et un message de partage en fin de partie." });
  }

  // Partage
  if (global.total_sessions >= 10) {
    if (shareRate < 5) {
      insights.push({ type: "warning", title: `Partage WhatsApp faible — ${shareRate}% des joueurs partagent`, text: `Peu de joueurs utilisent le bouton de partage, ce qui limite la croissance organique.`, recommendation: "Rendre le bouton WhatsApp plus visible ou ajouter un message d'incitation en fin de partie." });
    } else {
      insights.push({ type: "success", title: `Partage WhatsApp à ${shareRate}%`, text: `${global.shared_count} parties partagées sur ${global.total_sessions} sessions.`, recommendation: "Continuer à soigner le message partagé pour maximiser les clics depuis WhatsApp." });
    }
  }

  // Erreurs
  if (globalAvgErrors !== null && globalAvgErrors > 3.5) {
    insights.push({ type: "warning", title: `Erreurs moyennes élevées (${globalAvgErrors.toFixed(1)}/5)`, text: `Les joueurs font beaucoup d'erreurs, ce qui suggère que les critères sont peu clairs.`, recommendation: "Revoir les libellés des critères (plus courts, plus explicites)." });
  }

  // Rétention
  if (retentionRate < 10 && global.total_unique_users >= 10) {
    insights.push({ type: "danger", title: `Rétention très faible — ${retentionRate}% reviennent`, text: `La quasi-totalité des joueurs ne revient pas le lendemain.`, recommendation: "Mettre en place un système de streak visible + notification quotidienne. Le partage WhatsApp aide aussi." });
  } else if (retentionRate < 25 && global.total_unique_users >= 10) {
    insights.push({ type: "warning", title: `Rétention à améliorer — ${retentionRate}% reviennent`, text: `1 joueur sur 4 revient, prometteur mais insuffisant pour une croissance organique.`, recommendation: "Afficher le streak plus proéminement et ajouter une récompense symbolique pour les séries de 7 jours." });
  } else if (global.total_unique_users >= 10) {
    insights.push({ type: "success", title: `Bonne rétention — ${retentionRate}% de joueurs multi-jours`, text: `Une part significative des joueurs revient jouer.`, recommendation: "Exploiter cette base fidèle pour du bouche-à-oreille : bouton de partage du score, classement entre amis." });
  }

  // Croisements problématiques
  if (tooHardCrossings.length > 0) {
    insights.push({ type: "danger", title: `${tooHardCrossings.length} croisement${tooHardCrossings.length > 1 ? "s" : ""} quasi-impossible${tooHardCrossings.length > 1 ? "s" : ""} (< 20%)`, text: `Les cases "${tooHardCrossings.slice(0, 2).map(c => c.label).join('" et "')}"${tooHardCrossings.length > 2 ? ` (et ${tooHardCrossings.length - 2} autres)` : ""} ne sont presque jamais résolues.`, recommendation: "Ajouter ces paires à la liste des conflits bloqués dans grid-engine.ts." });
  }
  if (tooEasyCrossings.length > 0) {
    insights.push({ type: "info", title: `${tooEasyCrossings.length} croisement${tooEasyCrossings.length > 1 ? "s" : ""} très facile${tooEasyCrossings.length > 1 ? "s" : ""} (> 85%)`, text: `"${tooEasyCrossings[0].label}" et similaires sont résolus par presque tous les joueurs.`, recommendation: "À conserver si le taux de victoire global est bas, à durcir si le jeu est trop facile." });
  }

  return <DashboardClient days={days} trafficDays={trafficDays} global={global} crossings={crossings} insights={insights} />;
}
