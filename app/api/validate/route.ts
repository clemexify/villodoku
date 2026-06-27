import { NextResponse } from "next/server";
import { getDailyGrid } from "@/lib/daily-grid";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ValidateBody {
  date?: unknown;
  row?: unknown;
  col?: unknown;
  codeCommune?: unknown;
  usedCodes?: unknown;
}

function isCellIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 2;
}

/**
 * POST /api/validate
 * Body: { date: "YYYY-MM-DD", row: 0-2, col: 0-2, codeCommune: string, usedCodes?: string[] }
 *
 * Vérifie côté serveur si `codeCommune` est une réponse valide pour la case
 * (row, col) de la grille du jour, et qu'elle n'a pas déjà été utilisée
 * dans cette grille.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ValidateBody | null;
  if (!body) {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { date, row, col, codeCommune, usedCodes } = body;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Format de date invalide (attendu YYYY-MM-DD)" }, { status: 400 });
  }
  if (!isCellIndex(row) || !isCellIndex(col)) {
    return NextResponse.json({ error: "row/col doivent être des entiers entre 0 et 2" }, { status: 400 });
  }
  if (typeof codeCommune !== "string" || codeCommune.length === 0) {
    return NextResponse.json({ error: "codeCommune requis" }, { status: 400 });
  }

  const grid = await getDailyGrid(date);
  if (!grid) {
    return NextResponse.json({ error: "Grille introuvable pour cette date" }, { status: 404 });
  }

  const cell = grid.cells[row][col];
  const commune = cell.solutions.find((c) => c.code_commune === codeCommune);

  if (!commune) {
    return NextResponse.json({ valid: false, reason: "not_in_cell" });
  }

  const used = Array.isArray(usedCodes) ? usedCodes : [];
  if (used.includes(codeCommune)) {
    return NextResponse.json({ valid: false, reason: "already_used" });
  }

  // Rang relatif : position dans la liste triée par population décroissante
  // (0 = ville la plus connue/commune, total-1 = la plus rare/obscure)
  const sorted = [...cell.solutions].sort((a, b) => b.population - a.population);
  const solutionRank = sorted.findIndex((s) => s.code_commune === codeCommune);

  return NextResponse.json({
    valid: true,
    commune: {
      code_commune: commune.code_commune,
      nom_commune: commune.nom_commune,
      departement_nom: commune.departement_nom,
      population: commune.population,
    },
    solutionRank,
    solutionsCount: cell.solutions.length,
  });
}
