import { loadCommunes } from "./corpus";
import {
  buildCriteriaPool,
  generateDailyGrid,
  getWellKnownCityCodes,
  type Criterion,
  type Grid,
} from "./grid-engine";

let cachedPool: Map<string, Criterion[]> | null = null;
let cachedTopVilleCodes: Set<string> | null = null;
const gridCache = new Map<string, Grid | null>();

function getPool(): Map<string, Criterion[]> {
  if (!cachedPool) cachedPool = buildCriteriaPool(loadCommunes());
  return cachedPool;
}

function getTopVilleCodes(): Set<string> {
  if (!cachedTopVilleCodes) cachedTopVilleCodes = getWellKnownCityCodes(loadCommunes(), 100);
  return cachedTopVilleCodes;
}

/** Grille du jour pour `date` (YYYY-MM-DD), générée et mise en cache une seule fois. */
export function getDailyGrid(date: string): Grid | null {
  if (!gridCache.has(date)) {
    const grid = generateDailyGrid(loadCommunes(), getPool(), date, getTopVilleCodes());
    gridCache.set(date, grid);
  }
  return gridCache.get(date) ?? null;
}
