import { NextRequest, NextResponse } from "next/server";
import { buildCriteriaPool, type Criterion } from "@/lib/grid-engine";
import { loadCommunes } from "@/lib/corpus";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rowIds, colIds } = body as { rowIds: string[]; colIds: string[] };

  if (
    !Array.isArray(rowIds) || !Array.isArray(colIds) ||
    rowIds.length !== 3 || colIds.length !== 3
  ) {
    return NextResponse.json(
      { error: "Exactement 3 IDs de lignes et 3 IDs de colonnes requis" },
      { status: 400 }
    );
  }

  const communes = loadCommunes();
  const pool = buildCriteriaPool(communes);

  const all = new Map<string, Criterion>();
  for (const criteria of pool.values()) {
    for (const c of criteria) all.set(c.id, c);
  }

  const rows = rowIds.map((id) => all.get(id)).filter((c): c is Criterion => !!c);
  const cols = colIds.map((id) => all.get(id)).filter((c): c is Criterion => !!c);

  if (rows.length !== 3 || cols.length !== 3) {
    return NextResponse.json({ error: "ID(s) de critère inconnu(s)" }, { status: 400 });
  }

  const cells = rows.map((row, r) =>
    cols.map((col, c) => {
      const solutions = communes
        .filter((co) => row.test(co) && col.test(co))
        .sort((a, b) => b.population - a.population)
        .map((s) => ({ name: s.nom_commune, dept: s.departement_nom, population: s.population }));
      return {
        rowId: rowIds[r],
        colId: colIds[c],
        totalSolutions: solutions.length,
        solutions,
        lastUsedDate: null as string | null,
      };
    })
  );

  return NextResponse.json({
    rows: rows.map((r) => ({ id: r.id, label: r.label, category: r.category })),
    cols: cols.map((c) => ({ id: c.id, label: c.label, category: c.category })),
    cells,
  });
}
