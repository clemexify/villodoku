import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCriteriaPool,
  generateDailyGrid,
  getWellKnownCityCodes,
  type Commune,
} from '../lib/grid-engine.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corpusPath = path.join(__dirname, '..', 'data', 'villodoku_corpus.json');

const raw = JSON.parse(readFileSync(corpusPath, 'utf-8')) as { communes: Commune[] };
const communes = raw.communes;

const pool = buildCriteriaPool(communes);
const topVilleCodes = getWellKnownCityCodes(communes, 100);

const NUM_GRIDS = 10;
const startDate = new Date('2026-06-14T00:00:00Z');

let success = 0;

for (let i = 0; i < NUM_GRIDS; i++) {
  const date = new Date(startDate);
  date.setUTCDate(date.getUTCDate() + i);
  const dateStr = date.toISOString().slice(0, 10);

  const grid = generateDailyGrid(communes, pool, dateStr, topVilleCodes);

  if (!grid) {
    console.log(`=== Grille du ${dateStr} : AUCUNE GRILLE VALIDE TROUVÉE ===\n`);
    continue;
  }
  success++;

  console.log(`=== Grille du ${dateStr} ===`);
  console.log('Lignes:');
  grid.rows.forEach((r, idx) => console.log(`  L${idx + 1}: ${r.label}`));
  console.log('Colonnes:');
  grid.cols.forEach((c, idx) => console.log(`  C${idx + 1}: ${c.label}`));
  console.log();

  console.log('Cases (nb solutions | exemple ville connue):');
  for (let r = 0; r < 3; r++) {
    const line: string[] = [];
    for (let c = 0; c < 3; c++) {
      const cell = grid.cells[r][c];
      const known = cell.solutions.find((s) => topVilleCodes.has(s.code_commune));
      line.push(`${String(cell.solutions.length).padStart(3)} sol. (${known?.nom_commune ?? '?'})`);
    }
    console.log(`  L${r + 1}: ` + line.join('  |  '));
  }
  console.log();

  console.log("Exemple d'affectation valide (9 villes distinctes):");
  for (let r = 0; r < 3; r++) {
    const line: string[] = [];
    for (let c = 0; c < 3; c++) {
      line.push(grid.solutionExample[r][c].nom_commune);
    }
    console.log(`  L${r + 1}: ` + line.join(' | '));
  }
  console.log('\n');
}

console.log(`--- ${success}/${NUM_GRIDS} grilles générées avec succès ---`);
