"use client";

import { formatLongDate } from "@/lib/date-format";
import { getScoreRank } from "@/lib/rarity";
import type { CellState } from "@/lib/game-storage";


function buildWhatsAppText(won: boolean, score: number, errors: number, cells: CellState[][], date: string): string {
  const dateLabel = formatLongDate(date);
  const rank = getScoreRank(score);
  const solvedCount = cells.flat().filter((c) => c.status === "correct").length;
  const result = won ? "Grille complétée !" : `${solvedCount}/9 cases résolues`;
  const errLine = errors === 0 ? "Sans erreur" : `${errors} erreur${errors > 1 ? "s" : ""}`;
  const grid = cells.map((row) => row.map((c) => (c.status === "correct" ? "🟩" : "⬛")).join("")).join("\n");

  return [
    `Villodoku — ${dateLabel}`,
    `${result} | Score : ${score}/100 (${rank}) | ${errLine}`,
    "",
    grid,
    "",
    "villodoku.fr",
  ].join("\n");
}

export default function EndGameCard({
  won,
  score,
  errors,
  cells,
  date,
  onShowSolutions,
  onShare,
}: {
  won: boolean;
  score: number;
  errors: number;
  cells: CellState[][];
  date: string;
  onShowSolutions: () => void;
  onShare: () => void;
}) {
  const rank = getScoreRank(score);
  const solvedCount = cells.flat().filter((c) => c.status === "correct").length;

  function handleWhatsApp() {
    const text = buildWhatsAppText(won, score, errors, cells, date);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    onShare();
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-5 shadow-lg">
      {/* Titre */}
      <div className="mb-4 text-center">
        {won ? (
          <>
            <p className="text-2xl font-bold text-emerald-600">Bravo !</p>
            <p className="text-sm text-gray-500">Grille complétée</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-rose-500">Partie terminée</p>
            <p className="text-sm text-gray-500">{solvedCount}/9 cases résolues</p>
          </>
        )}
      </div>

      {/* Score + rang */}
      <div className="mb-4 flex items-center justify-center gap-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-indigo-600">{score}</span>
          <span className="text-lg text-gray-400">/100</span>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
          {rank}
        </div>
        <div className="text-center text-sm text-gray-500">
          {errors} erreur{errors !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Grille emoji */}
      <div className="mb-5 flex justify-center">
        <div className="grid grid-cols-3 gap-1.5">
          {cells.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center ${
                  cell.status === "correct" ? "bg-emerald-100" : "bg-gray-100"
                }`}
              >
                {cell.status === "correct" ? "🟩" : "⬛"}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Partager sur WhatsApp
        </button>
        <button
          onClick={onShowSolutions}
          className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Voir les réponses possibles →
        </button>
      </div>
    </div>
  );
}
