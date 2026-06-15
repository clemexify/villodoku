"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import Hearts from "./Hearts";
import RulesModal from "./RulesModal";
import VillodokuGrid, { type CriterionInfo } from "./VillodokuGrid";
import { getStreak, recordDayPlayed } from "@/lib/game-storage";
import { formatLongDate } from "@/lib/date-format";

const RULES_SEEN_KEY = "villodoku-rules-seen";

export default function VillodokuApp({
  today,
  initialSelectedDate,
  initialRows,
  initialCols,
  initialSolutionsCounts,
  initialMaxRarityTiers,
}: {
  today: string;
  initialSelectedDate: string;
  initialRows: CriterionInfo[];
  initialCols: CriterionInfo[];
  initialSolutionsCounts: number[][];
  initialMaxRarityTiers: number[][];
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [errors, setErrors] = useState(0);

  // Premier montage : série en cours, popup de règles
  useEffect(() => {
    setStreak(getStreak().current);
    if (!localStorage.getItem(RULES_SEEN_KEY)) {
      setRulesOpen(true);
    }
  }, []);

  function handleCloseRules(dontShowAgain: boolean) {
    setRulesOpen(false);
    if (dontShowAgain) {
      localStorage.setItem(RULES_SEEN_KEY, "1");
    } else {
      localStorage.removeItem(RULES_SEEN_KEY);
    }
  }

  function handleGameEnd(date: string) {
    if (date === today) {
      setStreak(recordDayPlayed(date).current);
    }
  }

  return (
    <>
      <Header streak={streak} />

      <main className="flex flex-1 flex-col items-center gap-4 pb-4 pt-1">
        <div className="w-full max-w-xl px-4">
          <hr className="border-gray-200" />
        </div>

        <div className="flex w-full max-w-xl items-center justify-between px-4">
          <h2 className="text-left text-sm capitalize text-gray-400">
            Grille du {formatLongDate(initialSelectedDate)}
          </h2>
          <Hearts errors={errors} />
        </div>

        <VillodokuGrid
          key={initialSelectedDate}
          date={initialSelectedDate}
          rows={initialRows}
          cols={initialCols}
          solutionsCounts={initialSolutionsCounts}
          maxRarityTiers={initialMaxRarityTiers}
          onErrorsChange={setErrors}
          onGameEnd={handleGameEnd}
        />

        <Link
          href="/historique"
          className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          Grilles précédentes
        </Link>

        <div className="w-full max-w-xl px-4">
          <hr className="border-gray-200" />
        </div>
      </main>

      <Footer onShowRules={() => setRulesOpen(true)} />

      {rulesOpen && <RulesModal onClose={handleCloseRules} />}
    </>
  );
}
