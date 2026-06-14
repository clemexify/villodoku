"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import RulesModal from "./RulesModal";
import VillodokuGrid, { type CriterionInfo } from "./VillodokuGrid";
import { getDayStatus, getStreak, lastNDates, recordDayPlayed, type DayStatus } from "@/lib/game-storage";

const RULES_SEEN_KEY = "villodoku-rules-seen";

interface GridResponse {
  date: string;
  rows: CriterionInfo[];
  cols: CriterionInfo[];
  error?: string;
}

interface GridData {
  rows: CriterionInfo[];
  cols: CriterionInfo[];
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export default function VillodokuApp({
  today,
  initialRows,
  initialCols,
}: {
  today: string;
  initialRows: CriterionInfo[];
  initialCols: CriterionInfo[];
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [grid, setGrid] = useState<GridData | null>({ rows: initialRows, cols: initialCols });
  const [gridError, setGridError] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayStatus>>({});

  const refreshDayStatuses = useCallback(() => {
    const statuses: Record<string, DayStatus> = {};
    for (const date of lastNDates(today, 7)) {
      statuses[date] = getDayStatus(date);
    }
    setDayStatuses(statuses);
  }, [today]);

  // Premier montage : série en cours, statuts des derniers jours, popup de règles
  useEffect(() => {
    setStreak(getStreak().current);
    refreshDayStatuses();
    if (!localStorage.getItem(RULES_SEEN_KEY)) {
      setRulesOpen(true);
    }
  }, [refreshDayStatuses]);

  // Charge la grille de la date sélectionnée (today est déjà fournie par le serveur)
  useEffect(() => {
    if (selectedDate === today) {
      setGrid({ rows: initialRows, cols: initialCols });
      setGridError(false);
      return;
    }
    let cancelled = false;
    setGrid(null);
    setGridError(false);
    fetch(`/api/grid?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: GridResponse) => {
        if (cancelled) return;
        if (data.error) {
          setGridError(true);
          return;
        }
        setGrid({ rows: data.rows, cols: data.cols });
      })
      .catch(() => {
        if (!cancelled) setGridError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, today, initialRows, initialCols]);

  function handleCloseRules() {
    setRulesOpen(false);
    localStorage.setItem(RULES_SEEN_KEY, "1");
  }

  function handleGameEnd(date: string) {
    if (date === today) {
      setStreak(recordDayPlayed(date).current);
    }
    refreshDayStatuses();
  }

  return (
    <>
      <Header
        today={today}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        streak={streak}
        dayStatuses={dayStatuses}
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-center text-sm capitalize text-gray-400">Grille du {formatDate(selectedDate)}</h2>

        {gridError && <p className="text-red-600">Impossible de charger cette grille.</p>}
        {!gridError && !grid && <p className="text-gray-400">Chargement…</p>}
        {grid && (
          <VillodokuGrid
            key={selectedDate}
            date={selectedDate}
            rows={grid.rows}
            cols={grid.cols}
            onStateChange={refreshDayStatuses}
            onGameEnd={handleGameEnd}
          />
        )}
      </main>

      <Footer onShowRules={() => setRulesOpen(true)} />

      {rulesOpen && <RulesModal onClose={handleCloseRules} />}
    </>
  );
}
