"use client";

import { useEffect, useRef, useState } from "react";
import type { CommuneOption } from "@/lib/communes-search";

export default function CellModal({
  rowLabel,
  colLabel,
  solutionsCount,
  onSelect,
  onClose,
}: {
  rowLabel: string;
  colLabel: string;
  solutionsCount: number;
  onSelect: (option: CommuneOption) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CommuneOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/communes/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { results: CommuneOption[] }) => setOptions(data.results ?? []))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  async function handleOptionClick(opt: CommuneOption) {
    if (loading) return;
    setLoading(true);
    try {
      await onSelect(opt);
      // Le parent ferme le modal (valide ou invalide)
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 sm:items-center sm:pt-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight text-indigo-800">
            {rowLabel} <span className="text-gray-400">×</span> {colLabel}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500">
          {solutionsCount} solution{solutionsCount === 1 ? "" : "s"} possible{solutionsCount === 1 ? "" : "s"}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tape le nom d'une ville..."
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 disabled:opacity-50"
        />

        <ul className="mt-2 max-h-64 overflow-auto">
          {options.map((opt) => (
            <li key={opt.code_commune}>
              <button
                type="button"
                disabled={loading}
                onMouseDown={(e) => { e.preventDefault(); handleOptionClick(opt); }}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-indigo-50 disabled:opacity-50"
              >
                {opt.nom_commune}
              </button>
            </li>
          ))}
          {query.trim().length >= 3 && options.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Aucun résultat</li>
          )}
        </ul>
      </div>
    </div>
  );
}
