"use client";

import { useEffect, useState, useCallback } from "react";
import type { GridCandidate } from "@/lib/daily-grid";

type ScheduledGrid = {
  rows: { id: string; label: string; category: string }[];
  cols: { id: string; label: string; category: string }[];
  approved_at: string;
};

type DayInfo = { date: string; label: string };

type DayState = {
  candidate: GridCandidate | null;
  seedOffset: number;
  loading: boolean;
  error: string | null;
  approved: boolean;
};

type CriterionMeta = { id: string; label: string; category: string; lastUsed?: string | null };
type CriteriaCategory = { name: string; criteria: CriterionMeta[] };

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function lastUsedLabel(lastUsedDate: string | null): { text: string; color: string } {
  if (!lastUsedDate) return { text: "jamais utilisé", color: "text-emerald-600" };
  const days = Math.abs(daysBetween(lastUsedDate, new Date().toISOString().slice(0, 10)));
  if (days <= 7)  return { text: `utilisé il y a ${days}j`, color: "text-rose-600" };
  if (days <= 14) return { text: `utilisé il y a ${days}j`, color: "text-amber-600" };
  return { text: `utilisé il y a ${days}j`, color: "text-gray-400" };
}

export default function CurateClient({
  pastDays,
  futureDays,
  scheduled,
  coveredCount,
}: {
  pastDays: DayInfo[];
  futureDays: DayInfo[];
  scheduled: Record<string, ScheduledGrid>;
  coveredCount: number;
}) {
  const [states, setStates] = useState<Record<string, DayState>>({});
  const [removedDates, setRemovedDates] = useState<Set<string>>(new Set());
  const [builderDate, setBuilderDate] = useState<string | null>(null);
  const [criteriaCategories, setCriteriaCategories] = useState<CriteriaCategory[]>([]);

  const fetchCandidate = useCallback(async (date: string, seedOffset: number) => {
    setStates((prev) => ({
      ...prev,
      [date]: { ...prev[date], loading: true, error: null, seedOffset },
    }));
    try {
      const res = await fetch(`/api/curate/candidates?date=${date}&seed=${seedOffset}`);
      if (!res.ok) throw new Error(await res.text());
      const candidate: GridCandidate = await res.json();
      setStates((prev) => ({
        ...prev,
        [date]: { candidate, seedOffset, loading: false, error: null, approved: false },
      }));
    } catch (e) {
      setStates((prev) => ({
        ...prev,
        [date]: { ...prev[date], loading: false, error: String(e) },
      }));
    }
  }, []);

  useEffect(() => {
    for (const { date } of futureDays) {
      if (!scheduled[date]) fetchCandidate(date, 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openBuilder = useCallback(async (date: string) => {
    setBuilderDate(date);
    if (criteriaCategories.length === 0) {
      const res = await fetch("/api/curate/criteria");
      if (res.ok) {
        const data = await res.json();
        setCriteriaCategories(data.categories);
      }
    }
  }, [criteriaCategories.length]);

  async function handleApprove(date: string, candidate: GridCandidate) {
    const res = await fetch("/api/curate/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, rows: candidate.rows, cols: candidate.cols }),
    });
    if (res.ok) {
      setStates((prev) => ({ ...prev, [date]: { ...prev[date], approved: true } }));
      setBuilderDate(null);
    }
  }

  async function handleRemove(date: string) {
    const res = await fetch("/api/curate/approve", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      setRemovedDates((prev) => new Set(prev).add(date));
      fetchCandidate(date, 0);
    }
  }

  const liveCount = coveredCount
    - [...removedDates].filter((d) => scheduled[d]).length
    + futureDays.filter(({ date }) => !scheduled[date] && states[date]?.approved).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-indigo-600">Villo</span>doku — Préparation des grilles
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {liveCount}/{futureDays.length} jours à venir couverts
          </p>
        </div>

        {/* Bandeau futur */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {futureDays.map(({ date, label }) => {
            const isCovered = (scheduled[date] && !removedDates.has(date)) || states[date]?.approved;
            const [weekday, day] = label.split(" ");
            return (
              <div key={date} className="flex flex-col items-center gap-0.5 shrink-0">
                <div className={`h-2.5 w-2.5 rounded-full ${isCovered ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="text-[9px] text-gray-400 leading-none">{weekday}</span>
                <span className="text-[9px] font-semibold text-gray-500 leading-none">{day}</span>
              </div>
            );
          })}
        </div>

        {/* Dernières grilles utilisées — mini format */}
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            Grilles récentes
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...pastDays].reverse().slice(0, 10).map(({ date, label }) => {
              const g = scheduled[date];
              if (!g) return null;
              return (
                <div key={date} className="shrink-0">
                  <p className="mb-1 text-center text-[9px] text-gray-400 capitalize">{label}</p>
                  <MiniGrid rows={g.rows} cols={g.cols} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section : jours futurs à valider ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">À valider</h2>
          {futureDays.map(({ date, label }) => {
            const isScheduled = scheduled[date] && !removedDates.has(date);
            const s = states[date];
            const approvedOptimistic = s?.approved;
            const isBuilding = builderDate === date;

            if (isScheduled && !approvedOptimistic) {
              const g = scheduled[date];
              return (
                <div key={date} className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">✓ Validée</span>
                      <h3 className="mt-0.5 font-semibold text-gray-800 capitalize">{label}</h3>
                    </div>
                    <button onClick={() => handleRemove(date)} className="text-xs text-gray-400 hover:text-rose-500 transition">
                      Retirer
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...g.rows, ...g.cols].map((c) => (
                      <span key={c.id} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{c.label}</span>
                    ))}
                  </div>
                </div>
              );
            }

            if (approvedOptimistic) {
              return (
                <div key={date} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">✓ Validée à l'instant</span>
                  <h3 className="mt-0.5 font-semibold text-gray-800 capitalize">{label}</h3>
                </div>
              );
            }

            return (
              <div key={date} className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm space-y-3">
                {/* En-tête jour */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-rose-500">À valider</span>
                    <h3 className="mt-0.5 font-semibold text-gray-800 capitalize">{label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isBuilding && (
                      <button
                        onClick={() => openBuilder(date)}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        Construire manuellement
                      </button>
                    )}
                    {isBuilding && (
                      <button
                        onClick={() => setBuilderDate(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        ← Retour auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode auto */}
                {!isBuilding && (
                  <>
                    <div className="flex items-center justify-end gap-2">
                      {s?.loading && <span className="text-xs text-gray-400">Génération…</span>}
                      {!s?.loading && s?.candidate && (
                        <>
                          <button
                            onClick={() => fetchCandidate(date, (s.seedOffset ?? 0) + 1)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Autre proposition
                          </button>
                          <button
                            onClick={() => handleApprove(date, s.candidate!)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            Valider
                          </button>
                        </>
                      )}
                    </div>
                    {s?.error && <p className="text-xs text-rose-500">{s.error}</p>}
                    {s?.candidate && <CandidateGrid candidate={s.candidate} />}
                  </>
                )}

                {/* Mode builder */}
                {isBuilding && (
                  <BuilderPanel
                    categories={criteriaCategories}
                    onApprove={(candidate) => handleApprove(date, candidate)}
                  />
                )}
              </div>
            );
          })}
        </section>

        {/* ── Section : historique passé (lecture seule) ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Historique</h2>
          {[...pastDays].reverse().map(({ date, label }) => {
            const g = scheduled[date];
            return (
              <div key={date} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <span className="text-xs text-gray-400 capitalize">{label}</span>
                {g ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.rows.map((r) => (
                      <span key={r.id} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{r.label}</span>
                    ))}
                    <span className="self-center text-xs text-gray-300">×</span>
                    {g.cols.map((c) => (
                      <span key={c.id} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{c.label}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-300">Grille non enregistrée</p>
                )}
              </div>
            );
          })}
        </section>

      </div>
    </div>
  );
}

// ── MiniGrid ──────────────────────────────────────────────────────────────────

function MiniGrid({ rows, cols }: { rows: CriterionMeta[]; cols: CriterionMeta[] }) {
  return (
    <div className="grid grid-cols-4 gap-px w-[168px]">
      <div className="h-10 w-10 rounded-tl-lg bg-gray-50" />
      {cols.map((c) => (
        <div key={c.id} className="flex h-10 w-10 items-center justify-center rounded-t-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-0.5">
          <span className="text-center text-[7px] font-semibold leading-tight text-indigo-700 line-clamp-3">{c.label}</span>
        </div>
      ))}
      {rows.map((r) => (
        <>
          <div key={r.id} className="flex h-10 w-10 items-center justify-center rounded-l-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-0.5">
            <span className="text-center text-[7px] font-semibold leading-tight text-indigo-700 line-clamp-3">{r.label}</span>
          </div>
          {cols.map((c) => (
            <div key={c.id} className="h-10 w-10 rounded-lg border border-gray-100 bg-white" />
          ))}
        </>
      ))}
    </div>
  );
}

// ── CandidateGrid ─────────────────────────────────────────────────────────────

function CandidateGrid({ candidate }: { candidate: GridCandidate }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 self-center">Lignes :</span>
        {candidate.rows.map((r) => (
          <span key={r.id} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{r.label}</span>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">Cols :</span>
        {candidate.cols.map((c) => (
          <span key={c.id} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">{c.label}</span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-24" />
              {candidate.cols.map((c) => (
                <th key={c.id} className="p-1 text-center font-semibold text-violet-700 bg-violet-50 border border-gray-100">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidate.rows.map((row, r) => (
              <tr key={row.id}>
                <td className="p-1 font-semibold text-indigo-700 bg-indigo-50 text-right pr-2 border border-gray-100">
                  {row.label}
                </td>
                {candidate.cells[r].map((cell, c) => {
                  const lu = lastUsedLabel(cell.lastUsedDate);
                  return (
                    <td key={c} className="p-1.5 border border-gray-100 align-top">
                      <div className="max-h-32 overflow-y-auto space-y-0.5 pr-0.5">
                        {cell.solutions.map((city) => (
                          <div key={city.name} className="text-gray-700">{city.name}</div>
                        ))}
                      </div>
                      <div className={`mt-1 text-[10px] ${lu.color}`}>{lu.text}</div>
                      <div className="text-[10px] text-gray-300">{cell.totalSolutions} solution{cell.totalSolutions > 1 ? "s" : ""}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── BuilderPanel ──────────────────────────────────────────────────────────────

function BuilderPanel({
  categories,
  onApprove,
}: {
  categories: CriteriaCategory[];
  onApprove: (candidate: GridCandidate) => void;
}) {
  const [rowIds, setRowIds] = useState<string[]>([]);
  const [colIds, setColIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<GridCandidate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedIds = new Set([...rowIds, ...colIds]);

  function toggle(id: string, target: "row" | "col") {
    if (target === "row") {
      if (rowIds.includes(id)) {
        setRowIds(rowIds.filter((x) => x !== id));
        setPreview(null);
      } else if (rowIds.length < 3) {
        setRowIds([...rowIds, id]);
      }
    } else {
      if (colIds.includes(id)) {
        setColIds(colIds.filter((x) => x !== id));
        setPreview(null);
      } else if (colIds.length < 3) {
        setColIds([...colIds, id]);
      }
    }
  }

  function remove(id: string) {
    setRowIds(rowIds.filter((x) => x !== id));
    setColIds(colIds.filter((x) => x !== id));
    setPreview(null);
  }

  const canPreview = rowIds.length === 3 && colIds.length === 3;

  async function fetchPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/curate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds, colIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPreview(await res.json());
    } catch (e) {
      setPreviewError(String(e));
    } finally {
      setPreviewLoading(false);
    }
  }

  if (categories.length === 0) {
    return <p className="text-xs text-gray-400">Chargement des critères…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Sélection lignes / colonnes */}
      <div className="grid grid-cols-2 gap-3">
        <SlotPicker
          label="Lignes"
          color="indigo"
          ids={rowIds}
          categories={categories}
          selectedIds={selectedIds}
          onAdd={(id) => toggle(id, "row")}
          onRemove={remove}
          max={3}
        />
        <SlotPicker
          label="Colonnes"
          color="violet"
          ids={colIds}
          categories={categories}
          selectedIds={selectedIds}
          onAdd={(id) => toggle(id, "col")}
          onRemove={remove}
          max={3}
        />
      </div>

      {/* Bouton prévisualiser */}
      <div className="flex items-center gap-3">
        <button
          onClick={fetchPreview}
          disabled={!canPreview || previewLoading}
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {previewLoading ? "Calcul…" : "Prévisualiser"}
        </button>
        {!canPreview && (
          <span className="text-xs text-gray-400">
            {3 - rowIds.length} ligne{3 - rowIds.length > 1 ? "s" : ""} et {3 - colIds.length} colonne{3 - colIds.length > 1 ? "s" : ""} manquante{3 - rowIds.length + 3 - colIds.length > 1 ? "s" : ""}
          </span>
        )}
        {previewError && <span className="text-xs text-rose-500">{previewError}</span>}
      </div>

      {/* Aperçu */}
      {preview && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
          <CandidateGrid candidate={preview} />
          <button
            onClick={() => onApprove(preview)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            Valider cette grille
          </button>
        </div>
      )}
    </div>
  );
}

// ── SlotPicker ────────────────────────────────────────────────────────────────

function formatLastUsed(date: string | null | undefined): string {
  if (!date) return "jamais";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function SlotPicker({
  label,
  color,
  ids,
  categories,
  selectedIds,
  onAdd,
  onRemove,
  max,
}: {
  label: string;
  color: "indigo" | "violet";
  ids: string[];
  categories: CriteriaCategory[];
  selectedIds: Set<string>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  max: number;
}) {
  const allCriteria = categories.flatMap((c) => c.criteria);

  const colorMap = {
    indigo: {
      badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
      header: "text-indigo-700",
      select: "focus:border-indigo-300",
    },
    violet: {
      badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
      header: "text-violet-700",
      select: "focus:border-violet-300",
    },
  }[color];

  return (
    <div className="flex flex-col gap-2">
      <div className={`text-xs font-bold uppercase tracking-wide ${colorMap.header}`}>
        {label} ({ids.length}/{max})
      </div>

      {/* Slots sélectionnés */}
      <div className="flex flex-col gap-1 min-h-[68px]">
        {ids.map((id) => {
          const c = allCriteria.find((x) => x.id === id);
          return (
            <div key={id} className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${colorMap.badge}`}>
              <span className="truncate mr-1">{c?.label ?? id}</span>
              <button
                onClick={() => onRemove(id)}
                className="shrink-0 text-gray-400 hover:text-rose-500"
                aria-label="Retirer"
              >
                ×
              </button>
            </div>
          );
        })}
        {ids.length < max && (
          <div className="rounded-lg border border-dashed border-gray-200 px-2 py-1">
            <span className="text-[10px] text-gray-300">slot vide</span>
          </div>
        )}
      </div>

      {/* Menu déroulant */}
      {ids.length < max && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
            e.currentTarget.value = "";
          }}
          className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none ${colorMap.select}`}
        >
          <option value="">Ajouter un critère…</option>
          {categories.map((cat) => {
            const available = cat.criteria.filter((c) => !selectedIds.has(c.id));
            if (available.length === 0) return null;
            return (
              <optgroup key={cat.name} label={cat.name}>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({formatLastUsed(c.lastUsed)})
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      )}
    </div>
  );
}
