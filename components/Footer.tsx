"use client";

import Link from "next/link";

export default function Footer({ onShowRules }: { onShowRules: () => void }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 px-4 py-6 text-sm text-gray-500">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <button onClick={onShowRules} className="underline hover:text-emerald-700">
            Règles du jeu
          </button>
          <Link href="/mentions-legales" className="underline hover:text-emerald-700">
            Mentions légales
          </Link>
          <a
            href="https://ko-fi.com/villodoku"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5E5B] px-3 py-1 font-semibold text-white transition hover:opacity-90"
          >
            <span aria-hidden>☕</span> Soutenir sur Ko-fi
          </a>
        </div>

        <p className="text-xs text-gray-400">
          © {year} Villodoku — Données communales issues du COG INSEE via{" "}
          <a
            href="https://github.com/etalab/decoupage-administratif"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-700"
          >
            @etalab/decoupage-administratif
          </a>
          . Jeu non affilié à l&apos;INSEE ni à aucune collectivité.
        </p>
      </div>
    </footer>
  );
}
