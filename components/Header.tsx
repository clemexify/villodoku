"use client";

import { lastNDates, type DayStatus } from "@/lib/game-storage";

const STATUS_STYLES: Record<DayStatus, string> = {
  empty: "bg-white text-gray-500 border-gray-300",
  playing: "bg-amber-100 text-amber-800 border-amber-300",
  won: "bg-emerald-500 text-white border-emerald-500",
  lost: "bg-rose-100 text-rose-700 border-rose-300",
};

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

function dayNumber(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  return d.getUTCDate();
}

export default function Header({
  today,
  selectedDate,
  onSelectDate,
  streak,
  dayStatuses,
}: {
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  streak: number;
  dayStatuses: Record<string, DayStatus>;
}) {
  const dates = lastNDates(today, 7);

  return (
    <header className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between sm:justify-start sm:gap-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          <span className="text-emerald-600">Villo</span>
          <span className="text-gray-800">doku</span>
        </h1>

        <div
          title={`Série en cours : ${streak} jour${streak > 1 ? "s" : ""}`}
          className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 sm:hidden"
        >
          <span aria-hidden>🔥</span>
          {streak}
        </div>
      </div>

      <nav aria-label="Grilles des 7 derniers jours" className="flex justify-center gap-1.5 overflow-x-auto">
        {dates.map((date) => {
          const status = dayStatuses[date] ?? "empty";
          const selected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              title={date}
              className={`flex h-12 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg border text-xs font-medium transition ${STATUS_STYLES[status]} ${
                selected ? "ring-2 ring-emerald-500 ring-offset-1" : ""
              }`}
            >
              <span className="capitalize">{dayLabel(date)}</span>
              <span className="font-semibold">{dayNumber(date)}</span>
            </button>
          );
        })}
      </nav>

      <div
        title={`Série en cours : ${streak} jour${streak > 1 ? "s" : ""}`}
        className="hidden items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 sm:flex"
      >
        <span aria-hidden>🔥</span>
        {streak}
      </div>
    </header>
  );
}
