"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RulesModal from "@/components/RulesModal";
import { formatLongDate } from "@/lib/date-format";
import { getDayStatus, getStreak, lastNDates, type DayStatus } from "@/lib/game-storage";

const RULES_SEEN_KEY = "villodoku-rules-seen";

const STATUS_LABELS: Record<DayStatus, string> = {
  empty: "À jouer",
  playing: "En cours",
  won: "Réussie",
  lost: "Terminée",
};

const STATUS_STYLES: Record<DayStatus, string> = {
  empty: "bg-gray-100 text-gray-500",
  playing: "bg-orange-50 text-orange-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-rose-50 text-rose-600",
};

export default function HistoriquePage() {
  const [streak, setStreak] = useState(0);
  const [days, setDays] = useState<{ date: string; status: DayStatus }[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    setStreak(getStreak().current);
    const today = new Date().toISOString().slice(0, 10);
    const previousDays = lastNDates(today, 7)
      .slice(0, -1)
      .reverse();
    setDays(previousDays.map((date) => ({ date, status: getDayStatus(date) })));
  }, []);

  function handleCloseRules(dontShowAgain: boolean) {
    setRulesOpen(false);
    if (dontShowAgain) {
      localStorage.setItem(RULES_SEEN_KEY, "1");
    } else {
      localStorage.removeItem(RULES_SEEN_KEY);
    }
  }

  return (
    <>
      <Header streak={streak} />

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <div className="w-full max-w-xl px-4">
          <Link href="/" className="text-sm text-indigo-700 hover:underline">
            ← Retour à la grille du jour
          </Link>
          <h2 className="mt-2 font-display text-xl font-bold text-gray-800">Grilles précédentes</h2>
        </div>

        <div className="w-full max-w-xl px-4">
          <hr className="border-gray-200" />
        </div>

        <div className="flex w-full max-w-xl flex-col gap-2 px-4">
          {days.map(({ date, status }) => (
            <Link
              key={date}
              href={`/?date=${date}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold capitalize text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              {formatLongDate(date)}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </Link>
          ))}
        </div>

        <div className="w-full max-w-xl px-4">
          <hr className="border-gray-200" />
        </div>
      </main>

      <Footer onShowRules={() => setRulesOpen(true)} />

      {rulesOpen && <RulesModal onClose={handleCloseRules} />}
    </>
  );
}
