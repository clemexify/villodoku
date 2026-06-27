import { createClient } from "@supabase/supabase-js";
import { todayParis } from "@/lib/date-format";
import CurateClient from "./CurateClient";

export const dynamic = "force-dynamic";

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function shortLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

export default async function CuratePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: scheduled } = await supabase
    .from("scheduled_grids")
    .select("date, rows, cols, approved_at")
    .order("date", { ascending: true });

  const today = todayParis();
  const HISTORY_START = "2026-06-15"; // première grille à afficher
  const horizon = 21; // jours futurs à planifier

  // Grilles déjà validées, indexées par date
  const scheduledMap: Record<string, {
    rows: { id: string; label: string; category: string }[];
    cols: { id: string; label: string; category: string }[];
    approved_at: string;
  }> = {};
  for (const row of (scheduled ?? [])) {
    scheduledMap[row.date as string] = {
      rows: row.rows as { id: string; label: string; category: string }[],
      cols: row.cols as { id: string; label: string; category: string }[],
      approved_at: row.approved_at as string,
    };
  }

  // Jours passés depuis HISTORY_START jusqu'à aujourd'hui inclus (lecture seule)
  const pastDays: { date: string; label: string }[] = [];
  for (
    let d = new Date(`${HISTORY_START}T00:00:00Z`);
    d.toISOString().slice(0, 10) <= today;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const date = d.toISOString().slice(0, 10);
    pastDays.push({ date, label: shortLabel(date) });
  }

  // Jours futurs à valider : demain + horizon jours
  const futureDays = Array.from({ length: horizon }, (_, i) => {
    const date = addDays(today, i + 1);
    return { date, label: shortLabel(date) };
  });

  const coveredCount = futureDays.filter((d) => scheduledMap[d.date]).length;

  return (
    <CurateClient
      pastDays={pastDays}
      futureDays={futureDays}
      scheduled={scheduledMap}
      coveredCount={coveredCount}
    />
  );
}
