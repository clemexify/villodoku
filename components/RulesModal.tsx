"use client";

import { useState } from "react";
import { MAX_ERRORS } from "@/lib/game-storage";

export default function RulesModal({ onClose }: { onClose: (dontShowAgain: boolean) => void }) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => onClose(dontShowAgain)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-bold text-indigo-700">Comment jouer ?</h2>

        <ul className="mt-4 space-y-3 text-sm text-gray-700">
          <li>
            Chaque case correspond à un <strong>critère de ligne</strong> et un{" "}
            <strong>critère de colonne</strong> (ex : « Préfecture » × « Commence par la lettre B »).
          </li>
          <li>
            Trouve une <strong>ville</strong>{" "}(une des <strong>5 500 communes françaises</strong> de plus de
            2 000 habitants) qui correspond aux deux critères, en t&apos;aidant de l&apos;autocomplétion.
            Chaque ville ne peut être utilisée <strong>qu&apos;une seule fois</strong>.
          </li>
          <li>
            Le <strong>score final</strong> dépend de ta capacité à trouver les villes les{" "}
            <strong>moins peuplées</strong> parmi les solutions possibles : plus la ville est petite, plus
            elle rapporte de points.
          </li>
          <li>
            Tu as droit à <strong>{MAX_ERRORS} erreurs</strong> maximum avant la fin de la partie.
          </li>
          <li>
            Une <strong>nouvelle grille</strong> est proposée chaque jour, la même pour tout le monde :
            reviens chaque jour pour faire grimper ta <strong>série</strong> !
          </li>
        </ul>

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Ne plus afficher ce message
        </label>

        <button
          onClick={() => onClose(dontShowAgain)}
          className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-display text-base font-semibold text-white transition hover:bg-indigo-700"
        >
          C&apos;est compris, je joue !
        </button>
      </div>
    </div>
  );
}
