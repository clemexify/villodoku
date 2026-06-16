/**
 * Enrichit le corpus avec le champ `altitude` (mètres, SRTM 90m)
 * pour chaque commune, en utilisant :
 *   1. geo.api.gouv.fr  → coordonnées GPS du centroïde
 *   2. api.opentopodata.org/v1/srtm90m → altitude
 *
 * Usage: node scripts/enrich-altitude.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, '../data/villodoku_corpus.json');
const BATCH_SIZE = 100;
const TOPO_DELAY_MS = 1100; // OpenTopoData public: 1 req/s

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Étape 1 : coordonnées via geo.api.gouv.fr ───────────────────────────────

async function fetchCoords(codes) {
  const url = `https://geo.api.gouv.fr/communes?codes=${codes.join(',')}&fields=centre&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo.api.gouv.fr HTTP ${res.status}`);
  const json = await res.json();
  // Retourne { code_commune: [lon, lat] }
  const map = {};
  for (const item of json) {
    if (item.centre?.coordinates) {
      map[item.code] = item.centre.coordinates; // [lon, lat]
    }
  }
  return map;
}

// ── Étape 2 : altitude via OpenTopoData (SRTM 90m) ──────────────────────────

async function fetchElevations(points) {
  // points: [{ code, lat, lon }]
  const locations = points.map((p) => `${p.lat},${p.lon}`).join('|');
  const url = `https://api.opentopodata.org/v1/srtm90m?locations=${locations}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenTopoData HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`OpenTopoData status: ${json.status}`);
  // Retourne { code: elevation }
  const map = {};
  for (let i = 0; i < json.results.length; i++) {
    map[points[i].code] = Math.round(json.results[i].elevation ?? 0);
  }
  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw = fs.readFileSync(CORPUS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const communes = data.communes;

  console.log(`Corpus: ${communes.length} communes`);

  // ── Phase 1 : coordonnées ─────────────────────────────────────────────────
  console.log('\n[1/2] Récupération des coordonnées (geo.api.gouv.fr)…');
  const coordsMap = {}; // code → [lon, lat]
  const codes = communes.map((c) => c.code_commune);

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(codes.length / BATCH_SIZE)} (${i + 1}-${Math.min(i + BATCH_SIZE, codes.length)})… `);
    try {
      const result = await fetchCoords(batch);
      Object.assign(coordsMap, result);
      process.stdout.write(`OK (${Object.keys(result).length} coords)\n`);
    } catch (err) {
      process.stdout.write(`ERREUR: ${err.message}\n`);
    }
    // Petite pause entre les batches geo
    if (i + BATCH_SIZE < codes.length) await sleep(200);
  }

  const missing = codes.filter((c) => !coordsMap[c]);
  console.log(`  → ${Object.keys(coordsMap).length} coordonnées obtenues, ${missing.length} manquantes`);
  if (missing.length > 0) {
    console.log(`  Codes sans coordonnées : ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`);
  }

  // ── Phase 2 : altitude ────────────────────────────────────────────────────
  console.log('\n[2/2] Récupération des altitudes (OpenTopoData SRTM 90m)…');
  const altMap = {}; // code → altitude (m)

  const points = codes
    .filter((c) => coordsMap[c])
    .map((c) => ({ code: c, lat: coordsMap[c][1], lon: coordsMap[c][0] }));

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(points.length / BATCH_SIZE)} (${i + 1}-${Math.min(i + BATCH_SIZE, points.length)})… `);
    try {
      const result = await fetchElevations(batch);
      Object.assign(altMap, result);
      const vals = Object.values(result);
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      process.stdout.write(`OK (moy. ${avg}m)\n`);
    } catch (err) {
      process.stdout.write(`ERREUR: ${err.message}\n`);
      // Retry once after 3s
      await sleep(3000);
      try {
        const result = await fetchElevations(batch);
        Object.assign(altMap, result);
        process.stdout.write(`  → Retry OK\n`);
      } catch (err2) {
        process.stdout.write(`  → Retry échoué: ${err2.message}\n`);
      }
    }
    if (i + BATCH_SIZE < points.length) await sleep(TOPO_DELAY_MS);
  }

  console.log(`  → ${Object.keys(altMap).length} altitudes obtenues`);

  // ── Phase 3 : enrichissement du corpus ───────────────────────────────────
  console.log('\n[3/3] Enrichissement du corpus…');
  let enriched = 0;
  for (const commune of communes) {
    commune.altitude = altMap[commune.code_commune] ?? null;
    if (commune.altitude !== null) enriched++;
  }

  // Stats
  const withAlt = communes.filter((c) => c.altitude !== null);
  const above500 = withAlt.filter((c) => c.altitude > 500);
  const above1000 = withAlt.filter((c) => c.altitude > 1000);
  console.log(`  Enrichies : ${enriched}/${communes.length}`);
  console.log(`  > 500m    : ${above500.length} communes`);
  console.log(`  > 1000m   : ${above1000.length} communes`);
  console.log(`\n  Top 10 altitudes :`);
  withAlt
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 10)
    .forEach((c) => console.log(`    ${c.altitude}m  ${c.nom_commune} (${c.departement_nom})`));

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  fs.writeFileSync(CORPUS_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✓ Corpus sauvegardé → ${CORPUS_PATH}`);
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
