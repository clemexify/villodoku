"use client";

import { getRarityInfo, getRarityInfoFromRank } from "@/lib/rarity";

export interface SolutionCommune {
  nom_commune: string;
  departement_nom: string;
  region_nom: string;
  population: number;
  est_prefecture: boolean;
  est_sous_prefecture: boolean;
  est_drom: boolean;
  est_montagne: boolean;
  mer_bordee: string | null;
  frontiere_terrestre: boolean;
  cours_eau: string[];
  /** Rang dans les solutions de la case (0 = plus peuplée). Absent si inconnu. */
  rank?: number;
  solutionsCount?: number;
}

function getTraits(c: SolutionCommune): string[] {
  const traits: string[] = [];
  if (c.est_prefecture) traits.push("Préfecture de département");
  if (c.est_sous_prefecture) traits.push("Sous-préfecture");
  if (c.est_drom) traits.push("Commune d'outre-mer");
  if (c.est_montagne) traits.push("Ville de montagne");
  if (c.mer_bordee) traits.push(`Bordée par la ${c.mer_bordee === "Atlantique" ? "l'océan Atlantique" : `mer ${c.mer_bordee}`}`);
  if (c.frontiere_terrestre) traits.push("Frontière terrestre avec un pays étranger");
  for (const r of c.cours_eau) traits.push(`Traversée par : ${r}`);
  return traits;
}

export default function CityCard({
  commune,
  onClose,
}: {
  commune: SolutionCommune;
  onClose: () => void;
}) {
  const rarity =
    commune.rank !== undefined && commune.solutionsCount !== undefined
      ? getRarityInfoFromRank(commune.rank, commune.solutionsCount)
      : getRarityInfo(commune.population);
  const traits = getTraits(commune);
  const wikiUrl = `https://fr.wikipedia.org/wiki/${encodeURIComponent(commune.nom_commune)}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">{commune.nom_commune}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {commune.departement_nom} · {commune.region_nom}
            </p>
          </div>
          <span className={`mt-1 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${rarity.badgeClass}`}>
            {rarity.label}
          </span>
        </div>

        {/* Population */}
        <p className="mt-3 text-sm text-gray-600">
          <span className="font-semibold">{commune.population.toLocaleString("fr-FR")}</span> habitants
        </p>

        {/* Caractéristiques */}
        {traits.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Caractéristiques
            </p>
            <div className="flex flex-wrap gap-1.5">
              {traits.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg border border-indigo-200 py-2 text-center text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Voir sur Wikipédia →
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
