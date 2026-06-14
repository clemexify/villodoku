import { NextResponse } from "next/server";
import { getDailyGrid } from "@/lib/daily-grid";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/grid?date=YYYY-MM-DD (date optionnelle, défaut: aujourd'hui)
 *
 * Renvoie les critères de ligne/colonne de la grille du jour.
 * Ne renvoie jamais les solutions valides : la validation des réponses
 * se fait côté serveur via /api/validate.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Format de date invalide (attendu YYYY-MM-DD)" }, { status: 400 });
  }

  const grid = getDailyGrid(date);
  if (!grid) {
    return NextResponse.json({ error: "Impossible de générer la grille pour cette date" }, { status: 500 });
  }

  return NextResponse.json({
    date,
    rows: grid.rows.map((r) => ({ id: r.id, label: r.label })),
    cols: grid.cols.map((c) => ({ id: c.id, label: c.label })),
  });
}
