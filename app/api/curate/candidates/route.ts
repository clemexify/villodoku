import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { generateCandidateGrid } from "@/lib/daily-grid";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const date = searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const seedOffset = parseInt(searchParams.get("seed") ?? "0", 10);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: scheduled } = await supabase
    .from("scheduled_grids")
    .select("date, rows, cols");

  // Construit les croisements interdits et le cooldown par critère individuel
  const forbiddenCrossings = new Set<string>();
  const crossingLastUsed = new Map<string, string>();
  const criterionLastUsed = new Map<string, string>();
  const targetTime = new Date(date).getTime();

  for (const row of (scheduled ?? [])) {
    if (row.date === date) continue;
    const daysDiff = Math.abs(new Date(row.date).getTime() - targetTime) / 86_400_000;
    const rows = row.rows as { id: string }[];
    const cols = row.cols as { id: string }[];

    // Cooldown par critère individuel
    for (const crit of [...rows, ...cols]) {
      const existing = criterionLastUsed.get(crit.id);
      if (!existing || (row.date as string) > existing) {
        criterionLastUsed.set(crit.id, row.date as string);
      }
    }

    // Croisements interdits (paires)
    for (const r of rows) {
      for (const c of cols) {
        const key = `${r.id}|${c.id}`;
        const existing = crossingLastUsed.get(key);
        if (!existing || row.date > existing) crossingLastUsed.set(key, row.date as string);
        if (daysDiff <= 30) forbiddenCrossings.add(key);
      }
    }
  }

  const candidate = generateCandidateGrid(date, forbiddenCrossings, crossingLastUsed, seedOffset, criterionLastUsed);

  if (!candidate) {
    return NextResponse.json({ error: "Impossible de générer une grille" }, { status: 500 });
  }

  return NextResponse.json(candidate);
}
