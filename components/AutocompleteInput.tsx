"use client";

import { useEffect, useRef, useState } from "react";
import type { CommuneOption } from "@/lib/communes-search";
import type { CellStatus } from "@/lib/game-storage";

interface AutocompleteInputProps {
  disabled?: boolean;
  status: CellStatus;
  value?: string;
  onSelect: (option: CommuneOption) => void;
}

export default function AutocompleteInput({ disabled, status, value, onSelect }: AutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CommuneOption[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "correct") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-800 text-sm font-medium p-1 text-center">
        {value}
      </div>
    );
  }

  function handleSelect(option: CommuneOption) {
    onSelect(option);
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  const visibleOptions = query.trim().length < 2 ? [] : options;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ville..."
        className={`w-full h-full p-1 text-sm text-center outline-none ${
          status === "incorrect" ? "bg-red-100" : ""
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
      />
      {open && visibleOptions.length > 0 && (
        <ul className="absolute z-10 left-0 top-full w-48 bg-white border border-gray-300 shadow-md max-h-48 overflow-auto text-sm">
          {visibleOptions.map((opt) => (
            <li
              key={opt.code_commune}
              className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-left"
              onClick={() => handleSelect(opt)}
            >
              {opt.nom_commune} <span className="text-gray-400">({opt.departement_nom})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
