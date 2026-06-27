import { NextResponse } from "next/server";
import { getDailyGrid } from "@/lib/daily-grid";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/solutions?date=YYYY-MM-DD
 *
 * Renvoie les solutions de chaque case de la grille.
 * Appelé uniquement en fin de partie (gagné ou perdu) — le contrôle
 * est côté client ; côté serveur on expose librement puisque les solutions
 * sont déterministes par la date (même logique que le score).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });
  }

  const grid = await getDailyGrid(date);
  if (!grid) {
    return NextResponse.json({ error: "Grille introuvable" }, { status: 404 });
  }

  const cells = grid.cells.map((row) =>
    row.map((cell) => {
      const sorted = [...cell.solutions].sort((a, b) => b.population - a.population);
      const total = sorted.length;

      return {
        count: total,
        // Top 20 triées par population décroissante (plus commun en premier).
        // Le client insère la réponse du joueur à sa position si elle n'y est pas.
        communes: sorted.slice(0, 20).map((c) => ({
          nom_commune: c.nom_commune,
          departement_nom: c.departement_nom,
          region_nom: c.region_nom,
          population: c.population,
          est_prefecture: c.est_prefecture,
          est_sous_prefecture: c.est_sous_prefecture,
          est_drom: c.est_drom,
          est_montagne: c.est_montagne,
          mer_bordee: c.mer_bordee,
          frontiere_terrestre: c.frontiere_terrestre,
          cours_eau: c.cours_eau,
          // Rang dans la liste triée par pop desc (0 = plus peuplée) et total
          // pour calculer le badge de rareté relatif côté client.
          rank: sorted.findIndex((s) => s.code_commune === c.code_commune),
          solutionsCount: total,
        })),
      };
    })
  );

  return NextResponse.json({ date, cells });
}
