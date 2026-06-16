/**
 * Enrichit le corpus avec le champ `cours_eau` (liste des grands fleuves/rivières)
 * pour chaque commune, en utilisant :
 *   1. Nominatim OSM → ID de relation OSM pour chaque fleuve
 *   2. Overpass API  → géométrie des ways membres de la relation
 *   3. geo.api.gouv.fr/reverse → commune pour chaque point GPS (batch CSV)
 *
 * Usage: node scripts/enrich-cours-eau.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, '../data/villodoku_corpus.json');

const HEADERS = { 'User-Agent': 'villodoku-enrichment/1.0', 'Accept': '*/*' };

// Top 20 fleuves et rivières françaises (noms de recherche Nominatim)
const RIVERS = [
  'Loire',
  'Rhône',
  'Seine',
  'Garonne',
  'Rhin',
  'Moselle',
  'Meuse',
  'Saône',
  'Dordogne',
  'Lot',
  'Tarn',
  'Allier',
  'Cher',
  'Vienne',
  'Marne',
  'Oise',
  'Isère',
  'Doubs',
  'Charente',
  'Somme',
];

// Sous-échantillonnage : 1 point retenu tous les N nœuds
const SAMPLE_EVERY = 10;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Étape 1 : ID de relation OSM via Nominatim ───────────────────────────────

async function getOsmRelationId(riverName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(riverName + ' river')}&format=json&limit=5&countrycodes=fr`;
  const res = await fetch(url, { headers: { ...HEADERS, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const json = await res.json();
  // Cherche une relation de type "river" ou "waterway"
  const match = json.find(
    (r) => r.osm_type === 'relation' && (r.type === 'river' || r.type === 'waterway' || r.class === 'waterway')
  );
  return match ? match.osm_id : null;
}

// ── Étape 2 : géométrie via Overpass (relation → ways → geom) ────────────────

async function fetchRiverGeometry(relationId) {
  const query = `[out:json][timeout:90];relation(${relationId});way(r)[waterway];out geom qt;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith('{')) throw new Error(`Overpass non-JSON: ${text.slice(0, 80)}`);
  const json = JSON.parse(text);
  // Collecte tous les points de géométrie
  const pts = [];
  for (const el of json.elements) {
    if (el.geometry) {
      for (const pt of el.geometry) {
        pts.push({ lat: pt.lat, lon: pt.lon });
      }
    }
  }
  return pts;
}

// ── Étape 3 : reverse geocoding batch (api-adresse.data.gouv.fr) ─────────────

async function reverseGeocodeBatch(points) {
  const header = 'latitude,longitude';
  const rows = points.map((p) => `${p.lat},${p.lon}`);
  const csv = [header, ...rows].join('\n');

  const body = new FormData();
  body.append('data', new Blob([csv], { type: 'text/csv' }), 'points.csv');
  body.append('result_columns', 'result_citycode');

  const res = await fetch('https://api-adresse.data.gouv.fr/reverse/csv/', {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`api-adresse HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const text = await res.text();
  const lines = text.trim().split('\n');
  const colIdx = lines[0].split(',').indexOf('result_citycode');
  const codes = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const code = cols[colIdx]?.trim();
    if (code && code.length === 5) codes.add(code);
  }
  return codes;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw = fs.readFileSync(CORPUS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const communes = data.communes;
  const corpusCodes = new Set(communes.map((c) => c.code_commune));

  console.log(`Corpus: ${communes.length} communes`);
  console.log(`Fleuves à traiter: ${RIVERS.length}\n`);

  // commune_code → Set<string> des fleuves
  const communeRivers = new Map();

  for (const river of RIVERS) {
    const idx = RIVERS.indexOf(river) + 1;
    process.stdout.write(`[${idx}/${RIVERS.length}] ${river}…\n`);

    // 1. Trouver l'ID OSM de la relation
    let relationId;
    try {
      relationId = await getOsmRelationId(river);
      await sleep(1100); // Nominatim: 1 req/s
    } catch (err) {
      console.log(`  ✗ Nominatim: ${err.message}`);
      continue;
    }
    if (!relationId) {
      console.log(`  ✗ Relation OSM non trouvée`);
      continue;
    }
    process.stdout.write(`  OSM relation: ${relationId} → géométrie… `);

    // 2. Géométrie du fleuve via Overpass
    let pts;
    try {
      pts = await fetchRiverGeometry(relationId);
      await sleep(2000); // Overpass: respecter le rate limit
    } catch (err) {
      // Retry once
      process.stdout.write(`erreur (${err.message}), retry… `);
      await sleep(8000);
      try {
        pts = await fetchRiverGeometry(relationId);
        await sleep(2000);
      } catch (err2) {
        console.log(`✗ ${err2.message}`);
        continue;
      }
    }
    if (!pts || pts.length === 0) {
      console.log(`0 points — skip`);
      continue;
    }

    // Sous-échantillonnage
    const sampled = pts.filter((_, i) => i % SAMPLE_EVERY === 0);
    process.stdout.write(`${pts.length} pts → ${sampled.length} échantillons → geocoding… `);

    // 3. Reverse geocoding par batch de 5000
    const BATCH = 5000;
    const allCodes = new Set();
    for (let i = 0; i < sampled.length; i += BATCH) {
      const batch = sampled.slice(i, i + BATCH);
      try {
        const codes = await reverseGeocodeBatch(batch);
        for (const c of codes) allCodes.add(c);
      } catch (err) {
        console.log(`\n  ✗ reverse geocoding: ${err.message}`);
      }
      if (i + BATCH < sampled.length) await sleep(500);
    }

    // Filtrer aux communes du corpus
    const inCorpus = [...allCodes].filter((c) => corpusCodes.has(c));
    for (const code of inCorpus) {
      if (!communeRivers.has(code)) communeRivers.set(code, new Set());
      communeRivers.get(code).add(river);
    }

    console.log(`${inCorpus.length} communes du corpus`);
  }

  // ── Mise à jour du corpus ──────────────────────────────────────────────────
  console.log('\nMise à jour du corpus…');
  let updated = 0;
  for (const commune of communes) {
    const rivers = communeRivers.get(commune.code_commune);
    commune.cours_eau = rivers ? [...rivers].sort() : [];
    if (commune.cours_eau.length > 0) updated++;
  }

  // Stats
  console.log(`Communes avec ≥1 fleuve : ${updated}`);
  const riverCoverage = new Map();
  for (const commune of communes) {
    for (const r of commune.cours_eau) {
      riverCoverage.set(r, (riverCoverage.get(r) ?? 0) + 1);
    }
  }
  console.log('\nCouverture par fleuve :');
  [...riverCoverage.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, n]) => console.log(`  ${r.padEnd(12)} : ${n} communes`));

  // Exemples de communes avec plusieurs fleuves
  const multi = communes.filter((c) => c.cours_eau.length > 1).slice(0, 5);
  if (multi.length) {
    console.log('\nExemples confluences :');
    multi.forEach((c) => console.log(`  ${c.nom_commune} : ${c.cours_eau.join(', ')}`));
  }

  // Sauvegarde
  fs.writeFileSync(CORPUS_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✓ Corpus sauvegardé → ${CORPUS_PATH}`);
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
