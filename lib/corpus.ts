import { readFileSync } from "node:fs";
import path from "node:path";
import type { Commune } from "./grid-engine";

let cachedCommunes: Commune[] | null = null;

/** Charge (et met en cache) le corpus de communes depuis data/villodoku_corpus.json. */
export function loadCommunes(): Commune[] {
  if (!cachedCommunes) {
    const corpusPath = path.join(process.cwd(), "data", "villodoku_corpus.json");
    const raw = JSON.parse(readFileSync(corpusPath, "utf-8")) as { communes: Commune[] };
    cachedCommunes = raw.communes;
  }
  return cachedCommunes;
}
