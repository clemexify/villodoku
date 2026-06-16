/**
 * Complète l'enrichissement cours_eau pour les fleuves manquants.
 * Lit le corpus existant (préserve les données déjà ajoutées) et
 * ne traite que les fleuves non encore représentés.
 * Utilise des délais plus longs pour éviter le rate-limiting Overpass.
 *
 * Usage: node scripts/enrich-cours-eau-retry.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, '../data/villodoku_corpus.json');
const HEADERS = { 'User-Agent': 'villodoku-enrichment/1.0', 'Accept': '*/*' };

// IDs OSM déjà trouvés via Nominatim (évite de les re-chercher)
const RIVERS_WITH_IDS = [
  { name: 'Rhône',    osm_id: 1075117 },
  { name: 'Rhin',     osm_id: 8096487 },
  { name: 'Moselle',  osm_id: 390416  },
  { name: 'Saône',    osm_id: 1075434 },
  { name: 'Dordogne', osm_id: 68152   },
  { name: 'Lot',      osm_id: null     }, // à chercher
  { name: 'Tarn',     osm_id: 416433  },
  { name: 'Cher',     osm_id: 4491152 },
  { name: 'Doubs',    osm_id: 156145  },
  { name: 'Charente', osm_id: 961832  },
];

const SAMPLE_EVERY = 10;

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getOsmRelationId(riverName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(riverName + ' river France')}&format=json&limit=5&countrycodes=fr`;
  const res = await fetch(url, { headers: { ...HEADERS, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const json = await res.json();
  const match = json.find((r) => r.osm_type === 'relation' && (r.type === 'river' || r.type === 'waterway' || r.class === 'waterway'));
  return match?.osm_id ?? null;
}

async function fetchRiverGeometry(relationId) {
  const query = `[out:json][timeout:120];relation(${relationId});way(r)[waterway];out geom qt;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith('{')) throw new Error(`Non-JSON: ${text.slice(0, 80)}`);
  const json = JSON.parse(text);
  const pts = [];
  for (const el of json.elements) {
    if (el.geometry) for (const pt of el.geometry) pts.push({ lat: pt.lat, lon: pt.lon });
  }
  return pts;
}

async function reverseGeocodeBatch(points) {
  const csv = ['latitude,longitude', ...points.map((p) => `${p.lat},${p.lon}`)].join('\n');
  const body = new FormData();
  body.append('data', new Blob([csv], { type: 'text/csv' }), 'points.csv');
  body.append('result_columns', 'result_citycode');
  const res = await fetch('https://api-adresse.data.gouv.fr/reverse/csv/', { method: 'POST', body });
  if (!res.ok) throw new Error(`api-adresse HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const colIdx = lines[0].split(',').indexOf('result_citycode');
  const codes = new Set();
  for (let i = 1; i < lines.length; i++) {
    const code = lines[i].split(',')[colIdx]?.trim();
    if (code?.length === 5) codes.add(code);
  }
  return codes;
}

async function main() {
  const raw = fs.readFileSync(CORPUS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const communes = data.communes;
  const corpusCodes = new Set(communes.map((c) => c.code_commune));

  // Charge les données existantes
  const communeRivers = new Map();
  for (const commune of communes) {
    if (commune.cours_eau?.length > 0) {
      communeRivers.set(commune.code_commune, new Set(commune.cours_eau));
    }
  }
  const existingRivers = new Set(
    communes.flatMap((c) => c.cours_eau ?? [])
  );
  console.log(`Corpus: ${communes.length} communes`);
  console.log(`Fleuves déjà en base: ${[...existingRivers].join(', ')}\n`);

  for (const { name: river, osm_id: knownId } of RIVERS_WITH_IDS) {
    const idx = RIVERS_WITH_IDS.findIndex((r) => r.name === river) + 1;
    process.stdout.write(`[${idx}/${RIVERS_WITH_IDS.length}] ${river}… `);

    // Résoudre l'ID OSM si manquant
    let relationId = knownId;
    if (!relationId) {
      try {
        relationId = await getOsmRelationId(river);
        await sleep(1200);
        if (!relationId) { console.log('relation non trouvée'); continue; }
        console.log(`ID OSM: ${relationId}`);
        process.stdout.write(`  → géométrie… `);
      } catch (err) {
        console.log(`Nominatim: ${err.message}`);
        continue;
      }
    }

    // Géométrie via Overpass avec jusqu'à 3 tentatives
    let pts;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pts = await fetchRiverGeometry(relationId);
        break;
      } catch (err) {
        if (attempt < 3) {
          const wait = attempt * 12000;
          process.stdout.write(`erreur (${err.message}), attente ${wait/1000}s… `);
          await sleep(wait);
        } else {
          console.log(`✗ ${err.message} (3 tentatives)`);
          pts = null;
        }
      }
    }
    if (!pts || pts.length === 0) { pts && console.log('0 points'); continue; }

    const sampled = pts.filter((_, i) => i % SAMPLE_EVERY === 0);
    process.stdout.write(`${pts.length} pts → ${sampled.length} éch. → geocoding… `);

    // Reverse geocoding
    const allCodes = new Set();
    for (let i = 0; i < sampled.length; i += 5000) {
      const batch = sampled.slice(i, i + 5000);
      try {
        const codes = await reverseGeocodeBatch(batch);
        for (const c of codes) allCodes.add(c);
      } catch (err) {
        process.stdout.write(`\n  ✗ geocoding: ${err.message} `);
      }
      if (i + 5000 < sampled.length) await sleep(500);
    }

    const inCorpus = [...allCodes].filter((c) => corpusCodes.has(c));
    for (const code of inCorpus) {
      if (!communeRivers.has(code)) communeRivers.set(code, new Set());
      communeRivers.get(code).add(river);
    }
    console.log(`${inCorpus.length} communes du corpus`);

    // Pause généreuse entre fleuves pour éviter le rate-limiting
    await sleep(6000);
  }

  // Mise à jour du corpus
  let updated = 0;
  for (const commune of communes) {
    const rivers = communeRivers.get(commune.code_commune);
    commune.cours_eau = rivers ? [...rivers].sort() : [];
    if (commune.cours_eau.length > 0) updated++;
  }

  // Stats finales
  const riverCoverage = new Map();
  for (const commune of communes) {
    for (const r of commune.cours_eau) riverCoverage.set(r, (riverCoverage.get(r) ?? 0) + 1);
  }
  console.log(`\nTotal communes avec ≥1 fleuve : ${updated}`);
  console.log('Couverture par fleuve :');
  [...riverCoverage.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, n]) => console.log(`  ${r.padEnd(12)} : ${n} communes`));

  const confluences = communes.filter((c) => c.cours_eau.length >= 2).slice(0, 8);
  if (confluences.length) {
    console.log('\nConfluences (≥2 fleuves) :');
    confluences.forEach((c) => console.log(`  ${c.nom_commune} : ${c.cours_eau.join(', ')}`));
  }

  fs.writeFileSync(CORPUS_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✓ Corpus sauvegardé → ${CORPUS_PATH}`);
}

main().catch((err) => { console.error('Erreur fatale:', err); process.exit(1); });
