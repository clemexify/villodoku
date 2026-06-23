import { loadCommunes } from "./corpus";
import {
  buildCriteriaPool,
  generateGrid,
  getWellKnownCityCodes,
  mulberry32,
  seedFromString,
  type Criterion,
  type Grid,
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

// À partir de cette date, les grilles sont générées avec des critères plus accessibles.
const EASY_MODE_START = "2026-06-24";

/** Grille du jour pour `date` (YYYY-MM-DD), générée et mise en cache une seule fois. */
export function getDailyGrid(date: string): Grid | null {
  if (!gridCache.has(date)) {
    const communes = loadCommunes();
    const pool = getPool();
    const topVilleCodes = getTopVilleCodes();
    const rng = mulberry32(seedFromString(date));

    const easyMode = date >= EASY_MODE_START;
    const minSolutionsPerCell = easyMode ? 8 : 3;

    // Priorité tournante : 1 date sur 4, on essaie d'abord un critère "département".
    // Cela garantit que ce critère apparaît régulièrement tout en maintenant la diversité.
    const seed = seedFromString(date) >>> 0;
    let grid: Grid | null = null;

    const gatewayCodes = easyMode ? getGatewayCodes() : undefined;

    if (seed % 4 === 0) {
      grid = generateGrid(communes, pool, rng, {
        topVilleCodes,
        gatewayCodes,
        minSolutionsPerCell,
        requiredCategory: 'departement',
        maxAttempts: 2000,
      });
    }

    if (!grid) {
      grid = generateGrid(communes, pool, rng, { topVilleCodes, gatewayCodes, minSolutionsPerCell });
    }

    gridCache.set(date, grid);
  }
  return gridCache.get(date) ?? null;
}
