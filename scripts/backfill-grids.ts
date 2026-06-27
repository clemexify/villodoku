// Backfill scheduled_grids in Supabase for dates 2026-06-15 → 2026-06-27
// Run with: node --env-file=.env.local --import tsx/esm scripts/backfill-grids.ts
import { createClient } from "@supabase/supabase-js";
import { generateFromSeed } from "../lib/daily-grid.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const dates: string[] = [];
const start = new Date("2026-06-15T00:00:00Z");
const end   = new Date("2026-06-27T00:00:00Z");
for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
  dates.push(d.toISOString().slice(0, 10));
}

for (const date of dates) {
  const grid = generateFromSeed(date);
  if (!grid) {
    console.log(`❌ ${date}: génération impossible`);
    continue;
  }
  const rows = grid.rows.map((r) => ({ id: r.id, label: r.label, category: r.category }));
  const cols = grid.cols.map((c) => ({ id: c.id, label: c.label, category: c.category }));

  const { error } = await supabase
    .from("scheduled_grids")
    .upsert({ date, rows, cols }, { onConflict: "date" });

  if (error) {
    console.log(`❌ ${date}: ${error.message}`);
  } else {
    console.log(`✓  ${date}  ${rows.map((r) => r.label).join(" | ")}  ×  ${cols.map((c) => c.label).join(" | ")}`);
  }
}
