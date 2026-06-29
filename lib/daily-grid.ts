import { createClient } from "@supabase/supabase-js";
import { loadCommunes } from "./corpus";
import {
  buildCriteriaPool,
  findFullAssignment,
  generateGrid,
  getWellKnownCityCodes,
  mulberry32,
  seedFromString,
  type Criterion,
  type Grid,
  type GridCell,
} from "./grid-engine";

let cachedPool: Map<string, Criterion[]> | null = null;
let cachedTopVilleCodes: Set<string> | null = null;
let cachedGatewayCodes: Set<string> | null = null;
const gridCache = new Map<string, Grid | null>();

function getPool(): Map<string, Criterion[]> {
  if (!cachedPool) cachedPool = buildCriteriaPool(loadCommunes());
  return cachedPool;
}

function getTopVilleCodes(): Set<string> {
  if (!cachedTopVilleCodes) cachedTopVilleCodes = getWellKnownCityCodes(loadCommunes(), 1000);
  return cachedTopVilleCodes;
}

function getGatewayCodes(): Set<string> {
  if (!cachedGatewayCodes) cachedGatewayCodes = getWellKnownCityCodes(loadCommunes(), 300);
  return cachedGatewayCodes;
}

const EASY_MODE_START = "2026-06-24";

// ---- Reconstruction depuis les IDs stockés en base ----

function getAllCriteria(): Map<string, Criterion> {
  const all = new Map<string, Criterion>();
  for (const criteria of getPool().values()) {
    for (const c of criteria) all.set(c.id, c);
  }
  return all;
}

function reconstructGridFromIds(rowIds: string[], colIds: string[]): Grid | null {
  const communes = loadCommunes();
  const all = getAllCriteria();

  const rows = rowIds.map((id) => all.get(id)).filter((c): c is Criterion => !!c);
  const cols = colIds.map((id) => all.get(id)).filter((c): c is Criterion => !!c);
  if (rows.length !== 3 || cols.length !== 3) return null;

  const cells: GridCell[][] = rows.map((row) =>
    cols.map((col) => ({
      row,
      col,
      solutions: communes.filter((c) => row.test(c) && col.test(c)),
    }))
  );

  const solutionExample = findFullAssignment(cells);
  if (!solutionExample) return null;

  return { rows, cols, cells, solutionExample };
}

// ---- Génération par seed (fallback prod) ----

export function generateFromSeed(date: string): Grid | null {
  const communes = loadCommunes();
  const pool = getPool();
  const topVilleCodes = getTopVilleCodes();
  const rng = mulberry32(seedFromString(date));

  const easyMode = date >= EASY_MODE_START;
  const minSolutionsPerCell = easyMode ? 4 : 3;
  const gatewayCodes = easyMode ? getGatewayCodes() : undefined;
  const seed = seedFromString(date) >>> 0;
  let grid: Grid | null = null;

  if (seed % 4 === 0) {
    grid = generateGrid(communes, pool, rng, {
      topVilleCodes, gatewayCodes, minSolutionsPerCell,
      requiredCategory: "departement", maxAttempts: 2000,
    });
  }
  if (!grid) grid = generateGrid(communes, pool, rng, { topVilleCodes, gatewayCodes, minSolutionsPerCell });
  if (!grid && easyMode) grid = generateGrid(communes, pool, rng, { topVilleCodes, minSolutionsPerCell });
  if (!grid) grid = generateGrid(communes, pool, rng, { topVilleCodes });

  return grid;
}

// ---- API publique principale ----

/** Grille pour `date` : cherche d'abord dans scheduled_grids, sinon génère par seed. */
export async function getDailyGrid(date: string): Promise<Grid | null> {
  if (gridCache.has(date)) return gridCache.get(date) ?? null;

  // Lookup Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("scheduled_grids")
      .select("rows, cols")
      .eq("date", date)
      .single();

    if (data) {
      const rowIds = (data.rows as { id: string }[]).map((r) => r.id);
      const colIds = (data.cols as { id: string }[]).map((c) => c.id);
      const grid = reconstructGridFromIds(rowIds, colIds);
      if (grid) {
        gridCache.set(date, grid);
        return grid;
      }
    }
  } catch {
    // Supabase indisponible ou pas de ligne → fallback
  }

  const grid = generateFromSeed(date);
  gridCache.set(date, grid);
  return grid;
}

// ---- Types et helpers pour l'interface de curation ----

export type CellPreview = {
  rowId: string;
  colId: string;
  totalSolutions: number;
  topCities: { name: string; dept: string; population: number }[];
  lastUsedDate: string | null;
};

export type GridCandidate = {
  rows: { id: string; label: string; category: string }[];
  cols: { id: string; label: string; category: string }[];
  cells: CellPreview[][];
};

/**
 * Génère une grille candidate pour `date`, en évitant les croisements interdits.
 * `crossingLastUsed` est une map "rowId|colId" → date la plus récente d'utilisation (pour affichage).
 * `seedOffset` permet de générer des propositions différentes (0, 1, 2…).
 */
export function generateCandidateGrid(
  date: string,
  forbiddenCrossings: Set<string>,
  crossingLastUsed: Map<string, string>,
  seedOffset = 0,
  criterionLastUsed: Map<string, string> = new Map(),
): GridCandidate | null {
  const communes = loadCommunes();
  const pool = getPool();
  const topVilleCodes = getTopVilleCodes();
  const easyMode = date >= EASY_MODE_START;
  const minSolutionsPerCell = easyMode ? 4 : 3;
  const gatewayCodes = easyMode ? getGatewayCodes() : undefined;

  // Mélange de seeds pour des propositions variées
  const baseSeed = (seedFromString(date) ^ (seedOffset * 2654435761)) >>> 0;
  const rng = mulberry32(baseSeed);

  // Calcule les poids de chaque critère selon son ancienneté (plus ancien = poids plus élevé)
  const criterionWeights = new Map<string, number>();
  for (const [criterionId, lastUsedDate] of criterionLastUsed) {
    const daysSince = Math.round(
      (new Date(date).getTime() - new Date(lastUsedDate).getTime()) / 86_400_000
    );
    criterionWeights.set(criterionId, Math.max(1, daysSince));
  }

  // Essai 1 : toutes les contraintes + croisements interdits
  let grid = generateGrid(communes, pool, rng, {
    topVilleCodes, gatewayCodes, minSolutionsPerCell,
    forbiddenCrossings, criterionWeights, maxAttempts: 10000,
  });

  // Essai 2 : relâche les croisements interdits
  if (!grid) {
    grid = generateGrid(communes, pool, rng, {
      topVilleCodes, gatewayCodes, minSolutionsPerCell,
      criterionWeights, maxAttempts: 10000,
    });
  }

  // Essai 3 : relâche gatewayCodes
  if (!grid) {
    grid = generateGrid(communes, pool, rng, {
      topVilleCodes, minSolutionsPerCell,
      criterionWeights, maxAttempts: 10000,
    });
  }

  // Essai 4 : relâche tout
  if (!grid) {
    grid = generateGrid(communes, pool, rng, {
      topVilleCodes, maxAttempts: 10000,
    });
  }

  if (!grid) return null;

  return {
    rows: grid.rows.map((r) => ({ id: r.id, label: r.label, category: r.category })),
    cols: grid.cols.map((c) => ({ id: c.id, label: c.label, category: c.category })),
    cells: grid.cells.map((row, r) =>
      row.map((cell, c) => {
        const key = `${grid.rows[r].id}|${grid.cols[c].id}`;
        return {
          rowId: grid.rows[r].id,
          colId: grid.cols[c].id,
          totalSolutions: cell.solutions.length,
          topCities: [...cell.solutions]
            .sort((a, b) => b.population - a.population)
            .slice(0, 5)
            .map((s) => ({ name: s.nom_commune, dept: s.departement_nom, population: s.population })),
          lastUsedDate: crossingLastUsed.get(key) ?? null,
        };
      })
    ),
  };
}
