"use client";

import { MAX_ERRORS } from "@/lib/game-storage";

export default function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-bold text-emerald-700">Comment jouer ?</h2>

        <ul className="mt-4 space-y-3 text-sm text-gray-700">
          <li>
            🗺️ Chaque case de la grille correspond à un <strong>critère de ligne</strong> et un{" "}
            <strong>critère de colonne</strong> (ex : « Préfecture » × « Commence par la lettre B »).
          </li>
          <li>
            🏙️ Trouve une <strong>ville de France</strong> qui correspond aux deux critères à la fois.
          </li>
          <li>
            🔁 Chaque ville ne peut être utilisée <strong>qu&apos;une seule fois</strong> dans la grille.
          </li>
          <li>
            ⌨️ L&apos;<strong>autocomplétion</strong> t&apos;aide à saisir le nom sans faute de frappe.
          </li>
          <li>
            ❌ Tu as droit à <strong>{MAX_ERRORS} erreurs</strong> maximum avant la fin de la partie.
          </li>
          <li>
            📅 Une <strong>nouvelle grille</strong> est proposée chaque jour, la même pour tout le
            monde.
          </li>
          <li>
            🔥 Reviens jouer chaque jour pour faire grimper ta <strong>série</strong> !
          </li>
        </ul>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-emerald-600 py-2 font-display text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          C&apos;est compris, je joue !
        </button>
      </div>
    </div>
  );
}
