import { loadCommunes } from "./corpus";
import type { Commune } from "./grid-engine";

export interface CommuneOption {
  code_commune: string;
  nom_commune: string;
  departement_nom: string;
  population: number;
}

/** Minuscules, sans accents, tirets/apostrophes traités comme des espaces. */
const DIACRITICS_RE = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[-'\s]+/g, " ")
    .trim();
}

/**
 * Recherche de communes par nom (préfixe prioritaire, puis sous-chaîne),
 * triée par population décroissante. Pensée pour l'autocomplétion :
 * ne renvoie que des infos publiques (nom, département, population),
 * jamais d'information sur la validité d'une réponse pour une case.
 */
export function searchCommunes(query: string, limit = 10): CommuneOption[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const starts: Commune[] = [];
  const includes: Commune[] = [];

  for (const c of loadCommunes()) {
    const name = normalize(c.nom_commune);
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q)) includes.push(c);
  }

  const byPopulationDesc = (a: Commune, b: Commune) => b.population - a.population;
  starts.sort(byPopulationDesc);
  includes.sort(byPopulationDesc);

  return [...starts, ...includes].slice(0, limit).map((c) => ({
    code_commune: c.code_commune,
    nom_commune: c.nom_commune,
    departement_nom: c.departement_nom,
    population: c.population,
  }));
}
