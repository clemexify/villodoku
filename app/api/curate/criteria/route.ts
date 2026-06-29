import { NextResponse } from "next/server";
import { buildCriteriaPool } from "@/lib/grid-engine";
import { loadCommunes } from "@/lib/corpus";

export async function GET() {
  const pool = buildCriteriaPool(loadCommunes());
  const categories = Array.from(pool.entries()).map(([name, criteria]) => ({
    name,
    criteria: criteria.map((c) => ({ id: c.id, label: c.label, category: c.category })),
  }));
  return NextResponse.json({ categories });
}
