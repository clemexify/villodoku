"use client";

import { useEffect, useState } from "react";
import AutocompleteInput from "./AutocompleteInput";
import type { CommuneOption } from "@/lib/communes-search";
import {
  MAX_ERRORS,
  gameStorageKey,
  type CellState,
  type SavedGameState,
} from "@/lib/game-storage";

export interface CriterionInfo {
  id: string;
  label: string;
}

function emptyCells(): CellState[][] {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ status: "empty" as const })));
}

export default function VillodokuGrid({
  date,
  rows,
  cols,
  onStateChange,
  onGameEnd,
}: {
  date: string;
  rows: CriterionInfo[];
  cols: CriterionInfo[];
  onStateChange?: () => void;
  onGameEnd?: (date: string) => void;
}) {
  const storageKey = gameStorageKey(date);
  const [cells, setCells] = useState<CellState[][]>(emptyCells);
  const [errors, setErrors] = useState(0);
  const [loaded, setLoaded] = useState(false);

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

  const gameOver = errors >= MAX_ERRORS;
  const solvedCount = cells.flat().filter((c) => c.status === "correct").length;
  const won = solvedCount === 9;
  const locked = gameOver || won;

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
      return;
    }

    setErrors((e) => e + 1);
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
    <div className="flex flex-col items-center gap-4">
      <table className="border-collapse">
        <tbody>
          <tr>
            <td className="w-28 h-20" />
            {cols.map((c) => (
              <td key={c.id} className="border border-gray-300 p-2 text-center text-xs font-medium bg-gray-50 w-28">
                {c.label}
              </td>
            ))}
          </tr>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="border border-gray-300 p-2 text-center text-xs font-medium bg-gray-50 w-28">
                {r.label}
              </td>
              {cols.map((c, j) => (
                <td key={c.id} className="border border-gray-300 w-28 h-20 p-0">
                  <AutocompleteInput
                    disabled={locked}
                    status={cells[i][j].status}
                    value={cells[i][j].commune?.nom_commune}
                    onSelect={(opt) => handleSelect(i, j, opt)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-sm">
        Erreurs : {errors} / {MAX_ERRORS} — Trouvées : {solvedCount} / 9
      </div>
      {gameOver && <p className="text-red-600 font-semibold">Partie terminée ({MAX_ERRORS} erreurs)</p>}
      {won && <p className="text-green-600 font-semibold">Bravo, grille complétée !</p>}
    </div>
  );
}
