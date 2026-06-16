"use client";

import { useEffect, useState } from "react";
import type { CellState } from "@/lib/game-storage";
import type { CriterionInfo } from "./VillodokuGrid";
import CityCard, { type SolutionCommune } from "./CityCard";
import { getRarityInfoFromRank } from "@/lib/rarity";

interface CellSolutions {
  count: number;
  communes: SolutionCommune[];
}

export default function SolutionsModal({
  date,
  rows,
  cols,
  playerCells,
  onClose,
}: {
  date: string;
  rows: CriterionInfo[];
  cols: CriterionInfo[];
  playerCells: CellState[][];
  onClose: () => void;
}) {
  const [cells, setCells] = useState<CellSolutions[][] | null>(null);
  const [selected, setSelected] = useState<SolutionCommune | null>(null);

  useEffect(() => {
    fetch(`/api/solutions?date=${date}`)
      .then((r) => r.json())
      .then((d) => setCells(d.cells));
  }, [date]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/50"
      onClick={onClose}
    >
      <div
        className="mt-12 flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <h2 className="font-display text-lg font-bold text-gray-800">Réponses possibles</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {!cells ? (
            <p className="py-12 text-center text-sm text-gray-400">Chargement…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((row, i) =>
                cols.map((col, j) => {
                  const cell = cells[i][j];
                  const playerCell = playerCells[i][j];
                  const playerCommune = playerCell.status === "correct" ? playerCell.commune : null;

                  return (
                    <div key={`${i}-${j}`} className="rounded-xl bg-white p-3 shadow-sm">
                      {/* Labels de la case */}
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                        {row.label}
                        <span className="mx-1 font-normal text-gray-400">×</span>
                        {col.label}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        {cell.count} ville{cell.count > 1 ? "s" : ""} valide{cell.count > 1 ? "s" : ""}
                        {cell.count > 20 ? " (20 affichées)" : ""}
                      </p>

                      {/* Liste unifiée triée par population — la réponse du joueur
                          est surlignée à sa position naturelle dans le classement. */}
                      {(() => {
                        const pc = playerCells[i][j];
                        // Construit la liste affichée : top 20 + insertion de la
                        // réponse du joueur si elle n'y figure pas déjà.
                        let list = [...cell.communes];
                        let playerInList = false;
                        if (playerCommune) {
                          playerInList = list.some(
                            (c) =>
                              c.nom_commune === playerCommune.nom_commune &&
                              c.departement_nom === playerCommune.departement_nom
                          );
                          if (!playerInList) {
                            // Insère à la bonne position selon la population
                            const insertIdx = list.findIndex(
                              (c) => c.population < playerCommune.population
                            );
                            const entry: SolutionCommune = {
                              nom_commune: playerCommune.nom_commune,
                              departement_nom: playerCommune.departement_nom,
                              region_nom: playerCommune.departement_nom,
                              population: playerCommune.population,
                              est_prefecture: false,
                              est_sous_prefecture: false,
                              est_drom: false,
                              est_montagne: false,
                              mer_bordee: null,
                              frontiere_terrestre: false,
                              cours_eau: [],
                              rank: pc.solutionRank,
                              solutionsCount: pc.solutionsCount,
                            };
                            if (insertIdx === -1) list.push(entry);
                            else list.splice(insertIdx, 0, entry);
                          }
                        }

                        return (
                          <div className="mt-2 max-h-52 overflow-y-auto flex flex-col gap-0.5 rounded-lg border border-gray-100">
                            {list.map((c) => {
                              const isPlayer =
                                !!playerCommune &&
                                c.nom_commune === playerCommune.nom_commune &&
                                c.departement_nom === playerCommune.departement_nom;
                              const rarity = getRarityInfoFromRank(
                                c.rank ?? 0,
                                c.solutionsCount ?? cell.count
                              );
                              return (
                                <button
                                  key={`${c.nom_commune}-${c.departement_nom}`}
                                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition first:rounded-t-lg last:rounded-b-lg ${
                                    isPlayer
                                      ? "bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                                      : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                                  }`}
                                  onClick={() => setSelected(c)}
                                >
                                  <span className="flex items-baseline gap-1.5 min-w-0">
                                    <span className="truncate">{c.nom_commune}</span>
                                    <span className={`shrink-0 text-[10px] ${isPlayer ? "text-emerald-600" : "text-gray-400"}`}>
                                      {c.population.toLocaleString("fr-FR")} hab.
                                    </span>
                                  </span>
                                  <span className={`ml-2 shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${rarity.badgeClass}`}>
                                    {rarity.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {selected && <CityCard commune={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
