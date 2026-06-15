"use client";

import { Fragment, useEffect, useState } from "react";
import CellModal from "./CellModal";
import type { CommuneOption } from "@/lib/communes-search";
import {
  MAX_ERRORS,
  gameStorageKey,
  type CellState,
  type SavedGameState,
} from "@/lib/game-storage";
import { cellScore, getRarityInfo } from "@/lib/rarity";
import ScoreGauge from "./ScoreGauge";

export interface CriterionInfo {
  id: string;
  label: string;
}

function emptyCells(): CellState[][] {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ status: "empty" as const })));
}

/** Réduit la police du nom de la ville si elle est longue, pour ne pas déformer la case. */
function nameSizeClass(name: string): string {
  if (name.length > 16) return "text-[9px] sm:text-[11px]";
  if (name.length > 11) return "text-[10px] sm:text-xs";
  return "text-xs sm:text-sm";
}

export default function VillodokuGrid({
  date,
  rows,
  cols,
  solutionsCounts,
  maxRarityTiers,
  onStateChange,
  onErrorsChange,
  onGameEnd,
}: {
  date: string;
  rows: CriterionInfo[];
  cols: CriterionInfo[];
  solutionsCounts: number[][];
  maxRarityTiers: number[][];
  onStateChange?: () => void;
  onErrorsChange?: (errors: number) => void;
  onGameEnd?: (date: string) => void;
}) {
  const storageKey = gameStorageKey(date);
  const [cells, setCells] = useState<CellState[][]>(emptyCells);
  const [errors, setErrors] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  // Charge la partie sauvegardée pour cette date
  useEffect(() => {
    setCells(emptyCells());
    setErrors(0);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as SavedGameState;
        if (saved.cells) setCells(saved.cells);
        if (typeof saved.errors === "number") setErrors(saved.errors);
      }
    } catch {
      // ignore les états sauvegardés corrompus
    }
    setLoaded(true);
  }, [storageKey]);

  // Sauvegarde la partie à chaque changement
  useEffect(() => {
    if (!loaded) return;
    const state: SavedGameState = { cells, errors };
    localStorage.setItem(storageKey, JSON.stringify(state));
    onStateChange?.();
  }, [cells, errors, loaded, storageKey, onStateChange]);

  // Remonte le nombre d'erreurs au parent (affiché en haut de la grille)
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const gameOver = errors >= MAX_ERRORS;
  const solvedCount = cells.flat().filter((c) => c.status === "correct").length;
  const won = solvedCount === 9;
  const locked = gameOver || won;

  const score = Math.round(
    cells.flat().reduce((sum, cell, idx) => {
      if (cell.status !== "correct" || !cell.commune) return sum;
      const tier = getRarityInfo(cell.commune.population).tier;
      return sum + cellScore(tier, maxRarityTiers[Math.floor(idx / 3)][idx % 3]);
    }, 0),
  );

  // Signale la fin de partie (gagnée ou perdue) pour le streak
  useEffect(() => {
    if (!loaded) return;
    if (won || gameOver) onGameEnd?.(date);
  }, [won, gameOver, loaded, date, onGameEnd]);

  async function handleSelect(row: number, col: number, option: CommuneOption) {
    if (locked || cells[row][col].status === "correct") return;

    const usedCodes = cells
      .flat()
      .filter((c) => c.status === "correct" && c.commune)
      .map((c) => c.commune!.code_commune);

    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, row, col, codeCommune: option.code_commune, usedCodes }),
    });
    const data = await res.json();

    if (data.valid) {
      setCells((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        next[row][col] = { status: "correct", commune: data.commune };
        return next;
      });
      setActiveCell(null);
      return;
    }

    setErrors((e) => e + 1);
    setActiveCell(null);
    setCells((prev) => {
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      next[row][col] = { status: "incorrect" };
      return next;
    });
    setTimeout(() => {
      setCells((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        if (next[row][col].status === "incorrect") next[row][col] = { status: "empty" };
        return next;
      });
    }, 800);
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 px-4">
      <div className="grid w-full max-w-xl grid-cols-4 gap-2 sm:gap-3">
        <div />
        {cols.map((c) => (
          <div
            key={c.id}
            className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-2 text-center text-[11px] font-bold leading-tight text-indigo-700 sm:p-3 sm:text-sm"
          >
            {c.label}
          </div>
        ))}
        {rows.map((r, i) => (
          <Fragment key={r.id}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-2 text-center text-[11px] font-bold leading-tight text-indigo-700 sm:p-3 sm:text-sm">
              {r.label}
            </div>
            {cols.map((c, j) => {
              const cell = cells[i][j];
              const cellLocked = locked || cell.status === "correct";
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={cellLocked}
                  onClick={() => setActiveCell({ row: i, col: j })}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-1 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm ${
                    cell.status === "correct"
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : cell.status === "incorrect"
                        ? "border-rose-200 bg-rose-50 text-rose-500"
                        : cellLocked
                          ? "border-gray-100 bg-gray-50 text-gray-300"
                          : "border-gray-200 bg-white text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {cell.status === "correct" ? (
                    <>
                      <span className={nameSizeClass(cell.commune?.nom_commune ?? "")}>
                        {cell.commune?.nom_commune}
                      </span>
                      {cell.commune && (
                        <span
                          className={`whitespace-nowrap rounded-full px-1 py-0.5 text-[8px] font-semibold sm:text-[10px] ${getRarityInfo(cell.commune.population).badgeClass}`}
                        >
                          {getRarityInfo(cell.commune.population).label}
                        </span>
                      )}
                    </>
                  ) : cell.status === "incorrect" ? (
                    "✕"
                  ) : (
                    <span aria-hidden className="text-2xl font-light text-gray-300 sm:text-3xl">
                      +
                    </span>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <ScoreGauge score={score} />
      {gameOver && <p className="text-red-600 font-semibold">Partie terminée ({MAX_ERRORS} erreurs)</p>}
      {won && <p className="text-green-600 font-semibold">Bravo, grille complétée !</p>}

      {activeCell && (
        <CellModal
          rowLabel={rows[activeCell.row].label}
          colLabel={cols[activeCell.col].label}
          solutionsCount={solutionsCounts[activeCell.row][activeCell.col]}
          onSelect={(opt) => handleSelect(activeCell.row, activeCell.col, opt)}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}
