import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildCriteriaPool } from "@/lib/grid-engine";
import { loadCommunes } from "@/lib/corpus";

export async function GET() {
  const pool = buildCriteriaPool(loadCommunes());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: scheduled } = await supabase
    .from("scheduled_grids")
    .select("date, rows, cols");

  const lastUsed = new Map<string, string>();
  for (const row of (scheduled ?? [])) {
    for (const crit of [
      ...(row.rows as { id: string }[]),
      ...(row.cols as { id: string }[]),
    ]) {
      const existing = lastUsed.get(crit.id);
      if (!existing || (row.date as string) > existing) {
        lastUsed.set(crit.id, row.date as string);
      }
    }
  }

  const categories = Array.from(pool.entries()).map(([name, criteria]) => ({
    name,
    criteria: criteria.map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category,
      lastUsed: lastUsed.get(c.id) ?? null,
    })),
  }));

  return NextResponse.json({ categories });
}
